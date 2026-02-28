/**
 * Client for compute.worker.ts. Offloads price impact etc. to keep main thread at 60fps.
 */

import {
  PRICE_IMPACT_WARN_PCT,
  PRICE_IMPACT_BLOCK_PCT,
} from '@/constants/trade';
import type { PriceImpactStatus } from '@/lib/price-impact';

type WorkerMsg = {
  id: string;
  type: 'PRICE_IMPACT_STATUS';
  priceImpactPct: string | null;
  simulatedSlippageBps: number | null;
  warnPct: number;
  blockPct: number;
};

type WorkerResponse =
  | { id: string; result: PriceImpactStatus }
  | { id: string; error: string };

let workerInstance: Worker | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('@/workers/compute.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return workerInstance;
}

function postTask<T>(msg: WorkerMsg): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const handler = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== msg.id) return;
      worker.removeEventListener('message', handler);
      if ('error' in e.data) reject(new Error(e.data.error));
      else resolve(e.data.result as T);
    };
    worker.addEventListener('message', handler);
    worker.postMessage(msg);
  });
}

let taskId = 0;
function nextId(): string {
  return `compute-${++taskId}-${Date.now()}`;
}

export function getPriceImpactStatusInWorker(
  priceImpactPct: string | null,
  simulatedSlippageBps: number | null,
  warnPct: number = PRICE_IMPACT_WARN_PCT,
  blockPct: number = PRICE_IMPACT_BLOCK_PCT
): Promise<PriceImpactStatus> {
  return postTask<PriceImpactStatus>({
    id: nextId(),
    type: 'PRICE_IMPACT_STATUS',
    priceImpactPct,
    simulatedSlippageBps,
    warnPct,
    blockPct,
  });
}
