import { ReactNode } from 'react';
export interface Gesture {
  x: number;
  y: number;
}

export interface GestureState {
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  timeStamp: number;
}

export interface AnimationWrapperProps {
  flickOnSwipe?: boolean;
  children?: ReactNode;
  onSwipe?: (dir: string) => void;
  onCardLeftScreen?: (dir: string) => void;
  className?: string;
  preventSwipe?: string[];
  swipeRequirementType?: 'velocity' | 'distance';
  swipeThreshold?: number;
  onSwipeRequirementFulfilled?: (dir: string) => void;
  onSwipeRequirementUnfulfilled?: () => void;
}
