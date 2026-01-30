import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { CardProps } from './types';

export const Card: FC<CardProps> = ({ movie, direction }) => {
  const { t } = useTranslation();

  const getDirectionText = (direction?: string) => {
    switch (direction) {
      case 'right':
        return t('like');
      case 'left':
        return t('dislike');
      case 'down':
        return t('not_seen');
      default:
        return '';
    }
  };

  const getDirectionStyle = (direction?: string) => {
    switch (direction) {
      case 'right':
        return 'bg-green-500/80 text-white';
      case 'left':
        return 'bg-red-500/80 text-white';
      case 'down':
        return 'bg-yellow-500/80 text-white';
      default:
        return '';
    }
  };

  const directionText = getDirectionText(direction);
  const directionStyle = getDirectionStyle(direction);

  return (
    <div className="relative">
      {directionText && (
        <div
          className={`absolute -top-14 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-2xl font-bold ${directionStyle}`}
        >
          {directionText}
        </div>
      )}

      <div className="relative aspect-2/3 h-[65vh] cursor-grab touch-none overflow-hidden rounded-[2.5rem] bg-white select-none active:cursor-grabbing">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent pt-16" />

        <div className="absolute bottom-0 left-0 z-20 p-8 text-white">
          <span className="rounded bg-emerald-600/80 px-2 py-1 text-xs">
            {movie.genres.join(' / ')}
          </span>
          <h2 className="mt-2 text-3xl font-bold">
            {movie.title} {directionText}
          </h2>
        </div>
      </div>
    </div>
  );
};
