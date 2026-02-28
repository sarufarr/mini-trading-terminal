import { useCallback, useEffect, useRef } from 'react';
import { useLatest } from '@/hooks/common/use-latest';
import type { Size } from '@/store/trade-panel.store';

interface ResizeBounds {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface UseResizableReturn {
  handleResizeMouseDown: (e: React.MouseEvent) => void;
}

const DEFAULT_RESIZE_BOUNDS: Required<ResizeBounds> = {
  minWidth: 280,
  minHeight: 400,
  maxWidth: 520,
  maxHeight: 680,
};

type TUseResizable = (
  currentSize: Size,
  onResize: (size: Size) => void,
  bounds?: ResizeBounds
) => UseResizableReturn;
export const useResizable: TUseResizable = (
  currentSize,
  onResize,
  bounds = DEFAULT_RESIZE_BOUNDS
) => {
  const sizeRef = useLatest(currentSize);
  const onResizeRef = useLatest(onResize);
  const resolvedBounds = { ...DEFAULT_RESIZE_BOUNDS, ...bounds };
  const isResizingRef = useRef(false);
  const resizeStateRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const { clientX: startMouseX, clientY: startMouseY } = e;
      const { width: startWidth, height: startHeight } = { ...sizeRef.current };

      isResizingRef.current = true;
      resizeStateRef.current = {
        startMouseX,
        startMouseY,
        startWidth,
        startHeight,
      };

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';
    },
    [sizeRef]
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current || !resizeStateRef.current) return;

      const { clientX, clientY } = event;
      const { startMouseX, startMouseY, startWidth, startHeight } =
        resizeStateRef.current;
      const { minWidth, minHeight, maxWidth, maxHeight } = resolvedBounds;

      const nextSize: Size = {
        width: Math.min(
          maxWidth,
          Math.max(minWidth, startWidth + (clientX - startMouseX))
        ),
        height: Math.min(
          maxHeight,
          Math.max(minHeight, startHeight + (clientY - startMouseY))
        ),
      };

      onResizeRef.current(nextSize);
    };

    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      resizeStateRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      isResizingRef.current = false;
      resizeStateRef.current = null;
    };
    // Effect must run only on mount/unmount; handlers close over refs, not reactive deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only; refs used inside
  }, []);

  return { handleResizeMouseDown };
};
