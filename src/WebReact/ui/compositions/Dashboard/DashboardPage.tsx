'use client';

import { useEffect, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { UplotGlucoseChart } from '@ui/components/UplotGlucoseChart';
import type {
  DashboardChartData,
  DashboardChartResponse,
  GlucoseReadingsResponse,
  GlucoseReadingsErrorResponse,
  MultiPeriodStatistics,
  SensorGlucose
} from '@/lib/nocturne/types';
import type { DashboardApiState } from '@/lib/nocturne/dashboard-state';

const DEFAULT_HOURS = 12;
const DEFAULT_READING_INTERVAL_MINUTES = 5;

interface DashboardFetchError extends Error {
  status?: number;
}

interface RecentTreatmentRow {
  id: string;
  time: number;
  category: string;
  label: string;
  detail?: string;
  source?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    const payload = (await response.json()) as GlucoseReadingsErrorResponse;
    const error = new Error(payload.error.message) as DashboardFetchError;
    error.status = payload.error.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

async function fetchDashboard(hours: number): Promise<DashboardApiState> {
  const sensorLimit = Math.min(
    288,
    Math.max(12, Math.ceil((hours * 60) / DEFAULT_READING_INTERVAL_MINUTES) + 12)
  );

  const [chartResult, sensorResult, statsResult] = await Promise.all([
    fetchJson<DashboardChartResponse>(`/api/nocturne/dashboard?hours=${hours}&intervalMinutes=5`)
      .then((chart) => ({ chart }))
      .catch((error: unknown) => ({ error })),
    fetchJson<GlucoseReadingsResponse>(`/api/nocturne/glucose/sensor?limit=${sensorLimit}`)
      .then((sensor) => ({ sensor }))
      .catch((error: unknown) => ({ error })),
    fetchJson<MultiPeriodStatistics>('/api/nocturne/statistics/periods')
      .then((stats) => ({ stats }))
      .catch((error: unknown) => ({ error }))
  ]);

  const chart = 'chart' in chartResult ? chartResult.chart : null;
  const sensor = 'sensor' in sensorResult ? sensorResult.sensor : null;
  const chartError = 'error' in chartResult ? chartResult.error : null;
  const sensorError = 'error' in sensorResult ? sensorResult.error : null;
  const statsError = 'error' in statsResult ? statsResult.error : null;

  if (!chart && !sensor) {
    const failure = chartError ?? sensorError;
    throw failure instanceof Error ? failure : new Error('Nocturne glucose data is unavailable');
  }

  return {
    chart,
    sensor,
    stats: 'stats' in statsResult ? statsResult.stats : null,
    chartError: chartError instanceof Error
      ? chartError.message
      : null,
    sensorError: sensorError instanceof Error
      ? sensorError.message
      : null,
    statsError: statsError instanceof Error
      ? statsError.message
      : null
  };
}

function formatGlucose(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return Math.round(value).toString();
}

function formatDelta(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '--';
  }

  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function formatUnits(value: number | null | undefined, suffix: string, fractionDigits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return `${value.toFixed(fractionDigits)}${suffix}`;
}

function formatIntegerUnits(value: number | null | undefined, suffix: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return `${Math.round(value)}${suffix}`;
}

function formatTime(mills: number | null | undefined): string {
  if (typeof mills !== 'number' || !Number.isFinite(mills)) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(mills));
}

function formatDateTime(mills: number | null | undefined): string {
  if (typeof mills !== 'number' || !Number.isFinite(mills)) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(mills));
}

function formatTimeAgo(mills: number | null | undefined, now: number): string {
  if (typeof mills !== 'number' || !Number.isFinite(mills)) {
    return 'Never';
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - mills) / 1000));

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  return `${Math.floor(elapsedHours / 24)}d ago`;
}

