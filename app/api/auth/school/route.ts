import { cookies } from "next/headers";
import { ApiRequestError, apiRequest } from "@/lib/api/client";
import { isSameOriginRequest, jsonError } from "@/lib/server/request-security";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError("This school selection could not be verified.", 403);
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("school_session")?.value;
  if (!token) return jsonError("Sign in to choose a school.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Choose a valid school.", 400);
  }
  if (typeof body !== "object" || body === null || !("schoolId" in body) || typeof body.schoolId !== "string") {
    return jsonError("Choose a valid school.", 400);
  }

  try {
    await apiRequest("erp/website/pages?limit=1", {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "x-school-id": body.schoolId,
      },
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  cookieStore.set("active_school", body.schoolId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return Response.json({ selected: true }, { headers: { "cache-control": "no-store" } });
}
