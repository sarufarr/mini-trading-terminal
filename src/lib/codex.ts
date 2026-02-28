import { Codex } from '@codex-data/sdk';
import type { EnhancedToken } from '@codex-data/sdk/dist/sdk/generated/graphql';

export type { EnhancedToken };

export const getCodexClient = () => {
  return new Codex(import.meta.env.VITE_CODEX_API_KEY);
};

export type CodexClient = ReturnType<typeof getCodexClient>;
