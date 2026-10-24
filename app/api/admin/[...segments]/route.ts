import { cookies } from "next/headers";
import { ApiRequestError, apiRequest } from "@/lib/api/client";
import { isSameOriginRequest, jsonError } from "@/lib/server/request-security";

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

function cmsPath(segments: string[], method: "GET" | "POST"): string | null {
  const pageId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const version = /^[1-9]\d{0,8}$/;

  if (segments.length === 1 && segments[0] === "pages" && method === "GET") {
    return "erp/website/pages";
  }
  if (segments.length === 1 && segments[0] === "pages" && method === "POST") {
    return "erp/website/pages";
  }
  if (segments.length === 3 && segments[0] === "pages" && pageId.test(segments[1]) && segments[2] === "versions") {
    return method === "GET" || method === "POST"
      ? `erp/website/pages/${segments[1]}/versions`
      : null;
  }
  if (
    segments.length === 5 &&
    segments[0] === "pages" &&
    pageId.test(segments[1]) &&
    segments[2] === "versions" &&
    version.test(segments[3]) &&
    ["review", "approve", "schedule"].includes(segments[4]) &&
    method === "POST"
  ) {
    return `erp/website/pages/${segments[1]}/versions/${segments[3]}/${segments[4]}`;
  }
  if (
    segments.length === 3 &&
    segments[0] === "pages" &&
    pageId.test(segments[1]) &&
    ["publish", "unpublish", "archive", "revalidate"].includes(segments[2]) &&
    method === "POST"
  ) {
    return `erp/website/pages/${segments[1]}/${segments[2]}`;
  }
  return null;
}

async function proxyCmsRequest(
  request: Request,
  context: RouteContext,
  method: "GET" | "POST",
) {
  if (method === "POST" && !isSameOriginRequest(request)) {
    return jsonError("This content change could not be verified.", 403);
  }
  const { segments } = await context.params;
  const path = cmsPath(segments, method);
  if (!path) return jsonError("This CMS operation is not available.", 404);

  const cookieStore = await cookies();
  const token = cookieStore.get("school_session")?.value;
  const schoolId = cookieStore.get("active_school")?.value;
  if (!token) return jsonError("Your session has expired. Sign in again.", 401);
  if (!schoolId) return jsonError("Choose a school before managing its website.", 400);

  const query = new URL(request.url).searchParams;
  const allowedQuery = new URLSearchParams();
  for (const key of ["status", "contentType", "limit", "offset"]) {
    const value = query.get(key);
    if (value !== null) allowedQuery.set(key, value);
  }
  const target = allowedQuery.size > 0 ? `${path}?${allowedQuery}` : path;

  let body: string | undefined;
  if (method === "POST" && request.headers.get("content-length") !== "0") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      if (request.headers.get("content-length")) {
        return jsonError("Enter valid JSON for this content change.", 400);
      }
    }
  }

  try {
    const result = await apiRequest<unknown>(target, {
      method,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "x-school-id": schoolId,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
    });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (error.status === 401) {
        cookieStore.delete("school_session");
        cookieStore.delete("active_school");
        cookieStore.delete("school_options");
      }
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxyCmsRequest(request, context, "GET");
}

export async function POST(request: Request, context: RouteContext) {
  return proxyCmsRequest(request, context, "POST");
}
