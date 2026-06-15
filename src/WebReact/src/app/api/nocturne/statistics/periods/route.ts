import { NextResponse } from 'next/server';
import { NocturneApiError } from '@/lib/nocturne/client';
import { getMultiPeriodStatistics } from '@/lib/nocturne/statistics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getMultiPeriodStatistics());
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
