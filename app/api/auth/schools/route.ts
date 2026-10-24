import { cookies } from "next/headers";
import type { SchoolOption } from "@/lib/api/types";
import { jsonError } from "@/lib/server/request-security";

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get("school_session")?.value) {
    return jsonError("Sign in to choose a school.", 401);
  }
  const value = cookieStore.get("school_options")?.value;
  if (!value) return jsonError("Sign in again to load your school choices.", 401);

  let schools: SchoolOption[];
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (school) =>
          typeof school === "object" &&
          school !== null &&
          "id" in school &&
          "code" in school &&
          "name" in school &&
          typeof school.id === "string" &&
          typeof school.code === "string" &&
          typeof school.name === "string",
      )
    ) {
      return jsonError("School choices could not be read. Sign in again.", 401);
    }
    schools = parsed;
  } catch {
    return jsonError("School choices could not be read. Sign in again.", 401);
  }

  return Response.json({ schools }, { headers: { "cache-control": "no-store" } });
}
