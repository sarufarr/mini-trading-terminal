import { Suspense, lazy, memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ChartDataPoint } from '@/components/TokenChart';

const TokenChart = lazy(() =>
  import('@/components/TokenChart').then((m) => ({ default: m.TokenChart }))
);

interface TokenPageChartSectionProps {
  bars: ChartDataPoint[];
  tokenSymbol: string;
}

export const TokenPageChartSection = memo(function TokenPageChartSection({
  bars,
  tokenSymbol,
}: TokenPageChartSectionProps) {
  const chartTitle = useMemo(
    () => `${tokenSymbol || 'Token'} Price Chart`,
    [tokenSymbol]
  );
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent>
            <p>Loading chart...</p>
          </CardContent>
        </Card>
      }
    >
      <TokenChart data={bars} title={chartTitle} />
    </Suspense>
  );
});

TokenPageChartSection.displayName = 'TokenPageChartSection';
