import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Codex } from '@codex-data/sdk';
import type { CodexClient } from '@/lib/codex';

const CodexContext = createContext<CodexClient | null>(null);

interface CodexProviderProps {
  children: ReactNode;
  /** 用于测试或多 key 场景：注入自定义 client，不创建新实例 */
  client?: CodexClient;
  /** 用于多 key 场景：覆盖 env 中的 API key */
  apiKey?: string;
}

export function CodexProvider({
  children,
  client: injectedClient,
  apiKey = import.meta.env.VITE_CODEX_API_KEY,
}: CodexProviderProps) {
  const client = useMemo(() => {
    if (injectedClient) return injectedClient;
    return new Codex(apiKey) as CodexClient;
  }, [injectedClient, apiKey]);

  return (
    <CodexContext.Provider value={client}>{children}</CodexContext.Provider>
  );
}

export function useCodexClient(): CodexClient {
  const client = useContext(CodexContext);
  if (!client) {
    throw new Error('useCodexClient must be used within CodexProvider');
  }
  return client;
}
