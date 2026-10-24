import { cookies } from "next/headers";
import { ApiRequestError, apiRequest } from "@/lib/api/client";
import { isSameOriginRequest, jsonError } from "@/lib/server/request-security";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError("This sign-out request could not be verified.", 403);
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("school_session")?.value;
  cookieStore.delete("school_session");
  cookieStore.delete("active_school");
  cookieStore.delete("school_options");

  if (!token) return Response.json({ signedOut: true }, { headers: { "cache-control": "no-store" } });
  try {
    await apiRequest("auth/sessions/current", {
      method: "DELETE",
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return jsonError(
        "This browser has been signed out, but the API could not confirm session revocation. Contact an administrator if you suspect the session was exposed.",
        error.status,
      );
    }
    throw error;
  }

  return Response.json({ signedOut: true }, { headers: { "cache-control": "no-store" } });
}
