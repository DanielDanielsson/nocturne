import { NextRequest, NextResponse } from 'next/server';
import { NocturneApiError } from '@/lib/nocturne/client';
import { getDashboardChart } from '@/lib/nocturne/dashboard';

export const dynamic = 'force-dynamic';

function getNumberParam(request: NextRequest, name: string, fallback: number): number {
  const rawValue = request.nextUrl.searchParams.get(name);
  const parsedValue = rawValue ? Number(rawValue) : fallback;

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const hours = getNumberParam(request, 'hours', 12);
    const intervalMinutes = getNumberParam(request, 'intervalMinutes', 5);

    return NextResponse.json(await getDashboardChart(hours, intervalMinutes));
  } catch (error) {
    const status = error instanceof NocturneApiError ? error.status : 503;

    return NextResponse.json(
      {
        error: {
          code: error instanceof NocturneApiError ? 'nocturne_api_error' : 'nocturne_api_unreachable',
          message: error instanceof Error ? error.message : 'Nocturne API is unreachable',
          status
        }
      },
      { status }
    );
  }
}
