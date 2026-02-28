import { useCallback } from 'react';
import { getViewportSize } from '@/lib/dom';
import {
  PANEL_BOUNDS_MARGIN,
  type Position,
  type Size,
} from '@/store/trade-panel.store';

type TUsePanelBounds = (margin?: number) => {
  clampPosition: (position: Position, size: Size) => Position;
};

export const usePanelBounds: TUsePanelBounds = (
  margin = PANEL_BOUNDS_MARGIN
) => {
  const clampPosition = useCallback(
    (position: Position, size: Size): Position => {
      const { width, height } = getViewportSize();

      const maxX = width - size.width - margin;
      const maxY = height - size.height - margin;

      const pos = {
        x: Math.min(Math.max(margin, position.x), maxX),
        y: Math.min(Math.max(margin, position.y), maxY),
      };

      return pos;
    },
    [margin]
  );
  return { clampPosition };
};
