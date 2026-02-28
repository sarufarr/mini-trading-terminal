/**
 * Web Worker for compute-heavy logic: price impact status, etc.
 * Keeps main thread free for 60fps UI.
 */

type PriceImpactStatusMsg = {
  id: string;
  type: 'PRICE_IMPACT_STATUS';
  priceImpactPct: string | null;
  simulatedSlippageBps: number | null;
  warnPct: number;
  blockPct: number;
};

type WorkerMsg = PriceImpactStatusMsg;

interface PriceImpactStatusResult {
  effectivePct: number;
  isWarn: boolean;
  isBlock: boolean;
}

function handlePriceImpactStatus(
  priceImpactPct: string | null,
  simulatedSlippageBps: number | null,
  warnPct: number,
  blockPct: number
): PriceImpactStatusResult {
  const fromPriceImpact =
    priceImpactPct != null && priceImpactPct !== ''
      ? Number.parseFloat(priceImpactPct)
      : 0;
  const fromSimulated =
    simulatedSlippageBps != null ? simulatedSlippageBps / 100 : 0;
  const effectivePct =
    Number.isFinite(fromPriceImpact) || Number.isFinite(fromSimulated)
      ? Math.max(
          Number.isFinite(fromPriceImpact) ? fromPriceImpact : 0,
          Number.isFinite(fromSimulated) ? fromSimulated : 0
        )
      : 0;

  return {
    effectivePct,
    isWarn: effectivePct >= warnPct,
    isBlock: effectivePct >= blockPct,
  };
}

self.onmessage = (e: MessageEvent<WorkerMsg>) => {
  const msg = e.data;
  try {
    let response:
      | { id: string; result: unknown }
      | { id: string; error: string };
    switch (msg.type) {
      case 'PRICE_IMPACT_STATUS':
        response = {
          id: msg.id,
          result: handlePriceImpactStatus(
            msg.priceImpactPct,
            msg.simulatedSlippageBps,
            msg.warnPct,
            msg.blockPct
          ),
        };
        break;
      default:
        response = {
          id: (msg as { id: string }).id,
          error: 'Unknown message type',
        };
    }
    self.postMessage(response);
  } catch (err) {
    self.postMessage({
      id: msg.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
