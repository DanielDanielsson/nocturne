import { nocturneApiJson } from './client';
import type { DashboardChartData, DashboardChartResponse, SensorGlucose } from './types';

const DEFAULT_HOURS = 12;
const DEFAULT_INTERVAL_MINUTES = 5;

function clampInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), min), max);
}

export function normalizeDashboardWindow(hours: number, intervalMinutes: number) {
  const normalizedHours = clampInteger(hours, 1, 72, DEFAULT_HOURS);
  const normalizedIntervalMinutes = clampInteger(intervalMinutes, 1, 60, DEFAULT_INTERVAL_MINUTES);
  const intervalMs = normalizedIntervalMinutes * 60 * 1000;
  const endTime = Math.ceil(Date.now() / intervalMs) * intervalMs;
  const startTime = endTime - normalizedHours * 60 * 60 * 1000;

  return {
    startTime,
    endTime,
    intervalMinutes: normalizedIntervalMinutes
  };
}

function mapChartDataToReadings(chartData: DashboardChartData): SensorGlucose[] {
  return (chartData.glucoseData ?? [])
    .map((point): SensorGlucose | null => {
      if (point.time == null || typeof point.sgv !== 'number') {
        return null;
      }

      return {
        id: `chart-${point.time}`,
        timestamp: new Date(point.time).toISOString(),
        mills: point.time,
        mgdl: point.sgv,
        direction: point.direction,
        dataSource: point.dataSource
      };
    })
    .filter((reading): reading is SensorGlucose => reading !== null)
    .sort((left, right) => (right.mills ?? 0) - (left.mills ?? 0));
}

export async function getDashboardChart(hours = DEFAULT_HOURS, intervalMinutes = DEFAULT_INTERVAL_MINUTES): Promise<DashboardChartResponse> {
  const window = normalizeDashboardWindow(hours, intervalMinutes);
  const chartData = await nocturneApiJson<DashboardChartData>('/api/v4/ChartData/dashboard', window);

  return {
    chartData,
    readings: mapChartDataToReadings(chartData),
    window,
    source: 'api/v4/ChartData/dashboard'
  };
}
