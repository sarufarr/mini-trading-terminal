/**
 * Codex-backed routes: lazy-loaded so the codex chunk loads only when
 * the user hits a route that needs it (/, /networks/:id, …/tokens/:id).
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CodexProvider } from '@/contexts/codex-provider';
import { LoadingFallback } from '@/components/LoadingFallback';

const HomePage = lazy(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const NetworkPage = lazy(() =>
  import('@/pages/NetworkPage').then((m) => ({ default: m.NetworkPage }))
);
const TokenPage = lazy(() =>
  import('@/pages/TokenPage').then((m) => ({ default: m.TokenPage }))
);

export function AppCodexRoutes() {
  return (
    <CodexProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/networks/:networkId" element={<NetworkPage />} />
          <Route
            path="/networks/:networkId/tokens/:tokenId"
            element={<TokenPage />}
          />
        </Routes>
      </Suspense>
    </CodexProvider>
  );
}
