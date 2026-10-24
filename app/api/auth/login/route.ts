import { cookies } from "next/headers";
import { ApiRequestError, apiRequest } from "@/lib/api/client";
import type { SchoolOption, SessionUser } from "@/lib/api/types";
import { isSameOriginRequest, jsonError } from "@/lib/server/request-security";

type SessionResponse = {
  token: string;
  user: SessionUser;
  schools: SchoolOption[];
};

const sessionCookie = "school_session";
const schoolCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 8 * 60 * 60,
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError("This sign-in request could not be verified.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Enter a valid email address and password.", 400);
  }
  if (typeof body !== "object" || body === null || !("email" in body) || !("password" in body)) {
    return jsonError("Enter a valid email address and password.", 400);
  }
  const { email, password } = body;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 320 ||
    password.length < 8 ||
    password.length > 1024
  ) {
    return jsonError("Enter a valid email address and password.", 400);
  }

  let session: SessionResponse;
  try {
    session = await apiRequest<SessionResponse>("auth/website-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  if (
    typeof session.token !== "string" ||
    !Array.isArray(session.schools) ||
    typeof session.user !== "object" ||
    session.user === null
  ) {
    return jsonError("The authentication service returned an invalid session.", 502);
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, session.token, schoolCookieOptions);
  cookieStore.set("school_options", JSON.stringify(session.schools), {
    ...schoolCookieOptions,
    path: "/",
  });
  if (session.schools.length === 1) {
    cookieStore.set("active_school", session.schools[0].id, schoolCookieOptions);
  } else {
    cookieStore.delete("active_school");
  }

  return Response.json(
    {
      user: {
        id: session.user.id,
        emailNormalized: session.user.emailNormalized,
        permissions: session.user.permissions,
        roleCodes: session.user.roleCodes,
      },
      schools: session.schools,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
