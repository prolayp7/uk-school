export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level: 2 | 3 | 4 }
  | { type: "quote"; text: string; citation?: string }
  | { type: "image"; url: string; alt: string }
  | { type: "link"; url: string; label: string };

export type WebsiteContent = Record<string, unknown>;

export type WebsiteProjection = {
  slug: string;
  title: string;
  type: string;
  content: WebsiteContent;
  seo: {
    title: string | null;
    description: string | null;
  };
  publishedAt: string | null;
};

export type PublicSchool = {
  code: string;
  name: string;
};

export type PublicHomepage = {
  school: PublicSchool;
  settings: WebsiteContent;
  page: WebsiteProjection;
  navigation: { items?: NavigationItem[] };
  news: WebsiteProjection[];
  events: PublicEvent[];
};

export type NavigationItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type PublicCollection = {
  school: PublicSchool;
  items: WebsiteProjection[];
  total?: number;
};

export type PublicNavigation = {
  school: PublicSchool;
  navigation: { items?: NavigationItem[] };
};

export type PublicEventsResponse = {
  school: PublicSchool;
  items: PublicEvent[];
  total?: number;
};

export type PublicPageResponse = {
  school: PublicSchool;
  page: WebsiteProjection;
};

export type PublicAdmissions = {
  school: PublicSchool;
  items: WebsiteProjection[];
};

export type PublicSchoolInformation = {
  school: PublicSchool;
  information: WebsiteContent;
};

export type PublicEvent = {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
};

export type ApiError = {
  message: string;
  status: number;
};

export type ApiResult<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

export type CmsPageSummary = {
  id: string;
  slug: string;
  contentType: string;
  title: string;
  status: string;
  currentVersionNumber: number;
  publishedVersionNumber: number | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type CmsPagesResponse = {
  items: CmsPageSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type CmsPageVersion = {
  id: string;
  versionNumber: number;
  slug: string;
  title: string;
  status: string;
  content: WebsiteContent;
  seoTitle: string | null;
  seoDescription: string | null;
  createdById: string;
  submittedAt: string | null;
  reviewedById: string | null;
  approvedAt: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type CmsVersionsResponse = {
  items: CmsPageVersion[];
  total: number;
};

export type SessionUser = {
  id: string;
  emailNormalized: string;
  permissions: string[];
  roleCodes: string[];
  schools: SchoolOption[];
};

export type SchoolOption = {
  id: string;
  code: string;
  name: string;
};

export const websiteContentTypes = [
  "homepage",
  "page",
  "navigation",
  "news",
  "staff",
  "policy",
  "document",
  "admissions",
  "results",
  "school_information",
  "settings",
] as const;

export type WebsiteContentType = (typeof websiteContentTypes)[number];
