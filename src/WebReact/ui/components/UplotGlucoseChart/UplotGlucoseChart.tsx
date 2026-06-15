'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import uPlot from 'uplot';
import type { SensorGlucose } from '@/lib/nocturne/types';

interface UplotGlucoseChartProps {
  ariaLabel?: string;
  height?: number;
  readings: SensorGlucose[];
}

interface ChartPoint {
  readingId?: string;
  timestamp: string;
  valueMgDl: number;
}

const LOW_THRESHOLD_MGDL = 70;
const HIGH_THRESHOLD_MGDL = 180;
const Y_MIN = 40;
const POINT_RADIUS = 2.5;
const AUTO_LINE_MIN_POINT_SPACING_PX = 5;
const IN_RANGE_FILL = 'rgba(52, 211, 153, 0.06)';
const HIDDEN_SERIES_STROKE = 'rgba(0, 0, 0, 0)';
const LINE_COLOR_THRESHOLDS = [LOW_THRESHOLD_MGDL, HIGH_THRESHOLD_MGDL] as const;
const chartFrameStyle = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0
} as const;
const chartHeaderStyle = {
  display: 'flex',
  height: 28,
  flexShrink: 0,
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  paddingInline: 4,
  color: 'var(--text-soft)',
  fontSize: 12
} as const;
const chartBodyStyle = {
  flex: 1,
  minHeight: 0,
  minWidth: 0
} as const;
const emptyStateStyle = {
  display: 'flex',
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  border: '1px solid rgb(255 255 255 / 0.1)',
  background: 'rgb(0 0 0 / 0.2)',
  color: 'var(--text-muted)',
  fontSize: 14
} as const;

interface LinePoint {
  x: number;
  y: number;
  valueMgDl: number;
}

interface LineSegment {
  from: LinePoint;
  to: LinePoint;
  valueMgDl: number;
}

function getGlucoseColor(valueMgDl: number, alpha = 1): string {
  if (valueMgDl < LOW_THRESHOLD_MGDL) {
    return `rgba(251, 113, 133, ${alpha})`;
  }

  if (valueMgDl > HIGH_THRESHOLD_MGDL) {
    return `rgba(168, 85, 247, ${alpha})`;
  }

  return `rgba(52, 211, 153, ${alpha})`;
}

function interpolateLinePoint(from: LinePoint, to: LinePoint, t: number): LinePoint {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    valueMgDl: from.valueMgDl + (to.valueMgDl - from.valueMgDl) * t
  };
}

function getLineSegments(points: LinePoint[]): LineSegment[] {
  const segments: LineSegment[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];

    if (
      !Number.isFinite(from.x)
      || !Number.isFinite(from.y)
      || !Number.isFinite(from.valueMgDl)
      || !Number.isFinite(to.x)
      || !Number.isFinite(to.y)
      || !Number.isFinite(to.valueMgDl)
    ) {
      continue;
    }

    const valueDelta = to.valueMgDl - from.valueMgDl;
    const crossings = valueDelta === 0
      ? []
      : LINE_COLOR_THRESHOLDS
        .filter((threshold) => (
          (from.valueMgDl < threshold && to.valueMgDl > threshold)
          || (from.valueMgDl > threshold && to.valueMgDl < threshold)
        ))
        .map((threshold) => (threshold - from.valueMgDl) / valueDelta)
        .filter((t) => t > 0 && t < 1)
        .sort((a, b) => a - b);

    const breakpoints = [0, ...crossings, 1];

    for (let breakpointIndex = 0; breakpointIndex < breakpoints.length - 1; breakpointIndex += 1) {
      const fromT = breakpoints[breakpointIndex];
      const toT = breakpoints[breakpointIndex + 1];
      const midpointT = fromT + (toT - fromT) / 2;

      segments.push({
        from: interpolateLinePoint(from, to, fromT),
        to: interpolateLinePoint(from, to, toT),
        valueMgDl: interpolateLinePoint(from, to, midpointT).valueMgDl
      });
    }
  }

  return segments;
}

