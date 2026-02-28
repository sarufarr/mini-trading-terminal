import { useContext } from 'react';
import type { CodexClient } from '@/lib/codex';
import { CodexContext } from './codex-context';

export function useCodexClient(): CodexClient {
  const client = useContext(CodexContext);
  if (!client) {
    throw new Error('useCodexClient must be used within CodexProvider');
  }
  return client;
}
