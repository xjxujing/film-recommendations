import { animated, SpringRef, to, useSpring } from '@react-spring/web';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';

import { useWindowSize } from '../../helpers/useWindowSize';
import { physics, settings } from './constants';
import { AnimationWrapperProps, Gesture, GestureState } from './types';

const pythagoras = (x: number, y: number): number => {
  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
};

const normalize = (vector: {
  x: number;
  y: number;
}): { x: number; y: number } => {
  const length = Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
  return { x: vector.x / length, y: vector.y / length };
};

const animateOut = async (
  gesture: Gesture,
  setSpringTarget: SpringRef<{ x: number; y: number; rot: number }>,
  windowHeight: number | undefined,
  windowWidth: number | undefined,
  speed?: number
): Promise<void> => {
  // Use window dimensions directly as fallback to avoid 0/undefined issues on first render
  const h =
    windowHeight || (typeof window !== 'undefined' ? window.innerHeight : 1000);
  const w =
    windowWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000);

  const diagonal = pythagoras(h, w);
  const velocity = Math.max(speed ?? pythagoras(gesture.x, gesture.y), 0.1);

  // Normalize the unit vector for direction
  const direction = normalize(gesture);

  // Ensure card flies far enough out (at least 1.5x diagonal)
  const finalX = diagonal * direction.x * 1.5;
  const finalY = diagonal * direction.y * 1.5;

  // Rotation based on horizontal direction
  const finalRotation =
    direction.x === 0 ? (Math.random() - 0.5) * 45 : direction.x * 45;

  // Snappy duration (250ms - 500ms)
  const duration = Math.min(Math.max(diagonal / (velocity * 4), 250), 500);

  // Explicitly stop any running touch physics before starting exit animation
  setSpringTarget.stop();

  return new Promise(resolve => {
    setSpringTarget.start({
      x: finalX,
      y: finalY,
      rot: finalRotation,
      immediate: false,
      // Clear any physical velocity to ensure smooth duration-based flight
      config: { duration, easing: t => t },
      onRest: () => resolve(),
    });
  });
};

const animateBack = (
  setSpringTarget: SpringRef<{ x: number; y: number; rot: number }>
): Promise<void> => {
  // translate back to the initial position
  return new Promise(resolve => {
    setSpringTarget.start({
      x: 0,
      y: 0,
      rot: 0,
      config: physics.animateBack,
      onRest: () => resolve(),
    });
  });
};

// The following callbacks are examples of how a parent component might define and pass
// `onSwipe` and `onCardLeftScreen` props to `AnimationWrapper`.
// They are not part of this file's scope and are shown for context.
//
// const swiped = useCallback((direction: string) => {
//   setLastDirection(direction); // setLastDirection would be defined in the parent
// }, []);
//
// const outOfFrame = useCallback((id: string) => {
//   setMovies(prev => prev.filter(movie => movie.id !== id)); // setMovies would be defined in the parent
// }, []);

const AnimatedDiv = animated.div;

const AnimationWrapper = forwardRef<
  { swipe: (dir?: string) => Promise<void>; restoreCard: () => Promise<void> },
  AnimationWrapperProps
