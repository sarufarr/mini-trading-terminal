/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoSlippageFromQuote } from '@/hooks/use-auto-slippage-from-quote';

describe('useAutoSlippageFromQuote', () => {
  it('calls setSlippageBps with clamped value when quote ready and amount valid', () => {
    const setSlippageBps = vi.fn();
    renderHook(() =>
      useAutoSlippageFromQuote({
        simulatedSlippageBps: 150,
        loading: false,
        hasValidAmount: true,
        slippageBps: 100,
        setSlippageBps,
      })
    );
    expect(setSlippageBps).toHaveBeenCalledWith(150);
  });

  it('does not call setSlippageBps when loading', () => {
    const setSlippageBps = vi.fn();
    renderHook(() =>
      useAutoSlippageFromQuote({
        simulatedSlippageBps: 150,
        loading: true,
        hasValidAmount: true,
        slippageBps: 100,
        setSlippageBps,
      })
    );
    expect(setSlippageBps).not.toHaveBeenCalled();
  });

  it('does not call setSlippageBps when hasValidAmount is false', () => {
    const setSlippageBps = vi.fn();
    renderHook(() =>
      useAutoSlippageFromQuote({
        simulatedSlippageBps: 150,
        loading: false,
        hasValidAmount: false,
        slippageBps: 100,
        setSlippageBps,
      })
    );
    expect(setSlippageBps).not.toHaveBeenCalled();
  });

  it('does not call setSlippageBps when simulatedSlippageBps is null', () => {
    const setSlippageBps = vi.fn();
    renderHook(() =>
      useAutoSlippageFromQuote({
        simulatedSlippageBps: null,
        loading: false,
        hasValidAmount: true,
        slippageBps: 100,
        setSlippageBps,
      })
    );
    expect(setSlippageBps).not.toHaveBeenCalled();
  });

  it('does not call setSlippageBps when clamped value equals current slippageBps', () => {
    const setSlippageBps = vi.fn();
    renderHook(() =>
      useAutoSlippageFromQuote({
        simulatedSlippageBps: 100,
        loading: false,
        hasValidAmount: true,
        slippageBps: 100,
        setSlippageBps,
      })
    );
    expect(setSlippageBps).not.toHaveBeenCalled();
  });

  it('clamps simulated value to SLIPPAGE_MIN_BPS and SLIPPAGE_MAX_BPS', () => {
    const setSlippageBps = vi.fn();
    renderHook(() =>
      useAutoSlippageFromQuote({
        simulatedSlippageBps: 5,
        loading: false,
        hasValidAmount: true,
        slippageBps: 100,
        setSlippageBps,
      })
    );
    expect(setSlippageBps).toHaveBeenCalledWith(10);

    setSlippageBps.mockClear();
    renderHook(() =>
      useAutoSlippageFromQuote({
        simulatedSlippageBps: 10000,
        loading: false,
        hasValidAmount: true,
        slippageBps: 100,
        setSlippageBps,
      })
    );
    expect(setSlippageBps).toHaveBeenCalledWith(5000);
  });
});
