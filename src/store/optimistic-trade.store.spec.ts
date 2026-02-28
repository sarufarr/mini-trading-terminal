import { describe, expect, it, beforeEach } from 'vitest';
import { useOptimisticTradeStore } from '@/store/optimistic-trade.store';

describe('optimistic-trade.store', () => {
  beforeEach(() => {
    useOptimisticTradeStore.getState().clearOptimistic();
  });

  it('starts with null optimistic', () => {
    expect(useOptimisticTradeStore.getState().optimistic).toBeNull();
  });

  it('setOptimistic stores state', () => {
    useOptimisticTradeStore.getState().setOptimistic({
      tokenAddress: 'addr',
      txid: 'tx-1',
      direction: 'buy',
      solDelta: -1.5,
      tokenDelta: 100,
    });
    const state = useOptimisticTradeStore.getState().optimistic;
    expect(state).not.toBeNull();
    expect(state?.tokenAddress).toBe('addr');
    expect(state?.txid).toBe('tx-1');
    expect(state?.direction).toBe('buy');
    expect(state?.solDelta).toBe(-1.5);
    expect(state?.tokenDelta).toBe(100);
  });

  it('clearOptimistic resets to null', () => {
    useOptimisticTradeStore.getState().setOptimistic({
      tokenAddress: 'a',
      txid: 't',
      direction: 'sell',
      solDelta: 0.5,
      tokenDelta: -10,
    });
    useOptimisticTradeStore.getState().clearOptimistic();
    expect(useOptimisticTradeStore.getState().optimistic).toBeNull();
  });
});
