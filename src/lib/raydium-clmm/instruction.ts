import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  RAYDIUM_CLMM_PROGRAM_ID,
  SWAP_V2_DISCRIMINATOR,
  SPL_MEMO_PROGRAM_ID,
} from './constants';
import type { PoolState } from './types';

const tokenProgramCache = new Map<string, PublicKey>();

export async function getTokenProgramId(
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey> {
  const key = mint.toString();
  const cached = tokenProgramCache.get(key);
  if (cached !== undefined) return cached;

  const info = await connection.getAccountInfo(mint, 'confirmed');
  if (!info) throw new Error(`Mint account not found: ${mint.toString()}`);

  const programId = info.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  tokenProgramCache.set(key, programId);
  return programId;
}

function writeU64LE(view: DataView, offset: number, value: bigint): void {
  view.setUint32(offset, Number(value & 0xffffffffn), true);
  view.setUint32(offset + 4, Number((value >> 32n) & 0xffffffffn), true);
}

function writeU128LE(view: DataView, offset: number, value: bigint): void {
  view.setUint32(offset, Number(value & 0xffffffffn), true);
  view.setUint32(offset + 4, Number((value >> 32n) & 0xffffffffn), true);
  view.setUint32(offset + 8, Number((value >> 64n) & 0xffffffffn), true);
  view.setUint32(offset + 12, Number((value >> 96n) & 0xffffffffn), true);
}

function encodeSwapData(amountIn: bigint, minAmountOut: bigint): Buffer {
  const buf = Buffer.alloc(41);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  SWAP_V2_DISCRIMINATOR.copy(buf, 0);
  writeU64LE(view, 8, amountIn);
  writeU64LE(view, 16, minAmountOut);
  writeU128LE(view, 24, 0n);
  buf[40] = 1;

  return buf;
}

export async function buildSwapBaseInputInstruction(params: {
  connection: Connection;
  payer: PublicKey;
  poolId: PublicKey;
  poolState: PoolState;
  tickArrays: PublicKey[];
  amountIn: bigint;
  minAmountOut: bigint;
  zeroForOne: boolean;
}): Promise<TransactionInstruction> {
  const {
    connection,
    payer,
    poolId,
    poolState,
    tickArrays,
    amountIn,
    minAmountOut,
    zeroForOne,
  } = params;

  if (tickArrays.length === 0) {
    throw new Error('At least one tick array is required for swap');
  }

  const [inputMint, outputMint] = zeroForOne
    ? [poolState.token0Mint, poolState.token1Mint]
    : [poolState.token1Mint, poolState.token0Mint];

  const [inputVault, outputVault] = zeroForOne
    ? [poolState.token0Vault, poolState.token1Vault]
    : [poolState.token1Vault, poolState.token0Vault];

  const [inputTokenProgram, outputTokenProgram] = await Promise.all([
    getTokenProgramId(connection, inputMint),
    getTokenProgramId(connection, outputMint),
  ]);

  const inputATA = getAssociatedTokenAddressSync(
    inputMint,
    payer,
    false,
    inputTokenProgram
  );
  const outputATA = getAssociatedTokenAddressSync(
    outputMint,
    payer,
    false,
    outputTokenProgram
  );

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: poolState.ammConfig, isSigner: false, isWritable: false },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: inputATA, isSigner: false, isWritable: true },
    { pubkey: outputATA, isSigner: false, isWritable: true },
    { pubkey: inputVault, isSigner: false, isWritable: true },
    { pubkey: outputVault, isSigner: false, isWritable: true },
    { pubkey: poolState.observationKey, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SPL_MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: inputMint, isSigner: false, isWritable: false },
    { pubkey: outputMint, isSigner: false, isWritable: false },
    ...tickArrays.map((ta) => ({
      pubkey: ta,
      isSigner: false,
      isWritable: true,
    })),
  ];

  return new TransactionInstruction({
    programId: RAYDIUM_CLMM_PROGRAM_ID,
    keys,
    data: encodeSwapData(amountIn, minAmountOut),
  });
}
