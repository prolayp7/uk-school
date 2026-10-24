export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function jsonError(message: string, status: number): Response {
  return Response.json(
    { message },
    {
      status,
      headers: { "cache-control": "no-store" },
    },
  );
}
