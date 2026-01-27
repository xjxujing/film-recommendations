import 'dotenv/config';

import cors from 'cors';
import express, { Request, Response } from 'express';
import OpenAI from 'openai';

import moviesData from '../data/movies.json';

export interface MovieSelection {
  likedIds: number[];
  dislikedIds: number[];
}

export interface Movie {
  id: number;
  title: string;
  genres: string[];
}

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

const MOVIE_POOL: Movie[] = [...moviesData];

app.post(
  '/api/analyze',
  async (req: Request<object, object, MovieSelection>, res: Response) => {
    try {
      const { likedIds, dislikedIds } = req.body;

      if (!likedIds || !dislikedIds) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      const likedNames = MOVIE_POOL.filter(m => likedIds.includes(m.id)).map(
        m => m.title
      );

      const dislikedNames = MOVIE_POOL.filter(m =>
        dislikedIds.includes(m.id)
      ).map(m => m.title);

      if (likedNames.length === 0 && dislikedNames.length === 0) {
        return res.status(400).json({ error: '请至少选择几部电影' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const prompt = `你是一位精通 MBTI 的心理学家。
用户喜欢的电影：[${likedNames.join(', ')}]
用户不喜欢的电影：[${dislikedNames.join(', ')}]
请根据这些审美偏好推断其 MBTI 类型，并提供深度解析报告。
(请使用 Markdown 格式，包含：人格类型、核心性格画像、审美偏好拆解、补片建议)
注意：请只使用纯文本和 Markdown 格式，不要生成任何图表、Mermaid 代码、流程图或其他非文本内容。
只允许使用以下格式：
- 标题（#，##，###）
- 加粗（**文本**）
- 普通段落
要求：
1. 总字数不超过 150 字
2. 每个要点不超过 20 字
3. 去掉所有修饰语
4. 只给结论，不说原因`;

      // ✅ 使用流式 API
      const stream = await openai.chat.completions.create({
        model: 'tngtech/deepseek-r1t2-chimera:free',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true, // ⭐ 开启流式
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      console.error('❌ 分析流程失败:', error);

      if (!res.headersSent) {
        res.status(500).json({ error: '服务器分析失败，请稍后再试' });
      } else {
        res.write(`data: ${JSON.stringify({ error: '分析中断' })}\n\n`);
        res.end();
      }
    }
  }
);

app.listen(3001, () => console.log('🚀 Server is running on port 3001'));
