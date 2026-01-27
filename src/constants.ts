import { SupportedLang } from './types';

export const UI_TEXT: Record<SupportedLang, unknown> = {
  zh: {
    title: '灵感模式',
    error: '获取推荐失败，请重试',
    recommend: '换一换',
    loading: '加载中...',
  },
  en: {
    title: 'Inspiration Mode',
    error: 'Failed to get recommendations, please try again',
    recommend: 'Refresh',
    loading: 'Loading...',
  },
};
