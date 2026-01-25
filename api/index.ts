import 'dotenv/config';

import { fileURLToPath } from 'node:url';

import axios from 'axios';
import express, { Request, Response } from 'express';

const app = express();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// --- Interfaces ---

// Structure of movie data from TMDB Popular API
interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  belongs_to_collection: { id: number; name: string } | null;
  release_date: string;
}

// Structure of a part inside a Collection
interface CollectionPart {
  id: number;
  release_date: string;
}

// Final data structure sent to the frontend
interface Recommendation {
  id: number;
  title: string;
  poster: string;
  rating: string;
  isSeries: boolean;
  aiSuggestion: string;
}

// Configuration for multi-language support
interface TextConfig {
  tmdbLang: string;
  aiPrefix: string;
  // Function to generate series recommendation text
  series: (name: string, order: number) => string;
  seriesFallback: string;
  standalone: string;
}

// --- Language Configuration ---

const SERVER_TEXT: Record<string, TextConfig> = {
  zh: {
    tmdbLang: 'zh-CN',
    aiPrefix: 'AI 分析：',
    series: (name, order) =>
      `这是《${name}》系列的第 ${order} 部作品。建议按上映年份顺序观看以获得最佳体验。`,
    seriesFallback: '这是一部精彩的系列电影作品。',
    standalone: '这是一部独立电影，剧情完整，可直接观看。',
  },
  en: {
    tmdbLang: 'en-US',
    aiPrefix: 'AI Analysis: ',
    series: (name, order) =>
      `This is part ${order} of the "${name}" collection. Watch in release order for the best experience.`,
    seriesFallback: 'This is part of an exciting movie collection.',
    standalone: 'This is a standalone movie with a complete story.',
  },
};

// --- API Route ---

app.get('/api/recommend', async (req: Request, res: Response) => {
  try {
    // 1. Determine Language (Default to 'zh')
    // Get 'lang' from query string, e.g., /api/recommend?lang=en
    const langParam = req.query.lang as string;
    const userLang = langParam === 'en' ? 'en' : 'zh';
    const textConfig = SERVER_TEXT[userLang];

    // 2. Fetch Popular Movies
    // Use a random page (1-10) to keep results fresh
    const randomPage = Math.floor(Math.random() * 10) + 1;

    const popularRes = await axios.get(`${BASE_URL}/movie/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        language: textConfig.tmdbLang,
        page: randomPage,
      },
    });

    // Take the top 6 movies
    const rawMovies: TmdbMovie[] = popularRes.data.results.slice(0, 6);

    // 3. Process Movies & Generate AI Suggestions
    // Use Promise.all to fetch collection details in parallel
    const processedMovies: Recommendation[] = await Promise.all(
      rawMovies.map(async movie => {
        const recommendation: Recommendation = {
          id: movie.id,
          title: movie.title,
          poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
          rating: movie.vote_average.toFixed(1),
          isSeries: false,
          aiSuggestion: '',
        };

        // Check if the movie belongs to a collection (Series)
        if (movie.belongs_to_collection) {
          try {
            // Fetch collection details to find viewing order
            const collectionRes = await axios.get(
              `${BASE_URL}/collection/${movie.belongs_to_collection.id}`,
              {
                params: {
                  api_key: TMDB_API_KEY,
                  language: textConfig.tmdbLang,
                },
              }
            );

            const parts: CollectionPart[] = collectionRes.data.parts || [];

            // Sort parts by release date to determine the correct order
            const sortedParts = parts
              .filter(p => p.release_date) // Filter out unreleased movies
              .sort(
                (a, b) =>
                  new Date(a.release_date).getTime() -
                  new Date(b.release_date).getTime()
              );

            recommendation.isSeries = true;

            // Find the index of the current movie in the sorted list
            const currentIndex = sortedParts.findIndex(p => p.id === movie.id);
            const order = currentIndex + 1;

            // Generate specific AI suggestion text
            recommendation.aiSuggestion =
              textConfig.aiPrefix +
              textConfig.series(collectionRes.data.name, order);
          } catch (err) {
            // Fallback if collection details fail to load
            recommendation.aiSuggestion =
              textConfig.aiPrefix + textConfig.seriesFallback;
          }
        } else {
          // Standalone movie logic
          recommendation.aiSuggestion =
            textConfig.aiPrefix + textConfig.standalone;
        }

        return recommendation;
      })
    );

    // Return the final JSON
    res.json(processedMovies);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch data from TMDB' });
  }
});

// --- Local Development Server ---
// This allows you to run the backend locally using `npx tsx api/index.ts`
// Vercel ignores this block when deploying as a Serverless Function.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = 3001;
  app.listen(PORT, () =>
    console.log(`Backend (TS) running on http://localhost:${PORT}`)
  );
}

export default app;
