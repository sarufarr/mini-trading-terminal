import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useLatest } from '@/hooks/common/use-latest';
import type { Position } from '@/store/trade-panel.store';

interface UseDraggableOptions {
  onDragStart?: () => void;
  onDragEnd?: (position: Position) => void;
}

interface UseDraggableReturn {
  handlePointerDown: (e: React.PointerEvent) => void;
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
    pointerId: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const { clientX: startMouseX, clientY: startMouseY, pointerId } = e;
      const { x: startPosX, y: startPosY } = { ...positionRef.current };

      isDragging.current = true;
      dragStateRef.current = {
        startMouseX,
        startMouseY,
        startPosX,
        startPosY,
        pointerId,
      };
      onDragStartRef.current?.();

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      (e.target as HTMLElement).setPointerCapture(pointerId);
    },
    [onDragStartRef, positionRef]
  );

  useEffect(() => {
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDragging.current || !dragStateRef.current) return;
      if (moveEvent.pointerId !== dragStateRef.current.pointerId) return;
      moveEvent.preventDefault();
      const { startMouseX, startMouseY, startPosX, startPosY } =
        dragStateRef.current;

      const newPos: Position = {
        x: startPosX + (moveEvent.clientX - startMouseX),
        y: startPosY + (moveEvent.clientY - startMouseY),
      };
      onMoveRef.current(newPos);
    };

    const handlePointerUp = (endEvent: PointerEvent) => {
      if (!isDragging.current || !dragStateRef.current) return;
      if (endEvent.pointerId !== dragStateRef.current.pointerId) return;
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

    document.addEventListener('pointermove', handlePointerMove, {
      passive: false,
    });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      isDragging.current = false;
      dragStateRef.current = null;
    };
    // Effect must run only on mount/unmount; handlers close over refs, not reactive deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only; refs used inside
  }, []);

  return { handlePointerDown, isDragging };
};
