import { describe, expect, it } from 'vitest';
import type { Position, Size } from '@/store/trade-panel.store';
import { PANEL_BOUNDS_MARGIN } from '@/store/trade-panel.store';

const clampPosition = (
  position: Position,
  size: Size,
  viewport: { width: number; height: number },
  margin: number = PANEL_BOUNDS_MARGIN
): Position => {
  const { width, height } = viewport;
  const maxX = width - size.width - margin;
  const maxY = height - size.height - margin;

  return {
    x: Math.min(Math.max(margin, position.x), maxX),
    y: Math.min(Math.max(margin, position.y), maxY),
  };
};

describe('use-panel-bounds clampPosition', () => {
  const viewport = { width: 1000, height: 800 };
  const size: Size = { width: 320, height: 480 };

  it('keeps position when already within bounds', () => {
    const pos: Position = { x: 100, y: 150 };
    const clamped = clampPosition(pos, size, viewport);
    expect(clamped).toEqual(pos);
  });

  it('clamps position to minimum margin', () => {
    const pos: Position = { x: -50, y: -10 };
    const clamped = clampPosition(pos, size, viewport);
    expect(clamped.x).toBe(PANEL_BOUNDS_MARGIN);
    expect(clamped.y).toBe(PANEL_BOUNDS_MARGIN);
  });

  it('clamps position to maximum allowed values', () => {
    const pos: Position = { x: 2000, y: 2000 };
    const clamped = clampPosition(pos, size, viewport);

    const maxX = viewport.width - size.width - PANEL_BOUNDS_MARGIN;
    const maxY = viewport.height - size.height - PANEL_BOUNDS_MARGIN;

    expect(clamped.x).toBe(maxX);
    expect(clamped.y).toBe(maxY);
  });

  it('clamps only x when y is within bounds', () => {
    const pos: Position = { x: -100, y: 200 };
    const clamped = clampPosition(pos, size, viewport);
    expect(clamped.x).toBe(PANEL_BOUNDS_MARGIN);
    expect(clamped.y).toBe(200);
  });

  it('clamps only y when x is within bounds', () => {
    const pos: Position = { x: 100, y: 9999 };
    const clamped = clampPosition(pos, size, viewport);
    const maxY = viewport.height - size.height - PANEL_BOUNDS_MARGIN;
    expect(clamped.x).toBe(100);
    expect(clamped.y).toBe(maxY);
  });

  it('uses custom margin when provided', () => {
    const pos: Position = { x: -100, y: -100 };
    const customMargin = 50;
    const clamped = clampPosition(pos, size, viewport, customMargin);
    expect(clamped.x).toBe(customMargin);
    expect(clamped.y).toBe(customMargin);
  });

  it('handles position at exact boundary', () => {
    const maxX = viewport.width - size.width - PANEL_BOUNDS_MARGIN;
    const maxY = viewport.height - size.height - PANEL_BOUNDS_MARGIN;
    const pos: Position = { x: maxX, y: maxY };
    const clamped = clampPosition(pos, size, viewport);
    expect(clamped).toEqual(pos);
  });
});
