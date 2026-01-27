import { useEffect, useState } from 'react';

interface WindowState {
  width: number | undefined;
  height: number | undefined;
}
// this hook ensures that window size is only updated on the client and not on the server
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState<WindowState>({
    width: typeof window !== 'undefined' ? window.innerWidth : undefined,
    height: typeof window !== 'undefined' ? window.innerHeight : undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

export default useWindowSize;
