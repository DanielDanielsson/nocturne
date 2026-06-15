import type {
  DashboardChartResponse,
  GlucoseReadingsResponse,
  MultiPeriodStatistics
} from './types';

export interface DashboardApiState {
  chart: DashboardChartResponse | null;
  sensor: GlucoseReadingsResponse | null;
  stats: MultiPeriodStatistics | null;
  chartError: string | null;
  sensorError: string | null;
  statsError: string | null;
}
