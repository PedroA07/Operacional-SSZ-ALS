
import { useState, useEffect, useCallback, RefObject } from 'react';

interface UseMouseZoomProps {
  containerRef: RefObject<HTMLDivElement | null>;
  minScale?: number;
  maxScale?: number;
  step?: number;
}

export const useMouseZoom = ({
  containerRef,
  minScale = 0.5,
  maxScale = 5,
  step = 0.1
}: UseMouseZoomProps) => {
  const [scale, setScale] = useState(1);

  const handleWheel = useCallback((e: WheelEvent) => {
    // Evita scroll da página ao dar zoom na imagem
    e.preventDefault();

    setScale((prevScale) => {
      const delta = e.deltaY > 0 ? -step : step;
      const newScale = prevScale + delta;
      return Math.min(Math.max(newScale, minScale), maxScale);
    });
  }, [step, minScale, maxScale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, handleWheel]);

  const resetZoom = () => setScale(1);
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, maxScale));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, minScale));

  return { scale, setScale, resetZoom, zoomIn, zoomOut };
};
