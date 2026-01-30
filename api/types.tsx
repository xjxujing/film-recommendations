export interface MovieSelection {
  likedIds: number[];
  dislikedIds: number[];
}

export interface Movie {
  id: number;
  title: string;
  genres: string[];
}
