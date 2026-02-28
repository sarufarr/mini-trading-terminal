import { createContext } from 'react';
import type { CodexClient } from '@/lib/codex';

export const CodexContext = createContext<CodexClient | null>(null);
