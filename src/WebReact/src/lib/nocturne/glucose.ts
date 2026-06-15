import { nocturneApiFetch, nocturneApiJson } from './client';
import type { GlucoseReadingsResponse, PaginatedSensorGlucoseResponse } from './types';

export async function fetchRecentSensorGlucose(limit: number): Promise<Response> {
  return nocturneApiFetch('/api/v4/glucose/sensor', {
    limit,
    offset: 0,
    sort: 'timestamp_desc'
  });
}

export async function parseSensorGlucoseResponse(response: Response): Promise<GlucoseReadingsResponse> {
  const payload = (await response.json()) as PaginatedSensorGlucoseResponse;
  return {
    readings: payload.data ?? [],
    total: payload.pagination?.total ?? null,
    source: 'api/v4/glucose/sensor'
  };
}

export async function getRecentSensorGlucose(limit: number): Promise<GlucoseReadingsResponse> {
  const payload = await nocturneApiJson<PaginatedSensorGlucoseResponse>('/api/v4/glucose/sensor', {
    limit,
    offset: 0,
    sort: 'timestamp_desc'
  });

  return {
    readings: payload.data ?? [],
    total: payload.pagination?.total ?? null,
    source: 'api/v4/glucose/sensor'
  };
}
