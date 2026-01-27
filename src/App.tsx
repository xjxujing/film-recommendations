import { useCallback, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import moviesData from '../data/movies.json';
import AnimationWrapper from './components/AnimationWrapper';
import { Card } from './components/Card';
import { Movie } from './types';
import { MovieChoice } from './types';

function App() {
  const [direction, setDirection] = useState<string>('');
  const [movies, setMovies] = useState<Movie[]>(moviesData);
  const [choices, setChoices] = useState<MovieChoice[]>([]);
  const [mbtiResult, setMbtiResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [currentId, setCurrentId] = useState<number>();

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
  }, [movies.length, choices.length, isAnalyzing, choices, hasAnalyzed]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#e9e6e0]">
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

        <div className="z-20 w-full max-w-[90vw] text-center sm:max-w-2xl lg:max-w-4xl">
          {(isAnalyzing || mbtiResult) && (
            <div className="h-[70vh] overflow-hidden rounded-2xl border border-gray-100 bg-linear-to-br from-white to-gray-50 shadow-2xl sm:h-[500px] lg:h-[600px]">
              <div className="h-2 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500"></div>

              <div className="h-[calc(100%-0.5rem)] overflow-y-auto p-6 sm:p-8 lg:p-10">
                <div className="mb-8 text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 shadow-lg">
                    <svg
                      className="h-8 w-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>

                  <h2 className="mb-2 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                    {isAnalyzing ? '正在分析你的 MBTI' : '你的性格分析'}
                  </h2>

                  <p className="text-sm text-gray-500 sm:text-base">
                    {isAnalyzing
                      ? '基于你的电影偏好，AI 正在为你生成个性化报告...'
                      : '基于你的电影品味生成'}
                  </p>
                </div>

                <div className="relative">
                  <div className="prose prose-sm sm:prose lg:prose-lg prose-headings:text-gray-800 prose-p:text-gray-600 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-ol:text-gray-600 max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {mbtiResult}
                    </Markdown>
                  </div>

                  {isAnalyzing && (
                    <div className="mt-8 flex flex-col items-center gap-4">
                      <div className="flex gap-2">
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-blue-500"
                          style={{ animationDelay: '0ms' }}
                        ></div>
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-purple-500"
                          style={{ animationDelay: '150ms' }}
                        ></div>
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-pink-500"
                          style={{ animationDelay: '300ms' }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500">AI 正在思考中...</p>
                    </div>
                  )}
                </div>

                {/* 底部按钮 */}
                {!isAnalyzing && mbtiResult && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                    >
                      <span className="flex items-center justify-center gap-2">
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
                        重新测试
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
                分析遇到问题
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
                重新开始
              </button>
            </div>
          )}

          {/* 进度显示 - 也美化 */}
          {movies.length > 0 && (
            <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 sm:top-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 shadow-lg backdrop-blur-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                <p className="text-sm font-medium text-gray-700">
                  已选择 {choices.length} 部电影
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
