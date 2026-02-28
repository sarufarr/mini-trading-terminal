import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { ETradeDirection } from '@/types/trade';
import {
  calculateTradeAtomicAmount,
  getTradeConfig,
  validateBalanceForTrade,
  parseSimulationError,
} from '@/service/trade-service';
import type { Env } from '@/env';
import { FEE_RESERVE_LAMPORTS } from '@/constants/trade';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const mockEnv = (overrides: Partial<Env> = {}): Env =>
  ({
    VITE_DRY_RUN: false,
    VITE_DRY_RUN_RESULT: 'success',
    VITE_JITO_BLOCK_ENGINE_URL: undefined,
    VITE_JITO_TIP_LAMPORTS: undefined,
    ...overrides,
  }) as Env;

describe('trade-service', () => {
  describe('getTradeConfig', () => {
    it('returns dry run and jito config from env', () => {
      const env = mockEnv({
        VITE_DRY_RUN: true,
        VITE_DRY_RUN_RESULT: 'fail',
        VITE_JITO_BLOCK_ENGINE_URL: 'https://jito.example.com',
        VITE_JITO_TIP_LAMPORTS: '5000',
      });
      const config = getTradeConfig(env);
      expect(config.isDryRun).toBe(true);
      expect(config.dryRunResult).toBe('fail');
      expect(config.useJito).toBe(true);
      expect(config.jitoTipLamports).toBe(5000);
    });

    it('defaults dry run to false and result to success', () => {
      const env = mockEnv({});
      const config = getTradeConfig(env);
      expect(config.isDryRun).toBe(false);
      expect(config.dryRunResult).toBe('success');
    });

    it('uses default jito tip when not set or invalid', () => {
      const envNoTip = mockEnv({
        VITE_JITO_BLOCK_ENGINE_URL: 'https://jito.example.com',
        VITE_JITO_TIP_LAMPORTS: undefined,
      });
      expect(getTradeConfig(envNoTip).jitoTipLamports).toBe(10_000);

      const envEmpty = mockEnv({
        VITE_JITO_BLOCK_ENGINE_URL: 'https://jito.example.com',
        VITE_JITO_TIP_LAMPORTS: '',
      });
      expect(getTradeConfig(envEmpty).jitoTipLamports).toBe(10_000);

      const envInvalid = mockEnv({
        VITE_JITO_BLOCK_ENGINE_URL: 'https://jito.example.com',
        VITE_JITO_TIP_LAMPORTS: 'abc',
      });
      expect(getTradeConfig(envInvalid).jitoTipLamports).toBe(10_000);
    });
  });

  describe('validateBalanceForTrade', () => {
    const baseBuyInput = {
      direction: ETradeDirection.BUY as const,
      atomicAmount: new Decimal(1 * LAMPORTS_PER_SOL),
      tokenBalance: null as Decimal | null,
      tokenAddress: 'token',
      valueDisplay: 1,
      jitoTipLamports: 0,
      useJito: false,
    };

    it('does not throw when BUY has sufficient SOL', () => {
      validateBalanceForTrade({
        ...baseBuyInput,
        solBalance: new Decimal(2 * LAMPORTS_PER_SOL),
      });
    });

    it('throws when BUY has insufficient SOL', () => {
      expect(() =>
        validateBalanceForTrade({
          ...baseBuyInput,
          solBalance: new Decimal(0.5 * LAMPORTS_PER_SOL),
        })
      ).toThrow('Insufficient SOL balance');
    });

    it('throws when BUY solBalance is null', () => {
      expect(() =>
        validateBalanceForTrade({
          ...baseBuyInput,
          solBalance: null,
        })
      ).toThrow('Insufficient SOL balance');
    });

    it('includes fee reserve and jito in required amount for BUY', () => {
      const required = baseBuyInput.atomicAmount
        .plus(FEE_RESERVE_LAMPORTS)
        .plus(5000);
      expect(() =>
        validateBalanceForTrade({
          ...baseBuyInput,
          solBalance: baseBuyInput.atomicAmount,
          jitoTipLamports: 5000,
          useJito: true,
        })
      ).toThrow('Insufficient SOL balance');
      expect(() =>
        validateBalanceForTrade({
          ...baseBuyInput,
          solBalance: new Decimal(required),
          jitoTipLamports: 5000,
          useJito: true,
        })
      ).not.toThrow();
    });

    it('does not throw when SELL has sufficient token balance', () => {
      validateBalanceForTrade({
        direction: ETradeDirection.SELL,
        atomicAmount: new Decimal(100),
        solBalance: null,
        tokenBalance: new Decimal(200),
        tokenAddress: 'token',
        valueDisplay: 50,
        jitoTipLamports: 0,
        useJito: false,
      });
    });

    it('throws when SELL token balance is null', () => {
      expect(() =>
        validateBalanceForTrade({
          direction: ETradeDirection.SELL,
          atomicAmount: new Decimal(100),
          solBalance: null,
          tokenBalance: null,
          tokenAddress: 'token',
          valueDisplay: 50,
          jitoTipLamports: 0,
          useJito: false,
        })
      ).toThrow('Failed to fetch token balance');
    });

    it('throws when SELL has insufficient token balance', () => {
      expect(() =>
        validateBalanceForTrade({
          direction: ETradeDirection.SELL,
          atomicAmount: new Decimal(100),
          solBalance: null,
          tokenBalance: new Decimal(50),
          tokenAddress: 'token',
          valueDisplay: 50,
          jitoTipLamports: 0,
          useJito: false,
        })
      ).toThrow('Insufficient token balance');
    });
  });

  describe('parseSimulationError', () => {
    it('returns string err as reason', () => {
      const sim = {
        err: 'Some error',
        logs: [],
      };
      const parsed = parseSimulationError(sim as never);
      expect(parsed.reason).toBe('Some error');
      expect(parsed.isSlippageError).toBe(false);
    });

    it('detects Jupiter slippage InstructionError 6001', () => {
      const sim = {
        err: ['InstructionError', 0, { Custom: 6001 }],
        logs: [],
      };
      const parsed = parseSimulationError(sim as never);
      expect(parsed.isSlippageError).toBe(true);
    });

    it('detects Raydium CLMM slippage InstructionError 6010', () => {
      const sim = {
        err: ['InstructionError', 6, { Custom: 6010 }],
        logs: [
          'Program log: before_source_balance: 100000, expect_amount_out: 7838, slippage: 15',
        ],
      };
      const parsed = parseSimulationError(sim as never);
      expect(parsed.isSlippageError).toBe(true);
      expect(parsed.detailedMessage).toContain('slippage');
    });

    it('detects slippage from log message', () => {
      const sim = {
        err: 'Failed',
        logs: ['SlippageToleranceExceeded'],
      };
      const parsed = parseSimulationError(sim as never);
      expect(parsed.isSlippageError).toBe(true);
      expect(parsed.detailedMessage).toContain('SlippageToleranceExceeded');
    });

    it('builds detailedMessage from InstructionError', () => {
      const sim = {
        err: ['InstructionError', 2, { Custom: 123 }],
        logs: ['Program log: error'],
      };
      const parsed = parseSimulationError(sim as never);
      expect(parsed.reason).toContain('Instruction 2');
      expect(parsed.detailedMessage).toContain('Program log: error');
      expect(parsed.isSlippageError).toBe(false);
    });
  });

  describe('calculateTradeAtomicAmount', () => {
    it('calculates BUY atomic amount in lamports', () => {
      const amount = calculateTradeAtomicAmount({
        direction: ETradeDirection.BUY,
        value: 1,
      });

      expect(amount.toNumber()).toBe(1 * 1_000_000_000);
    });

    it('calculates BUY atomic amount for fractional SOL', () => {
      const amount = calculateTradeAtomicAmount({
        direction: ETradeDirection.BUY,
        value: 0.5,
      });

      expect(amount.toNumber()).toBe(0.5 * 1_000_000_000);
    });

    it('calculates BUY atomic amount for zero', () => {
      const amount = calculateTradeAtomicAmount({
        direction: ETradeDirection.BUY,
        value: 0,
      });

      expect(amount.toNumber()).toBe(0);
    });

    it('calculates SELL atomic amount as percentage of balance', () => {
      const tokenAtomicBalance = new Decimal(1_000_000_000);
      const amount = calculateTradeAtomicAmount({
        direction: ETradeDirection.SELL,
        value: 25,
        tokenAtomicBalance,
      });

      expect(amount.toNumber()).toBe(250_000_000);
    });

    it('calculates SELL 100% of balance', () => {
      const tokenAtomicBalance = new Decimal(1_000_000_000);
      const amount = calculateTradeAtomicAmount({
        direction: ETradeDirection.SELL,
        value: 100,
        tokenAtomicBalance,
      });

      expect(amount.toNumber()).toBe(1_000_000_000);
    });

    it('calculates SELL 50% of balance', () => {
      const tokenAtomicBalance = new Decimal(2_000_000_000);
      const amount = calculateTradeAtomicAmount({
        direction: ETradeDirection.SELL,
        value: 50,
        tokenAtomicBalance,
      });

      expect(amount.toNumber()).toBe(1_000_000_000);
    });

    it('calculates SELL 0% of balance', () => {
      const tokenAtomicBalance = new Decimal(1_000_000_000);
      const amount = calculateTradeAtomicAmount({
        direction: ETradeDirection.SELL,
        value: 0,
        tokenAtomicBalance,
      });

      expect(amount.toNumber()).toBe(0);
    });
  });
});