function readingMills(reading: SensorGlucose | undefined): number | null {
  if (!reading) {
    return null;
  }

  if (typeof reading.mills === 'number') {
    return reading.mills;
  }

  if (reading.timestamp) {
    const parsed = new Date(reading.timestamp).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function sortReadings(readings: SensorGlucose[]): SensorGlucose[] {
  return [...readings].sort((left, right) => (readingMills(right) ?? 0) - (readingMills(left) ?? 0));
}

function mergeReadings(chartReadings: SensorGlucose[], sensorReadings: SensorGlucose[]): SensorGlucose[] {
  const byKey = new Map<string, SensorGlucose>();

  for (const reading of [...chartReadings, ...sensorReadings]) {
    const mills = readingMills(reading);
    const key = typeof mills === 'number'
      ? String(mills)
      : reading.id ?? reading.legacyId ?? reading.timestamp ?? '';

    if (!key) {
      continue;
    }

    byKey.set(key, reading);
  }

  return sortReadings([...byKey.values()]);
}

function filterReadingsForWindow(
  readings: SensorGlucose[],
  startTime: number,
  endTime: number
): SensorGlucose[] {
  return readings.filter((reading) => {
    const mills = readingMills(reading);
    return typeof mills === 'number' && mills >= startTime && mills <= endTime;
  });
}

function latestValue(points: Array<{ timestamp?: number; value?: number }> | undefined): number | null {
  const latest = [...(points ?? [])]
    .filter((point) => typeof point.timestamp === 'number' && typeof point.value === 'number')
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];

  return latest?.value ?? null;
}

function latestBasalRate(chartData: DashboardChartData | undefined): number | null {
  const latest = [...(chartData?.basalSeries ?? [])]
    .filter((point) => typeof point.timestamp === 'number' && typeof point.rate === 'number')
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0))[0];

  return latest?.rate ?? chartData?.defaultBasalRate ?? null;
}

function currentPumpMode(chartData: DashboardChartData | undefined): string {
  const openSpan = [...(chartData?.pumpModeSpans ?? [])]
    .sort((left, right) => (right.startMills ?? 0) - (left.startMills ?? 0))
    .find((span) => span.endMills == null);

  return openSpan?.state ?? 'Unknown';
}

function getBgDelta(readings: SensorGlucose[]): number | null {
  const latest = readings[0]?.mgdl;
  const previous = readings[1]?.mgdl;

  if (typeof latest !== 'number' || typeof previous !== 'number') {
    return null;
  }

  return latest - previous;
}

function makeTreatmentRows(chartData: DashboardChartData | undefined): RecentTreatmentRow[] {
  const rows: RecentTreatmentRow[] = [];

  for (const marker of chartData?.bolusMarkers ?? []) {
    if (typeof marker.time !== 'number') {
      continue;
    }

    rows.push({
      id: marker.treatmentId ?? `bolus-${marker.time}`,
      time: marker.time,
      category: 'Bolus',
      label: marker.insulin ? `${marker.insulin}u insulin` : 'Bolus',
      detail: marker.bolusType,
      source: marker.dataSource
    });
  }

  for (const marker of chartData?.carbMarkers ?? []) {
    if (typeof marker.time !== 'number') {
      continue;
    }

    rows.push({
      id: marker.treatmentId ?? `carbs-${marker.time}`,
      time: marker.time,
      category: 'Carbs',
      label: marker.carbs ? `${marker.carbs}g carbs` : 'Carbs',
      detail: marker.label,
      source: marker.dataSource
    });
  }

  for (const marker of chartData?.bgCheckMarkers ?? []) {
    if (typeof marker.time !== 'number') {
      continue;
    }

    rows.push({
      id: marker.treatmentId ?? `bg-check-${marker.time}`,
      time: marker.time,
      category: 'BG Check',
      label: marker.glucose ? `${Math.round(marker.glucose)} mg/dL` : 'BG Check',
      detail: marker.glucoseType
    });
  }

  for (const marker of chartData?.deviceEventMarkers ?? []) {
    if (typeof marker.time !== 'number') {
      continue;
    }

    rows.push({
      id: marker.treatmentId ?? `device-${marker.time}`,
      time: marker.time,
      category: 'Device',
      label: marker.eventType ?? 'Device Event',
      detail: marker.notes
    });
  }

  for (const marker of chartData?.basalInjectionMarkers ?? []) {
    if (typeof marker.time !== 'number') {
      continue;
    }

    rows.push({
      id: marker.id ?? `basal-injection-${marker.time}`,
      time: marker.time,
      category: 'Basal',
      label: marker.units ? `${marker.units}u basal` : 'Long acting injection',
      detail: marker.insulinName
    });
  }

  return rows.sort((left, right) => right.time - left.time).slice(0, 5);
}

