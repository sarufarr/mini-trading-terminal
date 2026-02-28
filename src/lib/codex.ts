import { Codex } from '@codex-data/sdk';
import type { EnhancedToken } from '@codex-data/sdk/dist/sdk/generated/graphql';
import type { PairFilterResult } from '@codex-data/sdk/dist/sdk/generated/graphql';
import {
  PairRankingAttribute,
  RankingDirection,
} from '@codex-data/sdk/dist/sdk/generated/graphql';

export type { EnhancedToken, PairFilterResult };
export { PairRankingAttribute, RankingDirection };

export function isPairFilterResult(
  p: PairFilterResult | null | undefined
): p is PairFilterResult {
  return p != null;
}

export const getCodexClient = () => {
  return new Codex(import.meta.env.VITE_CODEX_API_KEY);
};

export type CodexClient = ReturnType<typeof getCodexClient>;
