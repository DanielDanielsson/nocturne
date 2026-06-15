import { headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { getNocturneApiBaseUrl, getNocturneInstanceKey } from './env';

export class NocturneApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string
  ) {
    super(message);
    this.name = 'NocturneApiError';
  }
}

async function createForwardedHeaders(): Promise<Headers> {
  const incomingHeaders = await headers();
  const target = new Headers();
  const incomingCookie = incomingHeaders.get('cookie');
  const incomingAuth = incomingHeaders.get('authorization');
  const instanceKey = getNocturneInstanceKey();

  if (incomingCookie) {
    target.set('Cookie', incomingCookie);
  }

  if (incomingAuth) {
    target.set('Authorization', incomingAuth);
  }

  if (instanceKey) {
    target.set('X-Instance-Key', createHash('sha256').update(instanceKey).digest('hex'));
    target.set('X-Instance-Service', 'nocturne-web-react');
  }

  return target;
}

export function createNocturneApiUrl(path: string, params?: Record<string, string | number | null | undefined>): URL {
  const url = new URL(path, getNocturneApiBaseUrl());

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

export async function nocturneApiFetch(
  path: string,
  params?: Record<string, string | number | null | undefined>,
  init?: RequestInit
): Promise<Response> {
  const headers = await createForwardedHeaders();
  const initHeaders = new Headers(init?.headers);

  initHeaders.forEach((value, key) => headers.set(key, value));

  return fetch(createNocturneApiUrl(path, params), {
    ...init,
    headers,
    cache: init?.cache ?? 'no-store'
  });
}

export async function nocturneApiJson<T>(
  path: string,
  params?: Record<string, string | number | null | undefined>,
  init?: RequestInit
): Promise<T> {
  const response = await nocturneApiFetch(path, params, init);

  if (!response.ok) {
    const body = await response.text();
    throw new NocturneApiError(`Nocturne API returned ${response.status}`, response.status, body);
  }

  return response.json() as Promise<T>;
}
