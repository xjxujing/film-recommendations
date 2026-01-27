export type SupportedLang = 'zh' | 'en';

export type WeatherType =
  | 'sunny'
  | 'rainy'
  | 'cloudy'
  | 'snowy'
  | 'stormy'
  | 'foggy'
  | 'windy';

export interface Movie {
  id: number;
  title: string;
  genres: string[];
  posterUrl: string;
}

export interface MovieChoice {
  movieId: number;
  direction: 'left' | 'right' | 'up' | 'down';
  timestamp: number;
}
