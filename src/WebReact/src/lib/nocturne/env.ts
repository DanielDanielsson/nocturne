export function getNocturneApiBaseUrl(): string {
  return (
    process.env.NOCTURNE_API_URL ||
    process.env.PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_NOCTURNE_API_URL ||
    'http://localhost:5000'
  );
}

export function getNocturneInstanceKey(): string | null {
  return process.env.INSTANCE_KEY ?? null;
}
