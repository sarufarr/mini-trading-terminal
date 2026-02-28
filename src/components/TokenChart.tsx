import React from 'react';
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

export const TokenChart: React.FC<TokenChartProps> = ({
  data,
  title = 'Price Chart',
}) => {
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

  const formatXAxis = (tickItem: number) => {
    return new Date(tickItem * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTooltipValue = (value: number) => {
    return value.toFixed(4);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              tickFormatter={formatXAxis}
              stroke="#AAAAAA"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#AAAAAA"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: '#FFFFFF',
              }}
              labelFormatter={formatXAxis}
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
};
