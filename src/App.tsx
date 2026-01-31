import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import moviesEn from '../data/movies_en.json';
import moviesZh from '../data/movies_zh.json';
import AnimationWrapper from './components/AnimationWrapper';
import { Card } from './components/Card';
import { Movie } from './types';
import { MovieChoice } from './types';

function App() {
  const { t, i18n } = useTranslation();
  const [direction, setDirection] = useState<string>('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [choices, setChoices] = useState<MovieChoice[]>([]);
  const [mbtiResult, setMbtiResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [currentId, setCurrentId] = useState<number>();

  useEffect(() => {
    const isZh = i18n.language.startsWith('zh');
    const fullPool = isZh ? moviesZh : moviesEn;
    setMovies(() => {
      if (choices.length === 0) return fullPool as Movie[];

      const choiceIds = new Set(choices.map(c => c.movieId));
      return (fullPool as Movie[]).filter(m => !choiceIds.has(m.id));
    });
  }, [i18n.language, choices]);

  const outOfFrame = useCallback(
    (direction: string) => {
      const currentMovie = movies[movies.length - 1];
      if (!currentMovie) return;

      const newChoice: MovieChoice = {
        movieId: currentMovie.id,
        direction: direction as 'left' | 'right' | 'up' | 'down',
        timestamp: Date.now(),
      };

      setChoices(prev => [...prev, newChoice]);
      setMovies(prev => prev.filter(movie => movie.id !== currentMovie.id));
    },
    [movies]
  );

  useEffect(() => {
    if (choices.length > 3 && !isAnalyzing && !hasAnalyzed) {
      const analyzeMBTI = async () => {
        setIsAnalyzing(true);
        setError(null);
        setMbtiResult('');

        try {
          const likedIds = choices
            .filter(c => c.direction === 'right')
            .map(c => Number(c.movieId))
            .filter(id => !isNaN(id));

          const dislikedIds = choices
            .filter(c => c.direction === 'left')
            .map(c => Number(c.movieId))
            .filter(id => !isNaN(id));

          console.log('📤 发送数据:', { likedIds, dislikedIds });

          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              likedIds,
              dislikedIds,
              lang: i18n.language.startsWith('zh') ? 'zh' : 'en',
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          // ✅ 读取流式响应
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('无法读取响应流');
          }

          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('✅ 流式传输完成');
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // handle SSE
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }

                  if (parsed.content) {
                    // add content from stream
                    setMbtiResult(prev => prev + parsed.content);
                  }
                } catch (e) {
                  console.error('解析错误:', e);
                }
              }
            }
          }

          setHasAnalyzed(true);
        } catch (error) {
          console.error('❌ 分析失败:', error);
          setError(error instanceof Error ? error.message : '分析失败');
        } finally {
          setIsAnalyzing(false);
        }
      };

      analyzeMBTI();
    }
  }, [
    movies.length,
    choices.length,
    isAnalyzing,
    choices,
    hasAnalyzed,
    i18n.language,
  ]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#e9e6e0]">
      <div className="absolute top-4 right-4 z-50 flex gap-2 sm:top-8 sm:right-8">
        <button
          onClick={() => i18n.changeLanguage('zh')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
            i18n.language.startsWith('zh')
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }`}
        >
          中
        </button>
        <button
          onClick={() => i18n.changeLanguage('en')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
            i18n.language.startsWith('en')
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }`}
        >
          EN
        </button>
      </div>

      <div className="relative flex h-full w-full flex-col items-center justify-center p-8 lg:p-20">
        {movies.length > 0 &&
          movies.map(movie => (
            <AnimationWrapper
              key={movie.id}
              className="absolute"
              onSwipe={() => {}}
              onCardLeftScreen={outOfFrame}
              onSwipeRequirementFulfilled={dir => {
                setDirection(dir);
                setCurrentId(movie.id);
              }}
            >
              <Card
                movie={movie}
                direction={currentId == movie.id ? direction : ''}
              />
            </AnimationWrapper>
          ))}

        <div className="z-20 w-full max-w-[90vw] sm:max-w-2xl lg:max-w-4xl">
          {(isAnalyzing || mbtiResult) && (
            <div className="h-[75vh] overflow-hidden rounded-[2.5rem] border border-[#e8dcc4] bg-[#fdf6e9] shadow-2xl sm:h-[600px] lg:h-[700px]">
              <div className="h-[calc(100%-0.5rem)] overflow-y-auto p-8 sm:p-12 lg:p-16">
                <div className="mb-10 text-center">
                  <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#a08475] shadow-inner">
                    <svg
                      className="h-10 w-10 text-[#fdf6e9]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>

                  <h2 className="mb-4 text-4xl font-bold tracking-tight text-[#5c4033] sm:text-5xl">
                    {isAnalyzing
                      ? t('analyzing_mbti')
                      : t('your_mbti_analysis')}
                  </h2>

                  <p className="text-sm font-medium tracking-widest text-[#a08475] uppercase sm:text-base">
                    {isAnalyzing
                      ? t('analyzing_description')
                      : t('generated_description')}
                  </p>
                </div>

                <div className="relative">
                  <div className="prose prose-sm prose-p:text-center prose-headings:text-center prose-ul:list-none prose-ul:p-0 prose-li:p-0 sm:prose-base lg:prose-lg prose-headings:text-[#c5a37e] prose-p:text-[#7d6b5d] prose-strong:text-[#5c4033] prose-li:text-[#7d6b5d] max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {mbtiResult}
                    </Markdown>
                  </div>

                  {isAnalyzing && (
                    <div className="mt-12 flex flex-col items-center gap-6">
                      <div className="flex gap-3">
                        <div
                          className="h-3 w-3 animate-bounce rounded-full bg-[#c5a37e]"
                          style={{ animationDelay: '0ms' }}
                        ></div>
                        <div
                          className="h-3 w-3 animate-bounce rounded-full bg-[#a08475]"
                          style={{ animationDelay: '150ms' }}
                        ></div>
                        <div
                          className="h-3 w-3 animate-bounce rounded-full bg-[#7d6b5d]"
                          style={{ animationDelay: '300ms' }}
                        ></div>
                      </div>
                      <p className="text-sm font-medium tracking-wide text-[#a08475]">
                        {t('ai_thinking')}
                      </p>
                    </div>
                  )}
                </div>

                {/* 底部按钮 */}
                {!isAnalyzing && mbtiResult && (
                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="group relative flex w-3/4 items-center justify-center overflow-hidden rounded-full bg-[#f1e4d1] px-8 py-4 transition-all duration-300 hover:bg-[#e8dcc4] hover:shadow-lg active:scale-95"
                    >
                      <span className="relative flex items-center gap-3 text-lg font-bold text-[#5c4033]">
                        <svg
                          className="h-6 w-6 transition-transform group-hover:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        {t('retake_test')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 错误提示 - 也美化一下 */}
          {error && (
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-pink-50 p-6 text-center shadow-xl sm:p-8">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h3 className="mb-2 text-xl font-bold text-red-900">
                {t('analysis_error')}
              </h3>
              <p className="mb-6 text-red-600">{error}</p>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t('restart')}
              </button>
            </div>
          )}

          {/* 进度显示 - 也美化 */}
          {movies.length > 0 && (
            <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 sm:top-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 shadow-lg backdrop-blur-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                <p className="text-sm font-medium text-gray-700">
                  {t('movies_selected', { count: choices.length })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
