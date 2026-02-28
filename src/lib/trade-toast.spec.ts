import { describe, expect, it, vi, beforeEach } from 'vitest';
import Decimal from 'decimal.js';
import {
  executeTradeWithToast,
  showTradeSuccess,
  showTradeError,
  showPhishingWarning,
  showBetterPriceToast,
} from '@/lib/trade-toast';
import { PhishingDetectedError } from '@/service/trade-service';
import type { TradeExecuteParams } from '@/service/trade-service';
import { ETradeDirection } from '@/types/trade';

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToast.success(...args),
    error: (...args: unknown[]) => mockToast.error(...args),
    warning: (...args: unknown[]) => mockToast.warning(...args),
  },
}));

describe('trade-toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showTradeSuccess', () => {
    it('calls toast.success with buy title and short txid', () => {
      showTradeSuccess(ETradeDirection.BUY, 'abc123456789xyz');
      expect(mockToast.success).toHaveBeenCalledWith(
        'Buy successful',
        expect.objectContaining({
          description: expect.stringContaining('abc12345'),
        })
      );
    });

    it('calls toast.success with sell title', () => {
      showTradeSuccess(ETradeDirection.SELL, 'tx-1');
      expect(mockToast.success).toHaveBeenCalledWith(
        'Sell successful',
        expect.any(Object)
      );
    });
  });

  describe('executeTradeWithToast', () => {
    it('returns txid and shows success toast when execute resolves', async () => {
      const execute = vi.fn().mockResolvedValue('tx-ok');
      const params: TradeExecuteParams = {
        direction: ETradeDirection.BUY,
        value: 0.1,
        slippageBps: 100,
      };
      const result = await executeTradeWithToast(execute, params);
      expect(result).toBe('tx-ok');
      expect(execute).toHaveBeenCalledWith(params);
      expect(mockToast.success).toHaveBeenCalled();
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('shows error toast and returns void when execute throws', async () => {
      const execute = vi
        .fn()
        .mockRejectedValue(new Error('Insufficient balance'));
      const params: TradeExecuteParams = {
        direction: ETradeDirection.SELL,
        value: 50,
        tokenAtomicBalance: new Decimal('1000000'),
        slippageBps: 100,
      };
      const result = await executeTradeWithToast(execute, params);
      expect(result).toBeUndefined();
      expect(mockToast.error).toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('shows phishing warning when PhishingDetectedError thrown', async () => {
      const execute = vi
        .fn()
        .mockRejectedValue(
          new PhishingDetectedError('Unexpected fund outflow', 'detail')
        );
      const params: TradeExecuteParams = {
        direction: ETradeDirection.BUY,
        value: 1,
        slippageBps: 100,
      };
      await executeTradeWithToast(execute, params);
      expect(mockToast.error).toHaveBeenCalledWith(
        'Unexpected fund outflow detected; possible malicious contract.',
        expect.objectContaining({
          description: 'detail',
        })
      );
    });
  });

  describe('showTradeError', () => {
    it('calls toast.error with normalized title and description', () => {
      showTradeError(new Error('Insufficient SOL balance'));
      expect(mockToast.error).toHaveBeenCalledWith(
        'Insufficient balance',
        expect.objectContaining({
          description: expect.any(String),
        })
      );
    });

    it('accepts string message', () => {
      showTradeError('Something went wrong');
      expect(mockToast.error).toHaveBeenCalledWith(
        'Trade failed',
        expect.objectContaining({ description: 'Something went wrong' })
      );
    });
  });

  describe('showPhishingWarning', () => {
    it('calls toast.error with default description when no detail', () => {
      showPhishingWarning();
      expect(mockToast.error).toHaveBeenCalledWith(
        'Unexpected fund outflow detected; possible malicious contract.',
        expect.objectContaining({
          description: expect.stringContaining('Simulation'),
        })
      );
    });

    it('uses detail as description when provided', () => {
      showPhishingWarning('Custom detail');
      expect(mockToast.error).toHaveBeenCalledWith(
        'Unexpected fund outflow detected; possible malicious contract.',
        expect.objectContaining({ description: 'Custom detail' })
      );
    });
  });

  describe('showBetterPriceToast', () => {
    it('calls toast.warning with switch action', () => {
      const onSwitch = vi.fn();
      showBetterPriceToast(onSwitch);
      expect(mockToast.warning).toHaveBeenCalledWith(
        'Jupiter has better price',
        expect.objectContaining({
          description: 'Switch to Jupiter route for better execution?',
          action: expect.objectContaining({
            label: 'Switch',
            onClick: onSwitch,
          }),
        })
      );
    });
  });
});
