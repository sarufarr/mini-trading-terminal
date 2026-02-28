import { memo, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SOL_DISPLAY_DECIMALS } from '@/constants/trade';

export interface ChartDataPoint {
  time: number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
}

interface TokenChartProps {
  data: ChartDataPoint[];
  title?: string;
}

const CHART_MARGIN = { top: 5, right: 30, left: 20, bottom: 5 } as const;

function getUniqueXTicks(
  times: number[],
  format: (t: number) => string
): number[] {
  const seen = new Set<string>();
  const result: number[] = [];
  for (const t of times) {
    const label = format(t);
    if (seen.has(label)) continue;
    seen.add(label);
    result.push(t);
  }
  return result;
}

function getYDomain(
  data: ChartDataPoint[],
  paddingRatio = 0.05
): [number, number] | undefined {
  const values = data
    .flatMap((d) => [d.low, d.high, d.open, d.close].filter(Boolean))
    .map(Number);
  if (values.length === 0) return undefined;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padding = span * paddingRatio;
  return [min - padding, max + padding];
}

export const TokenChart = memo(function TokenChart({
  data,
  title = 'Price Chart',
}: TokenChartProps) {
  const { formatXAxis, tickCount } = useMemo(() => {
    if (!data?.length) {
      return {
        formatXAxis: (t: number) =>
          new Date(t * 1000).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
        tickCount: 5,
      };
    }
    const times = data.map((d) => d.time);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const spanSeconds = maxT - minT;
    const oneDay = 86400;
    const sameDayOrLess = spanSeconds <= oneDay;

    return {
      formatXAxis: (tickItem: number) => {
        const date = new Date(tickItem * 1000);
        if (sameDayOrLess) {
          return date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        return date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
      },
      tickCount: Math.min(6, Math.max(4, Math.ceil(data.length / 20))),
    };
  }, [data]);

  const formatTooltipLabel = useCallback((t: number) => {
    const date = new Date(t * 1000);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const formatTooltipValue = useCallback((value: number) => {
    return value.toFixed(SOL_DISPLAY_DECIMALS);
  }, []);

  const yAxisFormatter = useCallback(
    (value: number) => `$${value.toFixed(2)}`,
    []
  );

  const xTicks = useMemo(() => {
    const times = data.map((d) => d.time);
    const unique = getUniqueXTicks(times, formatXAxis);
    if (unique.length <= tickCount) return unique;
    const step = (unique.length - 1) / (tickCount - 1);
    return Array.from(
      { length: tickCount },
      (_, i) => unique[Math.round(i * step)]
    );
  }, [data, formatXAxis, tickCount]);

  const yDomain = useMemo(() => getYDomain(data), [data]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No chart data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              ticks={xTicks.length > 0 ? xTicks : undefined}
              tickFormatter={formatXAxis}
              stroke="#AAAAAA"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              stroke="#AAAAAA"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={yAxisFormatter}
              domain={yDomain ?? ['auto', 'auto']}
              tickCount={6}
              allowDecimals
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: '#FFFFFF',
              }}
              labelFormatter={formatTooltipLabel}
              formatter={formatTooltipValue}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#FFFFFF"
              activeDot={{ r: 8 }}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

TokenChart.displayName = 'TokenChart';
