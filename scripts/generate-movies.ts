// scripts/generate-movies.ts
import 'dotenv/config';

import fs from 'fs';

import { Movie } from '../api/server';
import { TMDBMovie } from './types';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// TMDB 类型 ID 映射表（中文）
const GENRE_MAP: Record<number, string> = {
  28: '动作',
  12: '冒险',
  16: '动画',
  35: '喜剧',
  80: '犯罪',
  99: '纪录',
  18: '剧情',
  10751: '家庭',
  14: '奇幻',
  36: '历史',
  27: '恐怖',
  10402: '音乐',
  9648: '悬疑',
  10749: '爱情',
  878: '科幻',
  10770: '电视电影',
  53: '惊悚',
  10752: '战争',
  37: '西部',
};

function getGenreName(genreId: number): string {
  return GENRE_MAP[genreId] || '其他';
}

async function generateMoviesData() {
  try {
    // 获取热门电影
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=zh-CN&page=1`
    );

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();

    const movies: Movie[] = data.results
      .slice(0, 50)
      .map((movie: TMDBMovie) => ({
        id: movie.id,
        title: movie.title,
        genres: movie.genre_ids
          .slice(0, 2)
          .map((id: number) => getGenreName(id)),
        posterUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        tmdbId: movie.id,
      }));

    // 确保目录存在
    if (!fs.existsSync('src/data')) {
      fs.mkdirSync('src/data', { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(
      'data/movies.json',
      JSON.stringify(movies, null, 2),
      'utf-8'
    );

    console.log('✅ 成功生成', movies.length, '个电影数据');
    console.log('📁 文件位置: src/data/movies.json');
  } catch (error) {
    console.error('❌ 生成失败:', error);
  }
}

generateMoviesData();
