import 'dotenv/config';

import cors from 'cors';
import express, { Request, Response } from 'express';
import { readFileSync } from 'fs';
import OpenAI from 'openai';
import { join } from 'path';

import { Movie, MovieSelection } from './types';

const moviesZh: Movie[] = JSON.parse(
  readFileSync(join(process.cwd(), 'data/movies_zh.json'), 'utf8')
);
const moviesEn: Movie[] = JSON.parse(
  readFileSync(join(process.cwd(), 'data/movies_en.json'), 'utf8')
);

console.log('✅ API Serverless Function Load Successfully');

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

// MOVIE_POOL is replaced by localized pools

app.get('/api/liveness', (_req, res) => {
  res.json({ liveness: true });
});

app.post(
  '/api/analyze',
  async (req: Request<object, object, MovieSelection>, res: Response) => {
    try {
      const { likedIds, dislikedIds, lang = 'zh' } = req.body;

      if (!likedIds || !dislikedIds) {
        return res.status(400).json({
          error: lang === 'zh' ? '缺少必要参数' : 'Missing required parameters',
        });
      }

      const moviePool = lang === 'en' ? moviesEn : moviesZh;

      const likedNames = moviePool
        .filter(m => likedIds.includes(m.id))
        .map(m => m.title);

      const dislikedNames = moviePool
        .filter(m => dislikedIds.includes(m.id))
        .map(m => m.title);

      if (likedNames.length === 0 && dislikedNames.length === 0) {
        return res.status(400).json({
          error:
            lang === 'zh'
              ? '请至少选择几部电影'
              : 'Please select at least a few movies',
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const systemPrompt =
        lang === 'zh'
          ? '你是一位精通 MBTI 的心理学家。请使用中文回答。'
          : 'You are a psychologist expert in MBTI. Please respond in English.';

      const userPrompt =
        lang === 'zh'
          ? `用户喜欢的电影：[${likedNames.join(', ')}]
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
4. 只给结论，不说原因`
          : `User's liked movies: [${likedNames.join(', ')}]
User's disliked movies: [${dislikedNames.join(', ')}]
Please infer their MBTI type based on these aesthetic preferences and provide a deep analysis report.
(Please use Markdown format, including: Personality Type, Core Personality Profile, Aesthetic Preference Breakdown, Movie Recommendations)
Note: Please use only plain text and Markdown. Do not generate charts, Mermaid code, flowcharts, or other non-text content.
Allowed formats:
- Headings (#, ##, ###)
- Bold (**text**)
- Normal paragraphs
Requirements:
1. Total word count under 150 words
2. Each point under 20 words
3. Remove all modifiers
4. Provide only conclusions, no reasons`;

      // ✅ 使用流式 API
      const stream = await openai.chat.completions.create({
        model: 'tngtech/deepseek-r1t2-chimera:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
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

export default app;
