import axios, { type AxiosInstance } from 'axios';
import type { VersionedTransaction } from '@solana/web3.js';

interface JitoRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JitoRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: JitoRpcError;
}

let client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!import.meta.env.VITE_JITO_BLOCK_ENGINE_URL) {
    throw new Error('Jito block engine URL is not configured');
  }
  if (!client) {
    client = axios.create({
      baseURL: import.meta.env.VITE_JITO_BLOCK_ENGINE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }
  return client;
}

async function jitoRequest<T>(
  endpoint: string,
  method: string,
  params?: unknown[]
): Promise<T> {
  const rpcBody = {
    jsonrpc: '2.0',
    id: 1,
    method,
    params: params ?? [],
  };

  const { data } = await getClient().post<JitoRpcResponse<T>>(
    endpoint,
    rpcBody
  );

  if (data.error) {
    throw new Error(
      `Jito RPC error (${data.error.code}): ${data.error.message}`
    );
  }
  if (data.result === undefined) {
    throw new Error(`Jito RPC ${method} returned no result`);
  }
  return data.result;
}

export async function getJitoTipAccounts(): Promise<string[]> {
  return jitoRequest<string[]>('/bundles', 'getTipAccounts');
}

export async function getRandomJitoTipAccount(): Promise<string | null> {
  const configured = import.meta.env.VITE_JITO_TIP_ACCOUNT?.trim();
  if (configured) return configured;

  const accounts = await getJitoTipAccounts();
  if (!accounts.length) return null;
  const idx = Math.floor(Math.random() * accounts.length);
  return accounts[idx] ?? null;
}

export async function sendJitoBundle(
  transactions: VersionedTransaction[]
): Promise<string> {
  if (!transactions.length) {
    throw new Error('sendJitoBundle requires at least one transaction');
  }

  const encoded = transactions.map((tx) =>
    Buffer.from(tx.serialize()).toString('base64')
  );

  const params: unknown[] = [encoded, { encoding: 'base64' }];

  const bundleId = await jitoRequest<string>('/bundles', 'sendBundle', params);
  console.debug('[jito] bundle submitted:', bundleId);
  return bundleId;
}
