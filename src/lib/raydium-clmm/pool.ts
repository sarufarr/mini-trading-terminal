import { Connection, PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { RAYDIUM_CLMM_PROGRAM_ID } from './constants';
import type { PoolState } from './types';
import { readI32LE, readPubkey, readU128LE, readU16LE, readU8 } from '../utils';
import { parseAccountData } from './util';

const POOL_LAYOUT = (() => {
  let cursor = 8 + 1 + 7;
  const ammConfig = cursor;
  cursor += 32;
  const owner = cursor;
  cursor += 32;
  const token0Mint = cursor;
  cursor += 32;
  const token1Mint = cursor;
  cursor += 32;
  const token0Vault = cursor;
  cursor += 32;
  const token1Vault = cursor;
  cursor += 32;
  const observationKey = cursor;
  cursor += 32;
  const mintDecimals0 = cursor;
  cursor += 1;
  const mintDecimals1 = cursor;
  cursor += 1;
  const tickSpacing = cursor;
  cursor += 2;
  const liquidity = cursor;
  cursor += 16;
  const sqrtPriceX64 = cursor;
  cursor += 16;
  const tickCurrent = cursor;
  cursor += 4;
  const status = cursor;
  return {
    ammConfig,
    owner,
    token0Mint,
    token1Mint,
    token0Vault,
    token1Vault,
    observationKey,
    mintDecimals0,
    mintDecimals1,
    tickSpacing,
    liquidity,
    sqrtPriceX64,
    tickCurrent,
    status,
  };
})();

export async function fetchPoolState(
  connection: Connection,
  poolId: PublicKey
): Promise<PoolState> {
  const info = await connection.getAccountInfo(poolId, 'confirmed');
  if (!info) throw new Error(`CLMM pool not found: ${poolId.toString()}`);

  const { data, view } = parseAccountData(info.data);

  const state: PoolState = {
    ammConfig: readPubkey(data, POOL_LAYOUT.ammConfig),
    owner: readPubkey(data, POOL_LAYOUT.owner),
    token0Mint: readPubkey(data, POOL_LAYOUT.token0Mint),
    token1Mint: readPubkey(data, POOL_LAYOUT.token1Mint),
    token0Vault: readPubkey(data, POOL_LAYOUT.token0Vault),
    token1Vault: readPubkey(data, POOL_LAYOUT.token1Vault),
    observationKey: readPubkey(data, POOL_LAYOUT.observationKey),
    mintDecimals0: readU8(view, POOL_LAYOUT.mintDecimals0),
    mintDecimals1: readU8(view, POOL_LAYOUT.mintDecimals1),
    tickSpacing: readU16LE(view, POOL_LAYOUT.tickSpacing),
    liquidity: readU128LE(view, POOL_LAYOUT.liquidity),
    sqrtPriceX64: readU128LE(view, POOL_LAYOUT.sqrtPriceX64),
    tickCurrent: readI32LE(view, POOL_LAYOUT.tickCurrent),
    status: readU8(view, POOL_LAYOUT.status),
  };

  if (state.status !== 0) {
    throw new Error(`CLMM pool is not active (status=${state.status})`);
  }
  if (state.liquidity === 0n) {
    throw new Error('CLMM pool has no liquidity');
  }

  return state;
}

const POOL_ACCOUNT_SIZE = 1544;
const POOL_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedPoolEntry = {
  value: PublicKey | null;
  expiresAt: number;
};

const poolAddressCache = new Map<string, CachedPoolEntry>();

export async function findClmmPool(
  connection: Connection,
  tokenMint: PublicKey,
  quoteMint: PublicKey = NATIVE_MINT
): Promise<PublicKey | null> {
  const cacheKey = `${tokenMint.toString()}:${quoteMint.toString()}`;
  const cached = poolAddressCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const [asToken0, asToken1] = await Promise.all([
    connection.getProgramAccounts(RAYDIUM_CLMM_PROGRAM_ID, {
      filters: [
        { dataSize: POOL_ACCOUNT_SIZE },
        {
          memcmp: {
            offset: POOL_LAYOUT.token0Mint,
            bytes: tokenMint.toBase58(),
          },
        },
      ],
    }),
    connection.getProgramAccounts(RAYDIUM_CLMM_PROGRAM_ID, {
      filters: [
        { dataSize: POOL_ACCOUNT_SIZE },
        {
          memcmp: {
            offset: POOL_LAYOUT.token1Mint,
            bytes: tokenMint.toBase58(),
          },
        },
      ],
    }),
  ]);

  const all = [...asToken0, ...asToken1];
  const withQuote = all.filter((item) => {
    const { data } = parseAccountData(item.account.data);
    const t0 = readPubkey(data, POOL_LAYOUT.token0Mint);
    const t1 = readPubkey(data, POOL_LAYOUT.token1Mint);
    const other = t0.equals(tokenMint) ? t1 : t0;
    return other.equals(quoteMint);
  });

  if (withQuote.length === 0) {
    poolAddressCache.set(cacheKey, {
      value: null,
      expiresAt: now + POOL_CACHE_TTL_MS,
    });
    return null;
  }

  const best = withQuote.reduce((prev, curr) => {
    const { view: prevView } = parseAccountData(prev.account.data);
    const { view: currView } = parseAccountData(curr.account.data);
    const prevLiq = readU128LE(prevView, POOL_LAYOUT.liquidity);
    const currLiq = readU128LE(currView, POOL_LAYOUT.liquidity);
    return currLiq > prevLiq ? curr : prev;
  });

  poolAddressCache.set(cacheKey, {
    value: best.pubkey,
    expiresAt: now + POOL_CACHE_TTL_MS,
  });
  return best.pubkey;
}
