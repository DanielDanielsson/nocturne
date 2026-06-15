'use client';

import useSWR from 'swr';
import { Button } from '@ui/base/Button';
import { GlucoseSparkline } from '@ui/components/GlucoseSparkline';
import { UplotGlucoseChart } from '@ui/components/UplotGlucoseChart';
import type {
  DashboardChartResponse,
  GlucoseReadingsErrorResponse,
  SensorGlucose
} from '@/lib/nocturne/types';

async function fetchJson(url: string): Promise<DashboardChartResponse> {
  const response = await fetch(url, {
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = (await response.json()) as GlucoseReadingsErrorResponse;
    throw new Error(payload.error.message);
  }

  return response.json() as Promise<DashboardChartResponse>;
}

function formatTimestamp(reading: SensorGlucose): string {
  if (!reading.timestamp) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  }).format(new Date(reading.timestamp));
}

function formatValue(reading: SensorGlucose): string {
  if (typeof reading.mgdl !== 'number') {
    return 'No value';
  }

  return `${Math.round(reading.mgdl)} mg/dL`;
}

export function GlucoseReadingsPoc() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/nocturne/dashboard?hours=12&intervalMinutes=5',
    fetchJson,
    {
      refreshInterval: 30_000
    }
  );
  const readings = data?.readings ?? [];
  const latest = readings[0];

  return (
    <main className="shell">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase text-[var(--accent)]">
              React POC
            </p>
            <h1 className="text-4xl font-semibold">Glucose dashboard</h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--text-muted)]">
              Dashboard glucose readings loaded through the Nocturne chart data endpoint.
            </p>
          </div>
          <Button onClick={() => void mutate()} disabled={isLoading}>
            Refresh
          </Button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="surface rounded-lg p-6">
            <p className="text-sm text-[var(--text-muted)]">Latest reading</p>
            <div className="mt-6">
              {isLoading ? (
                <p className="text-3xl font-semibold">Loading</p>
              ) : error ? (
                <div>
                  <p className="text-2xl font-semibold text-[var(--danger)]">Unavailable</p>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">{error.message}</p>
                </div>
              ) : latest ? (
                <div>
                  <p className="text-6xl font-semibold">{formatValue(latest)}</p>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {formatTimestamp(latest)}
                    {latest.direction ? `, ${latest.direction}` : ''}
                  </p>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  {latest.dataSource ?? latest.device ?? 'Dashboard chart data'}
                </p>
                </div>
              ) : (
                <p className="text-2xl font-semibold">No readings yet</p>
              )}
            </div>
          </div>

          <div className="surface rounded-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Recent trend</p>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  {readings.length} readings from {data?.source ?? 'Nocturne'}
                </p>
              </div>
            </div>
            <GlucoseSparkline readings={readings} />
          </div>
        </section>

        <section className="surface rounded-lg p-6">
          <div className="mb-4 flex flex-col gap-1">
            <p className="text-sm text-[var(--text-muted)]">uPlot glucose chart</p>
            <p className="text-sm text-[var(--text-soft)]">
              Fed by the same dashboard data path as the Svelte frontend.
            </p>
          </div>
          <UplotGlucoseChart readings={readings} />
        </section>

        <section className="surface overflow-hidden rounded-lg">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold">Recent readings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="text-[var(--text-soft)]">
                <tr>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium">Glucose</th>
                  <th className="px-6 py-3 font-medium">Direction</th>
                  <th className="px-6 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {readings.slice(0, 12).map((reading, index) => (
                  <tr key={reading.id ?? `${reading.timestamp}-${index}`} className="border-t border-white/8">
                    <td className="px-6 py-3 text-[var(--text-muted)]">{formatTimestamp(reading)}</td>
                    <td className="px-6 py-3 font-medium">{formatValue(reading)}</td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">{reading.direction ?? 'Unknown'}</td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">
                      {reading.dataSource ?? reading.device ?? 'Unknown'}
                    </td>
                  </tr>
                ))}
                {!isLoading && readings.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-[var(--text-muted)]" colSpan={4}>
                      No glucose readings returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
