import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { ApiRequestError, getSchoolCode } from "@/lib/api/client";
import { jsonError } from "@/lib/server/request-security";

type RevalidationPayload = {
  schoolCode: string;
  paths: string[];
};

function isPayload(value: unknown): value is RevalidationPayload {
  if (typeof value !== "object" || value === null || !("schoolCode" in value) || !("paths" in value)) {
    return false;
  }
  return (
    typeof value.schoolCode === "string" &&
    /^[A-Za-z0-9_-]{1,32}$/.test(value.schoolCode) &&
    Array.isArray(value.paths) &&
    value.paths.length <= 100 &&
    value.paths.every(
      (path) =>
        typeof path === "string" &&
        path.startsWith("/") &&
        !path.startsWith("//") &&
        !path.includes("\\") &&
        !path.includes("?") &&
        !path.includes("#") &&
        !path.split("/").some((part) => part === "." || part === ".."),
    )
  );
}

export async function POST(request: Request) {
  const secret = process.env.WEBSITE_REVALIDATE_SECRET;
  if (!secret) return jsonError("Website revalidation is not configured.", 503);

  const signature = request.headers.get("x-website-signature") ?? "";
  const match = /^sha256=([a-f0-9]{64})$/i.exec(signature);
  if (!match) return jsonError("The revalidation signature is invalid.", 401);

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > 16_384) {
    return jsonError("The revalidation request is too large.", 413);
  }
  const expected = createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(match[1], "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return jsonError("The revalidation signature is invalid.", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return jsonError("The revalidation request is not valid JSON.", 400);
  }
  if (!isPayload(payload)) return jsonError("The revalidation request is invalid.", 400);
  try {
    if (payload.schoolCode !== getSchoolCode()) {
      return jsonError("The revalidation request targets a different school.", 403);
    }
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return jsonError("School website revalidation is not configured.", 503);
    }
    throw error;
  }

  for (const path of new Set(payload.paths)) {
    revalidatePath(path);
  }
  revalidateTag("website", { expire: 0 });

  return Response.json({ revalidated: true }, { headers: { "cache-control": "no-store" } });
}