function drawThresholdLines(chart: uPlot): void {
  const ctx = chart.ctx;
  const left = chart.bbox.left;
  const right = chart.bbox.left + chart.bbox.width;

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;

  for (const threshold of [LOW_THRESHOLD_MGDL, HIGH_THRESHOLD_MGDL]) {
    const y = chart.valToPos(threshold, 'y', true);
    ctx.strokeStyle = threshold === LOW_THRESHOLD_MGDL
      ? 'rgba(251, 113, 133, 0.45)'
      : 'rgba(168, 85, 247, 0.45)';
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawInRangeArea(chart: uPlot): void {
  const yLow = chart.valToPos(LOW_THRESHOLD_MGDL, 'y', true);
  const yHigh = chart.valToPos(HIGH_THRESHOLD_MGDL, 'y', true);
  const top = Math.min(yHigh, yLow);
  const height = Math.abs(yLow - yHigh);

  if (height <= 0) {
    return;
  }

  chart.ctx.save();
  chart.ctx.fillStyle = IN_RANGE_FILL;
  chart.ctx.fillRect(chart.bbox.left, top, chart.bbox.width, height);
  chart.ctx.restore();
}

function drawLineSegments(chart: uPlot, segments: LineSegment[], width: number): void {
  const ctx = chart.ctx;
  const pixelRatio = window.devicePixelRatio || 1;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width * pixelRatio;

  for (const segment of segments) {
    const fromX = chart.valToPos(segment.from.x, 'x', true);
    const fromY = chart.valToPos(segment.from.y, 'y', true);
    const toX = chart.valToPos(segment.to.x, 'x', true);
    const toY = chart.valToPos(segment.to.y, 'y', true);

    if (
      !Number.isFinite(fromX)
      || !Number.isFinite(fromY)
      || !Number.isFinite(toX)
      || !Number.isFinite(toY)
    ) {
      continue;
    }

    ctx.strokeStyle = getGlucoseColor(segment.valueMgDl);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawReadingPoints(chart: uPlot, points: ChartPoint[], mode: 'all' | 'markers'): void {
  const ctx = chart.ctx;
  const pixelRatio = window.devicePixelRatio || 1;
  const xs = chart.data[0];
  const ys = chart.data[1];

  ctx.save();

  for (let index = 0; index < xs.length; index += 1) {
    const yValue = ys[index];
    if (yValue == null) {
      continue;
    }

    if (mode === 'markers' && index !== xs.length - 1) {
      continue;
    }

    const x = chart.valToPos(xs[index], 'x', true);
    const y = chart.valToPos(yValue, 'y', true);
    const point = points[index];

    ctx.fillStyle = getGlucoseColor(point?.valueMgDl ?? yValue);
    ctx.beginPath();
    ctx.arc(x, y, POINT_RADIUS * pixelRatio, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function toChartPoint(reading: SensorGlucose): ChartPoint | null {
  const timestamp = reading.timestamp ?? (reading.mills ? new Date(reading.mills).toISOString() : null);
  const valueMgDl = reading.mgdl;

  if (!timestamp || typeof valueMgDl !== 'number') {
    return null;
  }

  return {
    readingId: reading.id,
    timestamp,
    valueMgDl
  };
}

function getLocalMidnightSplits(minSec: number, maxSec: number): number[] {
  if (!Number.isFinite(minSec) || !Number.isFinite(maxSec) || maxSec <= minSec) {
    return [];
  }

  const splits: number[] = [];
  const cursor = new Date(minSec * 1000);
  cursor.setHours(0, 0, 0, 0);

  if (cursor.getTime() / 1000 < minSec) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor.getTime() / 1000 <= maxSec) {
    splits.push(cursor.getTime() / 1000);
    cursor.setDate(cursor.getDate() + 1);
  }

  return splits;
}

function resolveRenderMode(dataLength: number, width: number): 'line' | 'points' {
  if (dataLength > Math.max(1, Math.floor(width / AUTO_LINE_MIN_POINT_SPACING_PX))) {
    return 'line';
  }

  return 'points';
}

export function UplotGlucoseChart({
  ariaLabel = 'Glucose readings chart',
  height = 280,
  readings
}: UplotGlucoseChartProps): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<uPlot | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const points = useMemo(
    () => readings
      .map(toChartPoint)
      .filter((point): point is ChartPoint => point !== null)
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()),
    [readings]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const updateDimensions = () => {
      const nextWidth = Math.floor(element.clientWidth);
      const nextHeight = Math.floor(element.clientHeight);
      if (nextWidth > 0 && nextHeight > 0) {
        setDimensions((current) => (
          current.width === nextWidth && current.height === nextHeight
            ? current
            : { width: nextWidth, height: nextHeight }
        ));
      }
    };

    updateDimensions();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || dimensions.width <= 0 || dimensions.height <= 0 || points.length === 0) {
      return undefined;
    }

    const xs = points.map((point) => new Date(point.timestamp).getTime() / 1000);
    const ys = points.map((point) => point.valueMgDl);
    const fromSec = Math.min(...xs);
    const toSec = Math.max(...xs);
    const maxReading = Math.max(...ys);
    const yMax = Math.max(240, Math.ceil((maxReading + 20) / 10) * 10);
    const lineSegments = getLineSegments(points.map((point, index) => ({
      x: xs[index],
      y: ys[index],
      valueMgDl: point.valueMgDl
    })));
    const effectiveRenderMode = resolveRenderMode(points.length, dimensions.width);

    const options: uPlot.Options = {
      width: dimensions.width,
      height: dimensions.height,
      legend: { show: false },
      cursor: {
        y: false,
        drag: {
          x: true,
          y: false,
          setScale: false
        },
        points: { show: false }
      },
      scales: {
        x: {
          time: true,
          range: points.length === 1 ? [fromSec - 1800, toSec + 1800] : [fromSec, toSec]
        },
        y: {
          range: [Y_MIN, yMax]
        }
      },
      axes: [
        {
          stroke: 'rgba(148, 163, 184, 0.9)',
          grid: { stroke: 'rgba(148, 163, 184, 0.12)' },
          ticks: { stroke: 'rgba(148, 163, 184, 0.12)' },
          splits: (_chart, _axisIndex, scaleMin, scaleMax) => getLocalMidnightSplits(scaleMin, scaleMax),
          values: (_chart, values) => values.map((value) => new Date(value * 1000).toLocaleDateString([], {
            month: 'short',
            day: 'numeric'
          }))
        },
        {
          stroke: 'rgba(148, 163, 184, 0.9)',
          grid: { stroke: 'rgba(148, 163, 184, 0.12)' },
          ticks: { stroke: 'rgba(148, 163, 184, 0.12)' },
          values: (_chart, values) => values.map((value) => String(Math.round(value)))
        }
      ],
      series: [
        {},
        {
          stroke: HIDDEN_SERIES_STROKE,
          width: effectiveRenderMode === 'line' ? 1.75 : 1.25,
          points: { show: false },
          spanGaps: false
        }
      ],
      hooks: {
        draw: [
          (chart) => {
            drawInRangeArea(chart);
            drawLineSegments(chart, lineSegments, effectiveRenderMode === 'line' ? 1.75 : 1.25);
            drawThresholdLines(chart);
            drawReadingPoints(chart, points, effectiveRenderMode === 'points' ? 'all' : 'markers');
          }
        ]
      }
    };

    const chart = new uPlot(options, [xs, ys], element);
    chartRef.current = chart;

    return () => {
      chartRef.current = null;
      chart.destroy();
    };
  }, [dimensions.height, dimensions.width, points]);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{ ...chartFrameStyle, height }}
    >
      <div style={chartHeaderStyle}>
        <span>mg/dL</span>
        <span>{points.length} points</span>
      </div>
      <div
        ref={containerRef}
        aria-hidden
        style={chartBodyStyle}
      >
        {points.length === 0 ? (
          <div style={emptyStateStyle}>
            No chart data
          </div>
        ) : null}
      </div>
    </div>
  );
}