function WidgetCard({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="dashboard-widget-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-status-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CurrentBgHeader({
  chartData,
  latest,
  now,
  readingCount,
  readings,
  source,
  totalReadings
}: {
  chartData: DashboardChartData | undefined;
  latest: SensorGlucose | undefined;
  now: number;
  readingCount: number;
  readings: SensorGlucose[];
  source: string;
  totalReadings: number | null;
}) {
  const latestTime = readingMills(latest);
  const bgDelta = getBgDelta(readings);
  const iob = latestValue(chartData?.iobSeries);
  const cob = latestValue(chartData?.cobSeries);
  const basalRate = latestBasalRate(chartData);
  const pumpMode = currentPumpMode(chartData);
  const currentTime = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(now));

  return (
    <section className="dashboard-current-bg">
      <h1>Nocturne</h1>
      <div className="dashboard-current-bg-content">
        <div className="dashboard-status-row" aria-label="Current therapy status">
          <StatusPill label="COB" value={formatIntegerUnits(cob, 'g')} />
          <StatusPill label="Basal" value={formatUnits(basalRate, 'U/h')} />
          <StatusPill label="IOB" value={formatUnits(iob, 'U')} />
          <StatusPill label="Loop" value={pumpMode} />
        </div>

        <div className="dashboard-current-values">
          <div className="dashboard-clock">
            <span>Time</span>
            <strong>{currentTime}</strong>
          </div>
          <div className="dashboard-bg-value">
            <span>{formatGlucose(latest?.mgdl)}</span>
            <small>mg/dL</small>
          </div>
          <div className="dashboard-bg-delta">
            <strong>{formatDelta(bgDelta)}</strong>
            <span>{latest?.direction ?? formatTimeAgo(latestTime, now)}</span>
          </div>
        </div>
      </div>
      <div className="dashboard-feed-meta" aria-label="Current glucose data source">
        <span>Latest {formatDateTime(latestTime)}</span>
        <span>Source {source}</span>
        <span>
          {readingCount.toLocaleString()} shown
          {typeof totalReadings === 'number' ? ` of ${totalReadings.toLocaleString()}` : ''}
        </span>
      </div>
    </section>
  );
}

function BgDeltaWidget({
  latest,
  now,
  readings
}: {
  latest: SensorGlucose | undefined;
  now: number;
  readings: SensorGlucose[];
}) {
  const bgDelta = getBgDelta(readings);
  const latestTime = readingMills(latest);

  return (
    <WidgetCard title="BG Delta">
      <div className="dashboard-widget-primary">{formatDelta(bgDelta)}</div>
      <p>mg/dL</p>
      <div className="dashboard-widget-footer">
        <span>{formatTimeAgo(latestTime, now)}</span>
        <span>{formatTime(latestTime)}</span>
      </div>
    </WidgetCard>
  );
}

function TimeInRangeWidget({ stats }: { stats: MultiPeriodStatistics | null }) {
  const percentages = stats?.lastDay?.analytics?.timeInRange?.percentages;
  const inRange = percentages?.target;
  const low = (percentages?.veryLow ?? 0) + (percentages?.low ?? 0);
  const high = (percentages?.high ?? 0) + (percentages?.veryHigh ?? 0);
  const totalReadings = stats?.lastDay?.entryCount ?? 0;

  return (
    <WidgetCard title="Time in Range">
      {typeof inRange === 'number' ? (
        <>
          <div className="dashboard-tir-bar" aria-label="Time in range distribution">
            <span style={{ width: `${Math.max(0, Math.min(100, low))}%` }} />
            <strong style={{ width: `${Math.max(0, Math.min(100, inRange))}%` }} />
            <em style={{ width: `${Math.max(0, Math.min(100, high))}%` }} />
          </div>
          <div className="dashboard-widget-primary dashboard-widget-primary-success">
            {inRange.toFixed(0)}%
          </div>
          <div className="dashboard-widget-footer">
            <span>Low {low.toFixed(0)}%</span>
            <span>{totalReadings.toLocaleString()} readings</span>
            <span>High {high.toFixed(0)}%</span>
          </div>
        </>
      ) : (
        <p>No data available</p>
      )}
    </WidgetCard>
  );
}

