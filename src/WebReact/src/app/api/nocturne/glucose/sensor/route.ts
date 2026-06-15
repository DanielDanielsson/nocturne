import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentSensorGlucose, parseSensorGlucoseResponse } from '@/lib/nocturne/glucose';

export const dynamic = 'force-dynamic';

function getLimit(request: NextRequest): number {
  const rawLimit = request.nextUrl.searchParams.get('limit');
  const parsed = rawLimit ? Number(rawLimit) : 48;

  if (!Number.isFinite(parsed)) {
    return 48;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 288);
}

export async function GET(request: NextRequest) {
  let apiResponse: Response;

  try {
    apiResponse = await fetchRecentSensorGlucose(getLimit(request));
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'nocturne_api_unreachable',
          message: error instanceof Error ? error.message : 'Nocturne API is unreachable',
          status: 503
        }
      },
      { status: 503 }
    );
  }

  if (!apiResponse.ok) {
    const status = apiResponse.status;

    return NextResponse.json(
      {
        error: {
          code: 'nocturne_api_error',
          message: `Nocturne API returned ${status}`,
          status
        }
      },
      { status }
    );
  }

  return NextResponse.json(await parseSensorGlucoseResponse(apiResponse));
}
