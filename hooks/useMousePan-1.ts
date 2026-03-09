
import React, { useState, useCallback } from 'react';

export const useMousePan = (scale: number) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setStartPos({
      x: clientX - position.x,
      y: clientY - position.y
    });
  }, [position]);

  const onMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    setPosition({
      x: clientX - startPos.x,
      y: clientY - startPos.y
    });
  }, [isDragging, startPos]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetPosition = () => setPosition({ x: 0, y: 0 });

  return {
    position,
    setPosition,
    isDragging,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    resetPosition
  };
};
