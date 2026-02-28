import { env } from '@/env';
import { Codex } from '@codex-data/sdk';
import type { EnhancedToken, PairFilterResult } from '@/lib/codex-types';
import { PairRankingAttribute, RankingDirection } from '@/lib/codex-types';

export type { EnhancedToken, PairFilterResult };
export { PairRankingAttribute, RankingDirection };

export function isPairFilterResult(
  p: PairFilterResult | null | undefined
): p is PairFilterResult {
  return p != null;
}

export type CodexClient = InstanceType<typeof Codex>;

/** Create a Codex client with the given API key. Used by getCodexClient and CodexProvider. */
export function createCodexClient(apiKey: string): CodexClient {
  return new Codex(apiKey) as CodexClient;
}

export const getCodexClient = () => createCodexClient(env.VITE_CODEX_API_KEY);
