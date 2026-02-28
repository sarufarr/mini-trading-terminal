import { PublicKey } from '@solana/web3.js';

export const RAYDIUM_CLMM_PROGRAM_ID = new PublicKey(
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'
);

export const SPL_MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export const TICK_ARRAY_SIZE = 60;

export const SWAP_V2_DISCRIMINATOR = Buffer.from([
  0x2b, 0x04, 0xed, 0x0b, 0x1a, 0xc9, 0x1e, 0x62,
]);

export const SOLANA_NETWORK_ID = 1399811149;
