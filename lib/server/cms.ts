import { cookies } from "next/headers";
import { ApiRequestError, apiRequest } from "@/lib/api/client";
import type {
  ApiResult,
  CmsPagesResponse,
  CmsPageSummary,
  CmsVersionsResponse,
} from "@/lib/api/types";

export async function getCmsContext(): Promise<{
  token: string | null;
  schoolId: string | null;
}> {
  const cookieStore = await cookies();
  return {
    token: cookieStore.get("school_session")?.value ?? null,
    schoolId: cookieStore.get("active_school")?.value ?? null,
  };
}

export async function getCmsData<T>(path: string): Promise<ApiResult<T>> {
  const { token, schoolId } = await getCmsContext();
  if (!token) {
    return { data: null, error: { message: "Sign in to manage website content.", status: 401 } };
  }
  if (!schoolId) {
    return { data: null, error: { message: "Select a school to manage its website.", status: 400 } };
  }

  try {
    const data = await apiRequest<T>(path, {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "x-school-id": schoolId,
      },
    });
    return { data, error: null };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { data: null, error: { message: error.message, status: error.status } };
    }
    throw error;
  }
}

export function getCmsPages(limit = 20, offset = 0): Promise<ApiResult<CmsPagesResponse>> {
  return getCmsData<CmsPagesResponse>(
    `erp/website/pages?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`,
  );
}

export function getCmsVersions(pageId: string): Promise<ApiResult<CmsVersionsResponse>> {
  return getCmsData<CmsVersionsResponse>(
    `erp/website/pages/${encodeURIComponent(pageId)}/versions`,
  );
}

export async function getCmsPageSummary(pageId: string): Promise<ApiResult<CmsPageSummary>> {
  const firstPage = await getCmsPages(100, 0);
  if (firstPage.error) return firstPage;
  const initialMatch = firstPage.data.items.find((page) => page.id === pageId);
  if (initialMatch) return { data: initialMatch, error: null };

  for (let offset = firstPage.data.limit; offset < firstPage.data.total; offset += 100) {
    const result = await getCmsPages(100, offset);
    if (result.error) return result;
    const match = result.data.items.find((page) => page.id === pageId);
    if (match) return { data: match, error: null };
  }
  return { data: null, error: { message: "Website page not found.", status: 404 } };
}
