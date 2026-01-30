export interface MovieSelection {
  likedIds: number[];
  dislikedIds: number[];
  lang?: 'zh' | 'en';
}

export interface Movie {
  id: number;
  title: string;
  genres: string[];
}
