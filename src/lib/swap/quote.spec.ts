import { describe, expect, it } from 'vitest';
import { getSwapQuote } from '@/lib/swap/quote';
import { ETradeDirection } from '@/types/trade';

describe('getSwapQuote', () => {
  it('returns zero quote when amountInAtomic is "0"', async () => {
    const result = await getSwapQuote({
      tokenAddress: 'So11111111111111111111111111111111111111112',
      networkId: 1,
      direction: ETradeDirection.BUY,
      amountInAtomic: '0',
    });
    expect(result).toEqual({
      outAmountAtomic: '0',
      priceImpactPct: null,
      simulatedSlippageBps: null,
      providerName: 'Raydium CLMM',
    });
  });

  it('returns zero quote when amountInAtomic is negative', async () => {
    const result = await getSwapQuote({
      tokenAddress: 'So11111111111111111111111111111111111111112',
      networkId: 1,
      direction: ETradeDirection.SELL,
      amountInAtomic: '-1',
    });
    expect(result).toEqual({
      outAmountAtomic: '0',
      priceImpactPct: null,
      simulatedSlippageBps: null,
      providerName: 'Raydium CLMM',
    });
  });
});
