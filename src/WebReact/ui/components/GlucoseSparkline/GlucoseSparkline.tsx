import type { SensorGlucose } from '@/lib/nocturne/types';

interface GlucoseSparklineProps {
  readings: SensorGlucose[];
}

function formatBarHeight(reading: SensorGlucose): string {
  const value = reading.mgdl ?? 0;
  const clamped = Math.max(40, Math.min(value, 240));
  return `${Math.round((clamped / 240) * 100)}%`;
}

function classifyReading(reading: SensorGlucose): string {
  const value = reading.mgdl ?? 0;

  if (value < 70) {
    return 'bg-[var(--low)]';
  }

  if (value > 180) {
    return 'bg-[var(--high)]';
  }

  return 'bg-[var(--in-range)]';
}

export function GlucoseSparkline({ readings }: GlucoseSparklineProps) {
  const ordered = [...readings].reverse().slice(-36);

  return (
    <div className="flex h-32 items-end gap-1 rounded-md border border-white/10 bg-black/20 p-3">
      {ordered.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center text-sm text-[var(--text-muted)]">
          No glucose readings
        </div>
      ) : (
        ordered.map((reading, index) => (
          <div
            key={reading.id ?? `${reading.timestamp}-${index}`}
            className={`w-full min-w-1 rounded-t ${classifyReading(reading)}`}
            style={{ height: formatBarHeight(reading) }}
            title={`${reading.mgdl ?? '?'} mg/dL`}
          />
        ))
      )}
    </div>
  );
}