function TddWidget({ stats }: { stats: MultiPeriodStatistics | null }) {
  const delivery = stats?.lastDay?.insulinDelivery;
  const total = delivery?.tdd ?? delivery?.totalInsulin;
  const bolus = delivery?.totalBolus ?? 0;
  const auto = delivery?.microBolusInsulin ?? 0;
  const basal = Math.max(0, (delivery?.totalBasal ?? 0) - auto);
  const carbs = stats?.lastDay?.treatmentSummary?.totals?.food?.carbs ?? delivery?.totalCarbs ?? 0;

  return (
    <WidgetCard title="Total Daily Dose">
      {typeof total === 'number' || carbs > 0 ? (
        <>
          <div className="dashboard-widget-primary">
            {formatUnits(total ?? bolus + basal + auto, 'U')}
          </div>
          <div className="dashboard-dose-grid">
            <span>Bolus {formatUnits(bolus, 'U')}</span>
            <span>Auto {formatUnits(auto, 'U')}</span>
            <span>Basal {formatUnits(basal, 'U')}</span>
          </div>
          <div className="dashboard-widget-footer">
            <span>Carbs {formatIntegerUnits(carbs, 'g')}</span>
          </div>
        </>
      ) : (
        <p>No data today</p>
      )}
    </WidgetCard>
  );
}

function ChartSummary({
  chartData,
  glucoseCount
}: {
  chartData: DashboardChartData | undefined;
  glucoseCount: number;
}) {
  const summaries = [
    ['Glucose', glucoseCount],
    ['Basal', chartData?.basalSeries?.length ?? 0],
    ['IOB', chartData?.iobSeries?.length ?? 0],
    ['COB', chartData?.cobSeries?.length ?? 0],
    ['Bolus', chartData?.bolusMarkers?.length ?? 0],
    ['Carbs', chartData?.carbMarkers?.length ?? 0],
    ['BG checks', chartData?.bgCheckMarkers?.length ?? 0],
    ['Events', chartData?.deviceEventMarkers?.length ?? 0],
    ['Trackers', chartData?.trackerMarkers?.length ?? 0],
    ['Heart rate', chartData?.heartRateSeries?.length ?? 0],
    ['Steps', chartData?.stepSeries?.length ?? 0]
  ];

  return (
    <div className="dashboard-chart-summary">
      {summaries.map(([label, value]) => (
        <span key={label}>
          {label}
          <strong>{value}</strong>
        </span>
      ))}
    </div>
  );
}

function RecentGlucoseEntries({
  readings
}: {
  readings: SensorGlucose[];
}) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h2>Recent Entries</h2>
      </div>
      <div className="dashboard-list">
        {readings.slice(0, 5).map((reading, index) => {
          const previous = readings[index + 1];
          const delta = typeof reading.mgdl === 'number' && typeof previous?.mgdl === 'number'
            ? reading.mgdl - previous.mgdl
            : null;

          return (
            <div className="dashboard-list-row" key={reading.id ?? `${reading.timestamp}-${index}`}>
              <div>
                <strong>{formatGlucose(reading.mgdl)} mg/dL</strong>
                <span>{formatDateTime(readingMills(reading))}</span>
              </div>
              <div>
                <strong>{formatDelta(delta)}</strong>
                <span>{reading.direction ?? 'Unknown'}</span>
              </div>
            </div>
          );
        })}
        {readings.length === 0 ? (
          <p className="dashboard-empty-state">No recent entries</p>
        ) : null}
      </div>
    </section>
  );
}

