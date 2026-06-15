import type {
  DashboardChartData as ApiDashboardChartData,
  MultiPeriodStatistics as ApiMultiPeriodStatistics,
  PaginatedResponseOfSensorGlucose as ApiPaginatedSensorGlucoseResponse,
  SensorGlucose as ApiSensorGlucose
} from '../../../../Web/packages/app/src/lib/api/generated/nocturne-api-client';

export type SensorGlucose = Omit<
  ApiSensorGlucose,
  'timestamp' | 'createdAt' | 'modifiedAt' | 'direction' | 'trend'
> & {
  timestamp?: string;
  createdAt?: string;
  modifiedAt?: string;
  direction?: string;
  trend?: string;
};

export type PaginatedSensorGlucoseResponse = Omit<ApiPaginatedSensorGlucoseResponse, 'data'> & {
  data?: SensorGlucose[];
};

export type DashboardChartData = ApiDashboardChartData;
export type MultiPeriodStatistics = ApiMultiPeriodStatistics;

export interface GlucoseReadingsResponse {
  readings: SensorGlucose[];
  total: number | null;
  source: string;
}

export interface DashboardChartResponse {
  chartData: DashboardChartData;
  readings: SensorGlucose[];
  window: {
    startTime: number;
    endTime: number;
    intervalMinutes: number;
  };
  source: string;
}

export interface GlucoseReadingsErrorResponse {
  error: {
    code: string;
    message: string;
    status: number;
  };
}
