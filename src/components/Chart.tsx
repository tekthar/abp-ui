'use client';

import { Box, Flex, Text } from '@chakra-ui/react';
import { Chart as ChakraChart, useChart } from '@chakra-ui/charts';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTodaLocale } from '../provider/locale';
import { useLoading } from '../skeleton/loading';
import { Bone } from '../skeleton/bones';

export interface ChartSeries {
  key: string;
  label: string;
  /** A color token; series take the palette in order when left out. */
  color?: string;
  /** Drawn dashed (an ideal line, a target). */
  dashed?: boolean;
}

export interface ChartProps {
  /** line, area or bar; stacked areas and bars add up (cumulative flow). */
  kind: 'line' | 'area' | 'bar';
  stacked?: boolean;
  /** One row per point on the x axis. */
  data: Record<string, string | number | null>[];
  /** The key of the x value in each row. */
  x: string;
  series: ChartSeries[];
  /** What the chart shows, for screen readers; a table of the same numbers is read with it. */
  'aria-label': string;
  height?: number | string;
  formatX?: (value: string) => string;
  formatValue?: (value: number) => string;
  /** Its numbers are coming (ADR 0061): a plot of placeholders, as tall as the chart. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

const PALETTE = ['teal.solid', 'blue.solid', 'orange.solid', 'purple.solid', 'green.solid', 'pink.solid', 'cyan.solid', 'yellow.solid', 'red.solid'];

/**
 * A chart (ADR 0031) on `@chakra-ui/charts`: design tokens, dark mode, right to left (the axes mirror), a tooltip and a
 * legend. The same numbers are in a table screen readers read, so nothing is only in the picture.
 */
export function Chart({ kind, stacked, data, x, series, 'aria-label': ariaLabel, height = 280, formatX, formatValue, loading: own }: ChartProps) {
  const { isRtl: rtl } = useTodaLocale();
  const loading = useLoading(own);
  const chart = useChart({
    data,
    series: series.map((s, i) => ({ name: s.key, label: s.label, color: s.color ?? PALETTE[i % PALETTE.length], stackId: stacked ? 'stack' : undefined, strokeDasharray: s.dashed ? '5 4' : undefined })),
  });
  // Recharts also asks for labels that aren't x values (an inactive tooltip passes an index); only x values are formatted.
  const xs = new Set(data.map((row) => String(row[x])));
  const label = (value: unknown) => (value == null ? '' : formatX && xs.has(String(value)) ? formatX(String(value)) : String(value));
  const xAxis = <XAxis dataKey={chart.key(x)} reversed={rtl} tickLine={false} axisLine={false} tickFormatter={label} minTickGap={12} />;
  const yAxis = <YAxis orientation={rtl ? 'right' : 'left'} tickLine={false} axisLine={false} width={44} tickFormatter={formatValue} allowDecimals={false} />;
  const grid = <CartesianGrid stroke={chart.color('border.muted')} vertical={false} />;
  const tooltip = <Tooltip cursor={{ fill: chart.color('bg.muted') }} animationDuration={100} content={<ChakraChart.Tooltip />} labelFormatter={label} />;
  const legend = series.length > 1 ? <Legend content={<ChakraChart.Legend />} /> : null;

  if (loading) {
    // As tall as the chart, with room for its axes: bars for a bar chart, a skyline for the others.
    return (
      <Box aria-hidden="true">
        <Flex h={typeof height === 'number' ? `${height}px` : height} align="flex-end" gap={kind === 'bar' ? '2' : '0.5'} ps="12" pe="2" pb="8" pt="2">
          {Array.from({ length: 12 }, (_, i) => (
            <Bone key={i} flex="1" width="auto" height={`${28 + ((i * 37) % 60)}%`} borderRadius={kind === 'bar' ? 'l1' : '0'} />
          ))}
        </Flex>
      </Box>
    );
  }

  return (
    <Box>
      <ChakraChart.Root h={typeof height === 'number' ? `${height}px` : height} aspectRatio="auto" chart={chart} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
        {kind === 'bar' ? (
          <BarChart data={chart.data}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {chart.series.map((s) => (
              <Bar key={s.name} isAnimationActive={false} dataKey={chart.key(s.name)} fill={chart.color(s.color)} stackId={s.stackId} radius={stacked ? 0 : 3} />
            ))}
          </BarChart>
        ) : kind === 'area' ? (
          <AreaChart data={chart.data}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {chart.series.map((s) => (
              <Area key={s.name} isAnimationActive={false} type="monotone" dataKey={chart.key(s.name)} stackId={s.stackId} stroke={chart.color(s.color)}
                fill={chart.color(s.color)} fillOpacity={0.25} strokeDasharray={s.strokeDasharray} />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={chart.data}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {chart.series.map((s) => (
              <Line key={s.name} isAnimationActive={false} type="monotone" dataKey={chart.key(s.name)} stroke={chart.color(s.color)} strokeWidth={2}
                strokeDasharray={s.strokeDasharray} dot={false} connectNulls />
            ))}
          </LineChart>
        )}
        </ResponsiveContainer>
      </ChakraChart.Root>
      <Box as="table" srOnly>
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">{''}</th>
            {series.map((s) => (
              <th key={s.key} scope="col">{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <th scope="row">{formatX ? formatX(String(row[x])) : String(row[x])}</th>
              {series.map((s) => (
                <td key={s.key}>{row[s.key] == null ? '' : formatValue ? formatValue(Number(row[s.key])) : String(row[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Box>
      {data.length === 0 && <Text textStyle="caption" color="fg.muted">—</Text>}
    </Box>
  );
}
