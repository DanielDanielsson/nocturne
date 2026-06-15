import { DashboardPage } from '@ui/compositions/Dashboard';
import { getDashboardChart } from '@/lib/nocturne/dashboard';
import { getRecentSensorGlucose } from '@/lib/nocturne/glucose';
import { getMultiPeriodStatistics } from '@/lib/nocturne/statistics';
import type { DashboardApiState } from '@/lib/nocturne/dashboard-state';

export const dynamic = 'force-dynamic';

async function getInitialDashboardData(): Promise<DashboardApiState | undefined> {
  const [chartResult, sensorResult, statsResult] = await Promise.all([
    getDashboardChart(12, 5)
      .then((chart) => ({ chart }))
      .catch((error: unknown) => ({ error })),
    getRecentSensorGlucose(156)
      .then((sensor) => ({ sensor }))
      .catch((error: unknown) => ({ error })),
    getMultiPeriodStatistics()
      .then((stats) => ({ stats }))
      .catch((error: unknown) => ({ error }))
  ]);

  const chart = 'chart' in chartResult ? chartResult.chart : null;
  const sensor = 'sensor' in sensorResult ? sensorResult.sensor : null;

  if (!chart && !sensor) {
    return undefined;
  }

  const chartError = 'error' in chartResult && chartResult.error instanceof Error
    ? chartResult.error.message
    : null;
  const sensorError = 'error' in sensorResult && sensorResult.error instanceof Error
    ? sensorResult.error.message
    : null;
  const statsError = 'error' in statsResult && statsResult.error instanceof Error
    ? statsResult.error.message
    : null;

  return {
    chart,
    sensor,
    stats: 'stats' in statsResult ? statsResult.stats : null,
    chartError,
    sensorError,
    statsError
  };
}

export default async function Page() {
  const initialData = await getInitialDashboardData();

  return <DashboardPage initialData={initialData} />;
}
