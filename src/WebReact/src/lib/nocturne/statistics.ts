import { nocturneApiJson } from './client';
import type { MultiPeriodStatistics } from './types';

export async function getMultiPeriodStatistics(): Promise<MultiPeriodStatistics> {
  return nocturneApiJson<MultiPeriodStatistics>('/api/v4/Statistics/periods');
}
