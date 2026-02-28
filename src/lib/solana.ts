import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
  type RpcResponseAndContext,
  type SignatureResult,
  type SimulatedTransactionResponse,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import Decimal from 'decimal.js';
import bs58 from 'bs58';
import { env } from '@/env';
import { devLog } from '@/lib/dev-log';

export const connection = new Connection(env.VITE_HELIUS_RPC_URL);

export const keypair = Keypair.fromSecretKey(
  bs58.decode(env.VITE_SOLANA_PRIVATE_KEY)
);

export const createKeypair = (privateKey: string): Keypair =>
  Keypair.fromSecretKey(bs58.decode(privateKey));

export const getSolanaBalance = async (
  connection: Connection,
  publicKey: string
): Promise<Decimal> => {
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return new Decimal(balance);
};

export const getTokenBalance = async (
  connection: Connection,
  publicKey: string,
  tokenAddress: string
): Promise<Decimal | null> => {
  try {
    const mint = new PublicKey(tokenAddress);
    const owner = new PublicKey(publicKey);

    const mintInfo = await connection.getAccountInfo(mint);
    if (!mintInfo) return null;

    const tokenAccountPubkey = getAssociatedTokenAddressSync(
      mint,
      owner,
      false,
      mintInfo.owner
    );

    const response =
      await connection.getTokenAccountBalance(tokenAccountPubkey);
    return new Decimal(response.value.amount);
  } catch (error) {
    devLog.error('Error fetching token balance:', error);
    return null;
  }
};

export const signTransaction = (
  kp: Keypair,
  transaction: VersionedTransaction
): VersionedTransaction => {
  transaction.sign([kp]);
  return transaction;
};

export const sendTransaction = async (
  connection: Connection,
  transaction: VersionedTransaction
): Promise<string> => {
  return connection.sendTransaction(transaction);
};

export const simulateTransaction = async (
  connection: Connection,
  transaction: VersionedTransaction
): Promise<SimulatedTransactionResponse> => {
  const response = await connection.simulateTransaction(transaction, {
    commitment: 'processed',
    sigVerify: true,
  });
  return response.value;
};

/**
 * Simulate tx and return post-simulation state for given accounts (for anti-phishing balance check).
 * addresses order must match caller's parsing; usually [payer, tokenATA].
 */
export const simulateTransactionWithAccounts = async (
  connection: Connection,
  transaction: VersionedTransaction,
  accountAddresses: string[]
): Promise<SimulatedTransactionResponse> => {
  const response = await connection.simulateTransaction(transaction, {
    commitment: 'processed',
    sigVerify: true,
    accounts: {
      encoding: 'base64',
      addresses: accountAddresses,
    },
  });
  return response.value;
};

export const confirmTransaction = async (
  connection: Connection,
  signature: string,
  blockhashCtx: BlockhashWithExpiryBlockHeight
): Promise<RpcResponseAndContext<SignatureResult>> => {
  return connection.confirmTransaction(
    {
      signature,
      blockhash: blockhashCtx.blockhash,
      lastValidBlockHeight: blockhashCtx.lastValidBlockHeight,
    },
    'confirmed'
  );
};