>(
  (
    {
      flickOnSwipe = true,
      children,
      onSwipe,
      onCardLeftScreen,
      className,
      preventSwipe = [],
      swipeRequirementType = 'velocity',
      onSwipeRequirementFulfilled,
      onSwipeRequirementUnfulfilled,
    },
    ref
  ) => {
    const { width, height } = useWindowSize();
    const [{ x, y, rot }, setSpringTarget] = useSpring(() => ({
      x: 0,
      y: 0,
      rot: 0,
      config: physics.touchResponsive,
    }));

    const getSwipeDirection = useCallback(
      (
        property: { x: number; y: number },
        type: 'velocity' | 'distance'
      ): string => {
        const threshold =
          type === 'velocity'
            ? settings.swipeThresholdVelocity
            : settings.swipeThresholdDistance;

        if (Math.abs(property.x) > Math.abs(property.y)) {
          if (property.x > threshold) {
            return 'right';
          } else if (property.x < -threshold) {
            return 'left';
          }
        } else {
          if (property.y > threshold) {
            return 'down';
          } else if (property.y < -threshold) {
            return 'up';
          }
        }
        return 'none';
      },
      []
    );

    useImperativeHandle(ref, () => ({
      async swipe(dir = 'right') {
        if (onSwipe) onSwipe(dir);
        const power = 1.3;
        const disturbance = (Math.random() - 0.5) / 2;
        if (dir === 'right') {
          await animateOut(
            { x: power, y: disturbance },
            setSpringTarget,
            width,
            height
          );
        } else if (dir === 'left') {
          await animateOut(
            { x: -power, y: disturbance },
            setSpringTarget,
            width,
            height
          );
        } else if (dir === 'up') {
          await animateOut(
            { x: disturbance, y: -power },
            setSpringTarget,
            width,
            height
          );
        } else if (dir === 'down') {
          await animateOut(
            { x: disturbance, y: power },
            setSpringTarget,
            width,
            height
          );
        }
        if (onCardLeftScreen) onCardLeftScreen(dir);
      },
      async restoreCard() {
        await animateBack(setSpringTarget);
      },
    }));

    const handleSwipeReleased = useCallback(
      async (
        setSpringTarget: SpringRef<{ x: number; y: number; rot: number }>,
        gesture: GestureState
      ) => {
        // Check if this is a swipe based on velocity OR distance
        let dir = getSwipeDirection(
          { x: gesture.vx, y: gesture.vy },
          'velocity'
        );

        if (dir === 'none') {
          dir = getSwipeDirection({ x: gesture.dx, y: gesture.dy }, 'distance');
        }

        if (dir !== 'none' && flickOnSwipe && !preventSwipe.includes(dir)) {
          // Calculate exit physics
          const exitDirection = { x: 0, y: 0 };
          if (dir === 'left') exitDirection.x = -1;
          else if (dir === 'right') exitDirection.x = 1;
          else if (dir === 'up') exitDirection.y = -1;
          else if (dir === 'down') exitDirection.y = 1;

          const speed = pythagoras(gesture.vx, gesture.vy);

          await animateOut(
            exitDirection,
            setSpringTarget,
            width,
            height,
            speed
          );

          if (onSwipe) onSwipe(dir);
          if (onCardLeftScreen) onCardLeftScreen(dir);
          return;
        }

        // Card was not flicked away, animate back to start
        animateBack(setSpringTarget);
      },
      [
        flickOnSwipe,
        preventSwipe,
        onSwipe,
        onCardLeftScreen,
        width,
        height,
        getSwipeDirection,
      ]
    );

    const swipeThresholdFulfilledDirection = useRef<string>('none');
    const dragStatus = useRef({
      isClicking: false,
      startPosition: { x: 0, y: 0 },
      lastPosition: { dx: 0, dy: 0, vx: 0, vy: 0, timeStamp: 0 },
    });

    // Initialize timestamp on mount to keep it pure
    useLayoutEffect(() => {
      dragStatus.current.lastPosition.timeStamp = Date.now();
    }, []);

    const gestureStateFromWebEvent = useCallback(
      (ev: MouseEvent | TouchEvent, isTouch: boolean): GestureState => {
        const { startPosition, lastPosition } = dragStatus.current;

        let dx = isTouch
          ? (ev as TouchEvent).touches[0].clientX - startPosition.x
          : (ev as MouseEvent).clientX - startPosition.x;
        let dy = isTouch
          ? (ev as TouchEvent).touches[0].clientY - startPosition.y
          : (ev as MouseEvent).clientY - startPosition.y;

        // We cant calculate velocity from the first event
        if (startPosition.x === 0 && startPosition.y === 0) {
          dx = 0;
          dy = 0;
        }

        const now = Date.now();
        const dt = Math.max(now - lastPosition.timeStamp, 1);

        const vx = (dx - lastPosition.dx) / dt;
        const vy = (dy - lastPosition.dy) / dt;

        const gestureState = { dx, dy, vx, vy, timeStamp: now };
        return gestureState;
      },
      []
    );

    const element = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      const currentElement = element.current;
      if (!currentElement) return;

      const onTouchStart = (ev: TouchEvent) => {
        if (
          !(ev.srcElement as HTMLElement)?.className.includes('pressable') &&
          ev.cancelable
        ) {
          ev.preventDefault();
        }

        dragStatus.current.isClicking = true;
        dragStatus.current.startPosition = {
          x: ev.touches[0].clientX,
          y: ev.touches[0].clientY,
        };
        dragStatus.current.lastPosition = {
          dx: 0,
          dy: 0,
          vx: 0,
          vy: 0,
          timeStamp: Date.now(),
        };
      };

      currentElement.addEventListener('touchstart', onTouchStart);

      const onMouseDown = (ev: MouseEvent) => {
        dragStatus.current.isClicking = true;
        dragStatus.current.startPosition = { x: ev.clientX, y: ev.clientY };
        dragStatus.current.lastPosition = {
          dx: 0,
          dy: 0,
          vx: 0,
          vy: 0,
          timeStamp: Date.now(),
        };
      };

      currentElement.addEventListener('mousedown', onMouseDown);

      const handleMove = (gestureState: GestureState) => {
        // Check fulfillment
        if (onSwipeRequirementFulfilled || onSwipeRequirementUnfulfilled) {
          let dir = getSwipeDirection(
            { x: gestureState.vx, y: gestureState.vy },
            'velocity'
          );
          if (dir === 'none') {
            dir = getSwipeDirection(
              { x: gestureState.dx, y: gestureState.dy },
              'distance'
            );
          }
          if (dir !== swipeThresholdFulfilledDirection.current) {
            swipeThresholdFulfilledDirection.current = dir;
            if (swipeThresholdFulfilledDirection.current === 'none') {
              if (onSwipeRequirementUnfulfilled)
                onSwipeRequirementUnfulfilled();
            } else {
              if (onSwipeRequirementFulfilled) onSwipeRequirementFulfilled(dir);
            }
          }
        }

        // use guestureState.vx / guestureState.vy for velocity calculations
        // translate element
        let rot: number = gestureState.vx * 15; // Magic number 15 looks about right
        if (isNaN(rot)) rot = 0;
        rot = Math.max(Math.min(rot, settings.maxTilt), -settings.maxTilt);
        setSpringTarget.start({
          x: gestureState.dx,
          y: gestureState.dy,
          rot: rot,
          config: physics.touchResponsive,
        });
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragStatus.current.isClicking) return;
        const gestureState = gestureStateFromWebEvent(ev, false);
        dragStatus.current.lastPosition = gestureState;
        handleMove(gestureState);
      };

      window.addEventListener('mousemove', onMouseMove);

      const onMouseUp = () => {
        if (!dragStatus.current.isClicking) return;
        dragStatus.current.isClicking = false;
        handleSwipeReleased(setSpringTarget, dragStatus.current.lastPosition);
      };

      window.addEventListener('mouseup', onMouseUp);

      const onTouchMove = (ev: TouchEvent) => {
        const gestureState = gestureStateFromWebEvent(ev, true);
        dragStatus.current.lastPosition = gestureState;
        handleMove(gestureState);
      };

      currentElement.addEventListener('touchmove', onTouchMove);

      const onTouchEnd = () => {
        if (!dragStatus.current.isClicking) return; // Prevent multiple triggers
        dragStatus.current.isClicking = false;
        handleSwipeReleased(setSpringTarget, dragStatus.current.lastPosition);
      };

      currentElement.addEventListener('touchend', onTouchEnd);

      return () => {
        currentElement.removeEventListener('touchstart', onTouchStart);
        currentElement.removeEventListener('touchmove', onTouchMove);
        currentElement.removeEventListener('touchend', onTouchEnd);
        currentElement.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }, [
      handleSwipeReleased,
      setSpringTarget,
      onSwipeRequirementFulfilled,
      onSwipeRequirementUnfulfilled,
      gestureStateFromWebEvent,
      getSwipeDirection,
      swipeRequirementType,
    ]);

    return (
      <AnimatedDiv
        ref={element}
        className={className}
        style={{
          transform: to(
            [x, y, rot],
            (px: number, py: number, pr: number) =>
              `translate3d(${px}px, ${py}px, ${0}px) rotate(${pr}deg)`
          ),
        }}
      >
        {children}
      </AnimatedDiv>
    );
  }
);

export default AnimationWrapper;
