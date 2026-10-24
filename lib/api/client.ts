import type { ApiResult } from "@/lib/api/types";

const PUBLIC_CACHE_SECONDS = 60;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function getApiBaseUrl(): string {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured) {
    throw new ApiRequestError("The school website API is not configured.", 503);
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new ApiRequestError("API_BASE_URL must be a valid HTTP or HTTPS URL.", 500);
  }

  if (!["http:", "https:"].includes(parsed.protocol) || parsed.search || parsed.hash) {
    throw new ApiRequestError("API_BASE_URL must be a base HTTP or HTTPS URL.", 500);
  }
  return configured.replace(/\/+$/, "");
}

export function getSchoolCode(): string {
  const schoolCode = process.env.SCHOOL_CODE?.trim();
  if (!schoolCode || !/^[A-Za-z0-9_-]{1,32}$/.test(schoolCode)) {
    throw new ApiRequestError("SCHOOL_CODE is missing or invalid.", 503);
  }
  return schoolCode;
}

export function publicApiUrl(path: string, query?: URLSearchParams): string {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(`${baseUrl}/${normalizedPath}`);
  if (query) {
    query.forEach((value, key) => url.searchParams.set(key, value));
  }
  return url.toString();
}

function messageFromPayload(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("message" in payload)) {
    return null;
  }
  const message = payload.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message.join(" ");
  }
  return null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  query?: URLSearchParams,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(publicApiUrl(path, query), {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(8_000),
      headers: {
        accept: "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "UnknownError";
    console.error(`School API request failed (${reason}).`);
    throw new ApiRequestError("The school website service could not be reached.", 503);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiRequestError("The school website service returned an error.", response.status);
    }
    throw new ApiRequestError("The school website service returned an unreadable response.", 502);
  }

  if (!response.ok) {
    throw new ApiRequestError(
      messageFromPayload(payload) ?? "The school website service returned an error.",
      response.status,
    );
  }
  return payload as T;
}

export async function getPublicData<T>(
  path: string,
  limit = 20,
): Promise<ApiResult<T>> {
  try {
    const query = publicQuery(limit);
    const data = await apiRequest<T>(
      path,
      {
        next: {
          revalidate: PUBLIC_CACHE_SECONDS,
          tags: ["website"],
        },
      },
      query,
    );
    return { data, error: null };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { data: null, error: { message: error.message, status: error.status } };
    }
    throw error;
  }
}

export function publicQuery(limit = 20): URLSearchParams {
  const query = new URLSearchParams({
    schoolCode: getSchoolCode(),
    limit: String(limit),
  });
  return query;
}
