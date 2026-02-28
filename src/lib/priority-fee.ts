/**
 * Dynamic priority fee: setComputeUnitLimit / setComputeUnitPrice from recent block fees
 * to improve landing probability when Solana is congested.
 */
import type { Connection } from '@solana/web3.js';
import { ComputeBudgetProgram } from '@solana/web3.js';

/** Default compute unit limit (swap ~200k–400k, with margin) */
export const DEFAULT_COMPUTE_UNIT_LIMIT = 400_000;

/** Solana max CU per transaction */
export const MAX_COMPUTE_UNITS = 1_400_000;

/** CLMM swap base CU (single pool + ATA + instruction overhead), excluding cross-tick loop */
const CU_BASE_CLMM_SWAP = 200_000;

/** Extra CU per additional Tick Array */
const CU_PER_TICK_ARRAY = 55_000;

/**
 * Estimate compute unit limit from number of Tick Arrays involved in swap.
 * More tick arrays (wider price range) need more CU to avoid execution failure.
 */
export function computeUnitLimitForTickArrays(tickArrayCount: number): number {
  const n = Math.max(0, Math.min(tickArrayCount, 15));
  const limit = CU_BASE_CLMM_SWAP + n * CU_PER_TICK_ARRAY;
  return Math.min(MAX_COMPUTE_UNITS, limit);
}

/** Min microLamports so 0 does not remove priority */
const MIN_MICRO_LAMPORTS = 1_000;

/** Percentile of recent slot fees to avoid outliers */
const RECENT_FEE_PERCENTILE = 0.7;

/** Max microLamports cap to prevent misconfig or abnormally high fee */
const MAX_MICRO_LAMPORTS = 1_000_000;

export interface DynamicPriorityFeeResult {
  microLamports: number;
  computeUnitLimit: number;
}

export interface DynamicPriorityFeeOptions {
  /** Override default computeUnitLimit when provided (e.g. from computeUnitLimitForTickArrays) */
  computeUnitLimit?: number;
}

/**
 * Read recent block prioritization fees and compute dynamic microLamports.
 * Uses RECENT_FEE_PERCENTILE; uses options.computeUnitLimit or DEFAULT_COMPUTE_UNIT_LIMIT.
 */
export async function getDynamicPriorityFee(
  connection: Connection,
  options?: DynamicPriorityFeeOptions
): Promise<DynamicPriorityFeeResult> {
  let microLamports = MIN_MICRO_LAMPORTS;
  try {
    const fees = await connection.getRecentPrioritizationFees();
    if (fees && fees.length > 0) {
      const sorted = fees
        .map((f) =>
          typeof f.prioritizationFee === 'number'
            ? f.prioritizationFee
            : Number(f.prioritizationFee ?? 0)
        )
        .filter((n) => Number.isFinite(n) && n >= 0)
        .sort((a, b) => a - b);
      if (sorted.length > 0) {
        const idx = Math.min(
          Math.floor(sorted.length * RECENT_FEE_PERCENTILE),
          sorted.length - 1
        );
        microLamports = Math.max(MIN_MICRO_LAMPORTS, sorted[idx]);
        microLamports = Math.min(MAX_MICRO_LAMPORTS, microLamports);
      }
    }
  } catch {
    microLamports = MIN_MICRO_LAMPORTS;
  }
  const computeUnitLimit =
    options?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
  return {
    microLamports,
    computeUnitLimit,
  };
}

/**
 * Return Compute Budget instructions (setComputeUnitLimit + setComputeUnitPrice) to prepend to tx.
 */
export function makeComputeBudgetInstructions(params: {
  microLamports: number;
  computeUnitLimit?: number;
}) {
  const { microLamports, computeUnitLimit = DEFAULT_COMPUTE_UNIT_LIMIT } =
    params;
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: Math.max(MIN_MICRO_LAMPORTS, microLamports),
    }),
  ];
}
