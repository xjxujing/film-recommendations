import { useEffect, useState } from 'react';

export const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: { clientX: number; clientY: number }) => {
      // 使用 requestAnimationFrame 可以让动画更平滑
      window.requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-9999 transition-transform duration-100 ease-out"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <div className="h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]" />

      <div className="absolute top-0 left-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 scale-100 rounded-full border border-orange-500/30" />
    </div>
  );
};
