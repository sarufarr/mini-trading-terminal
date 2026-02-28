import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Layout } from '@/components/Layout';
import { LoadingFallback } from '@/components/LoadingFallback';

const AppCodexRoutes = lazy(() =>
  import('@/AppCodexRoutes').then((m) => ({ default: m.AppCodexRoutes }))
);

export function App() {
  return (
    <>
      <Toaster />
      <Layout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/*" element={<AppCodexRoutes />} />
          </Routes>
        </Suspense>
      </Layout>
    </>
  );
}
