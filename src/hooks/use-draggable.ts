import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useLatest } from '@/hooks/common/use-latest';
import type { Position } from '@/store/trade-panel.store';

interface UseDraggableOptions {
  onDragStart?: () => void;
  onDragEnd?: (position: Position) => void;
}

interface UseDraggableReturn {
  handleMouseDown: (e: React.MouseEvent) => void;
  isDragging: RefObject<boolean>;
}

type TUseDraggable = (
  position: Position,
  onMove: (position: Position) => void,
  options?: UseDraggableOptions
) => UseDraggableReturn;
export const useDraggable: TUseDraggable = (position, onMove, options = {}) => {
  const positionRef = useLatest(position);
  const onMoveRef = useLatest(onMove);
  const onDragStartRef = useLatest(options.onDragStart);
  const onDragEndRef = useLatest(options.onDragEnd);
  const isDragging = useRef(false);
  const dragStateRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const { clientX: startMouseX, clientY: startMouseY } = e;
      const { x: startPosX, y: startPosY } = { ...positionRef.current };

      isDragging.current = true;
      dragStateRef.current = {
        startMouseX,
        startMouseY,
        startPosX,
        startPosY,
      };
      onDragStartRef.current?.();

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    },
    [onDragStartRef, positionRef]
  );

  useEffect(() => {
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current || !dragStateRef.current) return;
      const { startMouseX, startMouseY, startPosX, startPosY } =
        dragStateRef.current;

      const newPos: Position = {
        x: startPosX + (moveEvent.clientX - startMouseX),
        y: startPosY + (moveEvent.clientY - startMouseY),
      };
      onMoveRef.current(newPos);
    };

    const handleMouseUp = (endEvent: MouseEvent) => {
      if (!isDragging.current || !dragStateRef.current) return;
      const { startMouseX, startMouseY, startPosX, startPosY } =
        dragStateRef.current;

      isDragging.current = false;
      dragStateRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      const finalPos: Position = {
        x: startPosX + (endEvent.clientX - startMouseX),
        y: startPosY + (endEvent.clientY - startMouseY),
      };
      onDragEndRef.current?.(finalPos);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      isDragging.current = false;
      dragStateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { handleMouseDown, isDragging };
};
