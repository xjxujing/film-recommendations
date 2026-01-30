// scripts/generate-movies.ts
import 'dotenv/config';

import fs from 'fs';

import { Movie } from '../src/types';
import { TMDBMovie } from './types';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

const GENRE_MAP_ZH: Record<number, string> = {
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

const GENRE_MAP_EN: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

function getGenreNames(genreIds: number[], lang: 'zh' | 'en'): string[] {
  const map = lang === 'zh' ? GENRE_MAP_ZH : GENRE_MAP_EN;
  return genreIds
    .slice(0, 2)
    .map(id => map[id] || (lang === 'zh' ? '其他' : 'Other'));
}

async function fetchMovies(lang: string) {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=${lang}&page=1`
  );

  if (!response.ok) {
    throw new Error(`API 请求失败 (${lang}): ${response.status}`);
  }

  return await response.json();
}

async function generateMoviesData() {
  try {
    console.log('⏳ 正在获取电影数据...');
    const dataZh = await fetchMovies('zh-CN');
    const dataEn = await fetchMovies('en-US');

    const moviesZh: Movie[] = dataZh.results
      .slice(0, 50)
      .map((movie: TMDBMovie) => ({
        id: movie.id,
        title: movie.title,
        genres: getGenreNames(movie.genre_ids, 'zh'),
        posterUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      }));

    // For English, we want to match the IDs from the Chinese list to ensure consistency
    const zhIds = new Set(moviesZh.map(m => m.id));
    const moviesEn: Movie[] = dataEn.results
      .filter((movie: TMDBMovie) => zhIds.has(movie.id))
      .map((movie: TMDBMovie) => ({
        id: movie.id,
        title: movie.title,
        genres: getGenreNames(movie.genre_ids, 'en'),
        posterUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      }));

    // ensure order is the same
    const moviesEnOrdered = moviesZh
      .map(mZh => moviesEn.find(mEn => mEn.id === mZh.id))
      .filter(Boolean) as Movie[];

    if (!fs.existsSync('data')) {
      fs.mkdirSync('data', { recursive: true });
    }

    fs.writeFileSync(
      'data/movies_zh.json',
      JSON.stringify(moviesZh, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      'data/movies_en.json',
      JSON.stringify(moviesEnOrdered, null, 2),
      'utf-8'
    );

    // Keep data/movies.json as a fallback (pointing to zh)
    fs.writeFileSync(
      'data/movies.json',
      JSON.stringify(moviesZh, null, 2),
      'utf-8'
    );

    console.log('✅ 成功生成电影数据');
    console.log('📁 文件位置: data/movies_zh.json, data/movies_en.json');
  } catch (error) {
    console.error('❌ 生成失败:', error);
  }
}

generateMoviesData();
