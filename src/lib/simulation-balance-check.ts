/**
 * Simulate before send and parse SOL/Token balance changes for anti-phishing.
 * Blocks and warns if simulation shows unexpected SOL outflow or token receipt.
 */
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import type { SimulatedTransactionResponse } from '@solana/web3.js';
import { ETradeDirection } from '@/types/trade';

/** SPL Token account data: amount offset (u64 little-endian) */
const TOKEN_ACCOUNT_AMOUNT_OFFSET = 64;

export interface PreBalanceState {
  solLamports: number;
  tokenAmount: bigint;
  tokenATA: PublicKey;
}

export interface PostBalanceState {
  solLamports: number;
  tokenAmount: bigint;
}

/**
 * Parse token amount from simulated account data (base64 string array).
 * SPL Token layout: amount at offset 64, 8 bytes u64 little-endian.
 */
export function parseTokenAmountFromAccountData(
  data: string[] | undefined
): bigint {
  if (!data || data.length === 0) return 0n;
  try {
    const raw = atob(data.join(''));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    if (bytes.length < TOKEN_ACCOUNT_AMOUNT_OFFSET + 8) return 0n;
    const view = new DataView(bytes.buffer);
    return view.getBigUint64(TOKEN_ACCOUNT_AMOUNT_OFFSET, true);
  } catch {
    return 0n;
  }
}

/**
 * Get pre-simulation balance (SOL + ATA for mint) and return ATA address for simulate request.
 */
export async function getPreBalanceState(
  connection: Connection,
  payerPubkey: PublicKey,
  tokenMint: PublicKey
): Promise<PreBalanceState> {
  const solLamports = await connection.getBalance(payerPubkey);
  const tokenATA = getAssociatedTokenAddressSync(tokenMint, payerPubkey, false);
  let tokenAmount = 0n;
  try {
    const info = await connection.getAccountInfo(tokenATA);
    if (info?.data && info.data.length >= TOKEN_ACCOUNT_AMOUNT_OFFSET + 8) {
      const view = new DataView(info.data.buffer);
      tokenAmount = view.getBigUint64(TOKEN_ACCOUNT_AMOUNT_OFFSET, true);
    }
  } catch {
    // ATA may not exist
  }
  return { solLamports, tokenAmount, tokenATA };
}

/**
 * Parse SOL and token balances from simulation response (order must match getPreBalanceState: payer, tokenATA).
 */
export function getPostBalanceFromSimulation(
  simulation: SimulatedTransactionResponse,
  _accountAddresses: [string, string]
): PostBalanceState | null {
  const accounts = simulation.accounts;
  if (!accounts || accounts.length < 2) return null;
  const [solAccount, tokenAccount] = accounts;
  const postSol =
    solAccount && typeof solAccount.lamports === 'number'
      ? solAccount.lamports
      : 0;
  const postToken = parseTokenAmountFromAccountData(
    tokenAccount?.data ?? undefined
  );
  return { solLamports: postSol, tokenAmount: postToken };
}

export interface PhishingCheckParams {
  direction: ETradeDirection;
  /** Input amount (BUY=SOL lamports, SELL=token atoms) */
  amountIn: bigint;
  /** Expected min out (optional, for stricter check) */
  minOutExpected?: bigint;
  slippageBps: number;
  pre: PreBalanceState;
  post: PostBalanceState;
  /** Allowed extra SOL outflow (lamports); above = anomaly */
  feeToleranceLamports: number;
  /** Extra slippage bps beyond user setting, e.g. 500 = 5% */
  extraSlippageBps: number;
}

export interface PhishingCheckResult {
  safe: boolean;
  reason?: string;
}

/**
 * Anti-phishing rules:
 * - BUY: SOL decrease <= amountIn + feeTolerance; token must not decrease; if minOutExpected, token increase >= minOut*(1 - slippage - extra).
 * - SELL: SOL decrease <= feeTolerance; token decrease <= amountIn + small tolerance; if minOutExpected, SOL increase >= minOut*(1 - extra).
 */
export function checkSimulationPhishing(
  params: PhishingCheckParams
): PhishingCheckResult {
  const {
    direction,
    amountIn,
    minOutExpected,
    slippageBps,
    pre,
    post,
    feeToleranceLamports,
    extraSlippageBps,
  } = params;

  const solDelta = post.solLamports - pre.solLamports;
  const tokenDelta = post.tokenAmount - pre.tokenAmount;

  if (direction === ETradeDirection.BUY) {
    if (solDelta < -Number(amountIn) - feeToleranceLamports) {
      return {
        safe: false,
        reason:
          'SOL outflow exceeds trade amount and reasonable fees; possible anomaly',
      };
    }
    if (tokenDelta < 0n) {
      return {
        safe: false,
        reason:
          'Token balance should not decrease on buy; possible malicious contract',
      };
    }
    if (minOutExpected != null && minOutExpected > 0n) {
      const threshold =
        (minOutExpected * BigInt(10000 - slippageBps - extraSlippageBps)) /
        10000n;
      if (tokenDelta < threshold) {
        return {
          safe: false,
          reason: `Token received well below expected (beyond slippage/safety threshold); possible malicious contract`,
        };
      }
    }
  } else {
    if (solDelta < -feeToleranceLamports) {
      return {
        safe: false,
        reason: 'SOL should not decrease on sell; unexpected fund outflow',
      };
    }
    const tokenDecreaseTolerance =
      (amountIn * BigInt(extraSlippageBps)) / 10000n;
    if (tokenDelta < -amountIn - tokenDecreaseTolerance) {
      return {
        safe: false,
        reason:
          'Token outflow exceeds sell amount; possible malicious contract',
      };
    }
    if (minOutExpected != null && minOutExpected > 0n) {
      const threshold =
        (minOutExpected * BigInt(10000 - extraSlippageBps)) / 10000n;
      if (solDelta < Number(threshold)) {
        return {
          safe: false,
          reason: `SOL received well below expected (beyond safety threshold); possible malicious contract`,
        };
      }
    }
  }

  return { safe: true };
}
