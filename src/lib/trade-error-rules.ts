/**
 * Trade error matching rules for getTradeErrorDisplay.
 * Extracted so rules can be tested or extended without touching get-error-message.ts.
 */
import { SLIPPAGE_ERROR_PATTERN } from '@/constants/trade';

export type MatchFn = (lower: string) => boolean;

export interface TradeErrorRule {
  match: MatchFn;
  title: string;
  description: string | ((raw: string) => string);
}

export const TRADE_ERROR_RULES: TradeErrorRule[] = [
  {
    match: (l) =>
      l.includes('insufficient sol') || l.includes('insufficient funds'),
    title: 'Insufficient balance',
    description:
      'Not enough SOL for this trade (including fees). Try a smaller amount or add SOL to your wallet.',
  },
  {
    match: (l) =>
      l.includes('insufficient token') || l.includes('no balance to sell'),
    title: 'Insufficient balance',
    description:
      'Not enough token balance for this trade. Refresh the balance or try a smaller amount.',
  },
  {
    match: (l) => SLIPPAGE_ERROR_PATTERN.test(l),
    title: 'Slippage exceeded',
    description:
      'Price moved past your tolerance. Try increasing slippage and submit again.',
  },
  {
    match: (l) =>
      l.includes('simulation') ||
      l.includes('transaction simulation failed') ||
      (l.includes('instruction') && l.includes('failed')),
    title: 'Simulation failed',
    description:
      'Transaction would fail on-chain. Check amount and slippage, or try again later.',
  },
  {
    match: (l) => l.includes('failed to fetch token balance'),
    title: 'Balance unavailable',
    description: 'Could not load token balance. Check network and try again.',
  },
  {
    match: (l) =>
      l.includes('network') ||
      l.includes('fetch') ||
      l.includes('econnrefused') ||
      l.includes('timeout') ||
      l.includes('failed to fetch'),
    title: 'Network error',
    description: 'Request failed. Check your connection and RPC, then retry.',
  },
  {
    match: (l) => l.includes('transaction failed on-chain'),
    title: 'Transaction failed',
    description:
      'The transaction was sent but reverted. Try again or increase slippage.',
  },
  {
    match: (l) => l.includes('jupiter') && l.includes('error'),
    title: 'Quote error',
    description: (raw) =>
      raw.length > 200 ? `${raw.slice(0, 200).trim()}…` : raw,
  },
  {
    match: (l) => l.includes('no jito tip account'),
    title: 'Jito unavailable',
    description:
      'Tip account list could not be loaded. Retry or use direct RPC.',
  },
  {
    match: (l) => l.includes('no swap provider') || l.includes('no raydium'),
    title: 'No route',
    description:
      'No liquidity pool or route found for this pair. Try another token.',
  },
  {
    match: (l) => l.includes('blockhash') || l.includes('block height'),
    title: 'Network error',
    description: 'RPC or blockhash issue. Please retry.',
  },
];

export const DEFAULT_DESCRIPTION_MAX = 300;