function RecentTreatments({ chartData }: { chartData: DashboardChartData | undefined }) {
  const rows = makeTreatmentRows(chartData);

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h2>Recent Treatments</h2>
        <p>Last chart window</p>
      </div>
      <div className="dashboard-list">
        {rows.map((row) => (
          <div className="dashboard-list-row" key={row.id}>
            <div>
              <strong>{row.label}</strong>
              <span>
                {row.category}
                {row.detail ? `, ${row.detail}` : ''}
              </span>
            </div>
            <div>
              <strong>{formatTime(row.time)}</strong>
              <span>{row.source ?? ''}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="dashboard-empty-state">No recent treatments</p>
        ) : null}
      </div>
    </section>
  );
}

export function DashboardPage({ initialData }: { initialData?: DashboardApiState }) {
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [now, setNow] = useState(() => Date.now());
  const { data, error, isLoading, mutate } = useSWR(
    ['dashboard', hours],
    () => fetchDashboard(hours),
    {
      fallbackData: hours === DEFAULT_HOURS ? initialData : undefined,
      refreshInterval: 30_000
    }
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const chartReadings = data?.chart?.readings ?? [];
  const sensorReadings = data?.sensor?.readings ?? [];
  const chartWindow = data?.chart?.window;
  const windowEnd = chartWindow?.endTime ?? now;
  const windowStart = chartWindow?.startTime ?? windowEnd - hours * 60 * 60 * 1000;
  const readings = filterReadingsForWindow(
    mergeReadings(chartReadings, sensorReadings),
    windowStart,
    windowEnd
  );
  const latest = readings[0];
  const chartData = data?.chart?.chartData;
  const stats = data?.stats ?? null;
  const source = data?.sensor?.source ?? data?.chart?.source ?? 'Nocturne';
  const totalReadings = data?.sensor?.total ?? null;
  const title = `${hours} hour dashboard window`;
  const dataWarnings = [
    data?.chartError ? `Dashboard details unavailable: ${data.chartError}` : null,
    data?.sensorError ? `Sensor readings unavailable: ${data.sensorError}` : null,
    data?.statsError ? `Statistics unavailable: ${data.statsError}` : null
  ].filter((message): message is string => Boolean(message));

  return (
    <main className="dashboard-page">
      <div className="dashboard-page-inner">
        <CurrentBgHeader
          chartData={chartData}
          latest={latest}
          now={now}
          readingCount={readings.length}
          readings={readings}
          source={source}
          totalReadings={totalReadings}
        />

        {error ? (
          <section className="dashboard-error">
            <h2>Dashboard unavailable</h2>
            <p>{error.message}</p>
            <button onClick={() => void mutate()} type="button">
              Retry
            </button>
          </section>
        ) : null}

        {!error && dataWarnings.length > 0 ? (
          <section className="dashboard-warning">
            <h2>Partial dashboard data</h2>
            {dataWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
            <button onClick={() => void mutate()} type="button">
              Retry
            </button>
          </section>
        ) : null}

        <section className="dashboard-widget-grid" aria-label="Dashboard widgets">
          <BgDeltaWidget latest={latest} now={now} readings={readings} />
          <TimeInRangeWidget stats={stats} />
          <TddWidget stats={stats} />
        </section>

        <section className="dashboard-card dashboard-chart-card">
          <div className="dashboard-card-header dashboard-chart-header">
            <div>
              <h2>Interactive Chart</h2>
              <p>{isLoading ? 'Loading dashboard data' : title}</p>
            </div>
            <div className="dashboard-range-buttons" aria-label="Chart range">
              {[6, 12, 24, 48].map((range) => (
                <button
                  aria-pressed={hours === range}
                  key={range}
                  onClick={() => setHours(range)}
                  type="button"
                >
                  {range}h
                </button>
              ))}
              <button onClick={() => void mutate()} type="button">
                Refresh
              </button>
            </div>
          </div>
          <div className="dashboard-chart-frame">
            <UplotGlucoseChart height={360} readings={readings} />
          </div>
          <ChartSummary chartData={chartData} glucoseCount={readings.length} />
        </section>

        <div className="dashboard-bottom-grid">
          <RecentGlucoseEntries readings={readings} />
          <RecentTreatments chartData={chartData} />
        </div>
      </div>
    </main>
  );
}
