import { useState } from 'react';

// --- 类型定义 ---

// 电影数据接口 (对应后端返回的数据结构)
interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: string;
  isSeries: boolean;
  aiSuggestion: string;
}

// 语言包接口
interface LangConfig {
  btnDefault: string;
  btnLoading: string;
  seriesTag: string;
  langSwitch: string;
  error: string;
  footer: string;
}

// 支持的语言类型
type SupportedLang = 'zh' | 'en';

// --- 静态数据 ---

const UI_TEXT: Record<SupportedLang, LangConfig> = {
  zh: {
    btnDefault: '获取推荐',
    btnLoading: 'AI 分析中...',
    seriesTag: '系列电影',
    langSwitch: 'Switch to English',
    error: '获取失败，请重试',
    footer: '本产品使用 TMDB API，但未获得 TMDB 认证。',
  },
  en: {
    btnDefault: 'Get Recommendations',
    btnLoading: 'Analyzing...',
    seriesTag: 'Collection',
    langSwitch: '切换到中文',
    error: 'Failed to fetch, please try again',
    footer:
      'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  },
};

function App() {
  // --- 状态管理 (带泛型) ---
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [lang, setLang] = useState<SupportedLang>('zh');

  const text = UI_TEXT[lang];

  // --- 逻辑处理 ---

  const toggleLang = () => {
    const newLang: SupportedLang = lang === 'zh' ? 'en' : 'zh';
    setLang(newLang);
    // 切换语言后，如果已有结果，自动刷新列表
    if (searched) {
      handleRecommend(newLang);
    }
  };

  const handleRecommend = async (targetLang: SupportedLang = lang) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/recommend?lang=${targetLang}`);
      if (!res.ok) {
        throw new Error('API request failed');
      }
      const data: Movie[] = await res.json();
      setMovies(data);
    } catch (e) {
      console.error(e);
      alert(text.error);
    } finally {
      setLoading(false);
    }
  };

  // --- 视图渲染 ---

  return (
    <div className="relative min-h-screen bg-gray-50 pb-10 font-sans text-gray-900">
      {/* 1. Language Switcher */}
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition-colors hover:border-blue-600 hover:text-blue-600"
      >
        {text.langSwitch}
      </button>

      {/* Main Content */}
      <main className="mx-auto flex max-w-4xl flex-col items-center px-6 py-12">
        {/* 2. Main Action Button */}
        <div
          className={`flex w-full justify-center transition-all duration-500 ease-in-out ${searched ? 'mt-0 mb-12' : 'mt-[30vh]'}`}
        >
          <button
            onClick={() => handleRecommend(lang)}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                {/* SVG Spinner */}
                <svg
                  className="h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {text.btnLoading}
              </span>
            ) : (
              text.btnDefault
            )}
          </button>
        </div>

        {/* 3. Movie Grid */}
        {movies.length > 0 && (
          <div className="animate-fade-in-up grid w-full grid-cols-1 gap-6 md:grid-cols-2">
            {movies.map(m => (
              <div
                key={m.id}
                className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                {/* Card Top: Image & Info */}
                <div className="mb-5 flex gap-5">
                  <img
                    src={m.poster}
                    alt={m.title}
                    className="h-36 w-24 shrink-0 rounded-lg bg-gray-200 object-cover shadow-md"
                  />
                  <div className="flex flex-col justify-center">
                    <h3 className="mb-1 text-xl leading-tight font-bold text-gray-900">
                      {m.title}
                    </h3>
                    <div className="text-lg font-bold text-blue-600">
                      {m.rating}{' '}
                      <span className="text-sm font-normal text-gray-400">
                        / 10
                      </span>
                    </div>
                    {m.isSeries && (
                      <span className="mt-3 inline-block w-fit rounded bg-gray-900 px-2 py-1 text-[10px] font-bold tracking-wider text-white">
                        {text.seriesTag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: AI Suggestion */}
                <div className="mt-auto border-t border-gray-100 pt-4">
                  <p className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
                    {m.aiSuggestion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="mt-10 w-full border-t border-gray-200 py-8 text-center">
        <div className="flex flex-col items-center gap-2 opacity-60 transition-opacity hover:opacity-100">
          <img
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
            alt="TMDB Logo"
            className="w-24"
          />
          <p className="text-[10px] text-gray-500">{text.footer}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
