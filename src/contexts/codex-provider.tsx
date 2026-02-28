import { useMemo, type ReactNode } from 'react';
import type { CodexClient } from '@/lib/codex';
import { createCodexClient } from '@/lib/codex';
import { env } from '@/env';
import { CodexContext } from './codex-context';

interface CodexProviderProps {
  children: ReactNode;
  client?: CodexClient;
  apiKey?: string;
}

export function CodexProvider({
  children,
  client: injectedClient,
  apiKey = env.VITE_CODEX_API_KEY,
}: CodexProviderProps) {
  const client = useMemo(() => {
    if (injectedClient) return injectedClient;
    return createCodexClient(apiKey);
  }, [injectedClient, apiKey]);

  return (
    <CodexContext.Provider value={client}>{children}</CodexContext.Provider>
  );
}
