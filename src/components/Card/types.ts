export interface CardProps {
  movie: Movie;
  direction?: string;
}
export interface Movie {
  id: number;
  title: string;
  genres: string[];
  posterUrl: string;
}
