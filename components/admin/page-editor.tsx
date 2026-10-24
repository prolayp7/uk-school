"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ContentBlockEditor,
  editorialBlocksToJson,
  hasEditorialTextOverLimit,
  hasUnsupportedEditorialBlocks,
  readEditorialBlocks,
} from "@/components/admin/content-block-editor";
import type {
  CmsPageSummary,
  CmsPageVersion,
  WebsiteContent,
  WebsiteContentType,
} from "@/lib/api/types";
import { websiteContentTypes } from "@/lib/api/types";

type FieldKind = "text" | "textarea" | "url" | "date" | "number" | "json" | "boolean";
type FieldSpec = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  help?: string;
};

const schemas: Record<WebsiteContentType, FieldSpec[]> = {
  homepage: [
    { name: "heading", label: "Heading", kind: "text", required: true },
    { name: "intro", label: "Introduction", kind: "textarea" },
    { name: "heroImageUrl", label: "Hero image URL", kind: "url" },
    { name: "body", label: "Content blocks", kind: "json", help: "Use the documented paragraph, heading, quote, image or link block format." },
    { name: "primaryCta", label: "Primary call to action", kind: "json", help: 'Use an object with "label" and "url".' },
  ],
  page: [
    { name: "heading", label: "Heading", kind: "text", required: true },
    { name: "intro", label: "Introduction", kind: "textarea" },
    { name: "heroImageUrl", label: "Hero image URL", kind: "url" },
    { name: "body", label: "Content blocks", kind: "json", help: "Use the documented paragraph, heading, quote, image or link block format." },
    { name: "primaryCta", label: "Primary call to action", kind: "json", help: 'Use an object with "label" and "url".' },
  ],
  navigation: [
    { name: "items", label: "Navigation items", kind: "json", required: true, help: 'Use an array of { "label", "href", "external" } items.' },
  ],
  news: [
    { name: "summary", label: "Summary", kind: "textarea", required: true },
    { name: "body", label: "Content blocks", kind: "json" },
    { name: "imageUrl", label: "Image URL", kind: "url" },
    { name: "publishedOn", label: "Publication date", kind: "date" },
    { name: "category", label: "Category", kind: "text" },
  ],
  staff: [
    { name: "jobTitle", label: "Job title", kind: "text", required: true },
    { name: "department", label: "Department", kind: "text" },
    { name: "biography", label: "Biography", kind: "textarea" },
    { name: "imageUrl", label: "Image URL", kind: "url" },
    { name: "sortOrder", label: "Sort order", kind: "number" },
  ],
  policy: [
    { name: "summary", label: "Summary", kind: "textarea", required: true },
    { name: "body", label: "Content blocks", kind: "json" },
    { name: "fileUrl", label: "File URL", kind: "url" },
    { name: "fileName", label: "File name", kind: "text" },
    { name: "updatedOn", label: "Updated date", kind: "date" },
    { name: "category", label: "Category", kind: "text" },
  ],
  document: [
    { name: "summary", label: "Summary", kind: "textarea", required: true },
    { name: "fileUrl", label: "File URL", kind: "url", required: true },
    { name: "fileName", label: "File name", kind: "text" },
    { name: "updatedOn", label: "Updated date", kind: "date" },
    { name: "category", label: "Category", kind: "text" },
  ],
  admissions: [
    { name: "summary", label: "Summary", kind: "textarea", required: true },
    { name: "body", label: "Content blocks", kind: "json" },
    { name: "applicationUrl", label: "Application URL", kind: "url" },
    { name: "steps", label: "Admissions steps", kind: "json", help: "Enter a JSON array of text steps." },
    { name: "open", label: "Admissions are open", kind: "boolean" },
  ],
  results: [
    { name: "headline", label: "Headline", kind: "text", required: true },
    { name: "summary", label: "Summary", kind: "textarea", required: true },
    { name: "body", label: "Content blocks", kind: "json" },
    { name: "academicYear", label: "Academic year", kind: "text" },
    { name: "publishedOn", label: "Publication date", kind: "date" },
  ],
  school_information: [
    { name: "strapline", label: "Strapline", kind: "text", required: true },
    { name: "address", label: "Address", kind: "textarea" },
    { name: "phone", label: "Telephone", kind: "text" },
    { name: "email", label: "Email address", kind: "text" },
    { name: "websiteUrl", label: "Website URL", kind: "url" },
    { name: "urn", label: "URN", kind: "text" },
    { name: "localAuthority", label: "Local authority", kind: "text" },
  ],
  settings: [
    { name: "tagline", label: "Tagline", kind: "text", required: true },
    { name: "logoUrl", label: "Logo URL", kind: "url" },
    { name: "contactEmail", label: "Contact email", kind: "text" },
    { name: "telephone", label: "Telephone", kind: "text" },
    { name: "primaryColor", label: "Primary colour", kind: "text" },
    { name: "secondaryColor", label: "Secondary colour", kind: "text" },
  ],
};

function displayValue(value: unknown, kind: FieldKind): string {
  if (kind === "boolean") return value === true ? "true" : "false";
  if (kind === "json") return value === undefined ? "" : JSON.stringify(value, null, 2);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function isWebsiteContentType(value: string): value is WebsiteContentType {
  return websiteContentTypes.some((contentType) => contentType === value);
}

function formatError(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = payload.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
      return message.join(" ");
    }
  }
  return "The website CMS could not complete this request.";
}

type PageEditorProps = {
  page?: CmsPageSummary;
  initialVersion?: CmsPageVersion;
  versions?: CmsPageVersion[];
};

export function PageEditor({ page, initialVersion, versions = [] }: PageEditorProps) {
  const router = useRouter();
  const initialType =
    page && isWebsiteContentType(page.contentType) ? page.contentType : "page";
  const [contentType, setContentType] = useState<WebsiteContentType>(initialType);
  const [title, setTitle] = useState(initialVersion?.title ?? page?.title ?? "");
  const [slug, setSlug] = useState(initialVersion?.slug ?? page?.slug ?? "");
  const [seoTitle, setSeoTitle] = useState(initialVersion?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initialVersion?.seoDescription ?? "");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      schemas[contentType].map((field) => [
        field.name,
        displayValue(initialVersion?.content[field.name], field.kind),
      ]),
    ),
  );
  const [scheduleAt, setScheduleAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hasAdvancedBlocks =
    contentType === "page" &&
    hasUnsupportedEditorialBlocks(readEditorialBlocks(fieldValues.body));
  const hasOverLimitEditorialText =
    contentType === "page" &&
    hasEditorialTextOverLimit(readEditorialBlocks(fieldValues.body));

  function updateType(nextType: string) {
    if (!isWebsiteContentType(nextType)) return;
    setContentType(nextType);
    setFieldValues(Object.fromEntries(schemas[nextType].map((field) => [field.name, ""])));
  }

  function buildContent(): WebsiteContent | null {
    const content: WebsiteContent = {};
    for (const field of schemas[contentType]) {
      const value = fieldValues[field.name] ?? "";
      if (field.kind === "boolean") {
        content[field.name] = value === "true";
        continue;
      }
      if (!value.trim()) {
        if (field.required) {
          setError(`${field.label} is required.`);
          return null;
        }
        continue;
      }
      if (field.kind === "json") {
        try {
          content[field.name] = JSON.parse(value) as unknown;
        } catch {
          setError(`${field.label} must be valid JSON.`);
          return null;
        }
      } else if (field.kind === "number") {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
          setError(`${field.label} must be a whole number from 0 to 10000.`);
          return null;
        }
        content[field.name] = parsed;
      } else {
        content[field.name] = value.trim();
      }
    }
    return content;
  }

  async function send(path: string, method: "POST", body?: unknown): Promise<unknown> {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(formatError(payload));
    return payload;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (hasAdvancedBlocks) {
      setError(
        "This page includes sections the website API cannot save yet. Remove the table of contents, video, callout, or side-by-side media sections before saving. No changes have been submitted.",
      );
      return;
    }
    if (hasOverLimitEditorialText) {
      setError(
        "Some formatted content exceeds the website API character limit. Shorten the affected heading or text section before saving.",
      );
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError("Use a lowercase URL slug with letters, numbers and single hyphens.");
      return;
    }
    const content = buildContent();
    if (!content) return;
    setPending(true);
    try {
      const optionalSeo = {
        ...(seoTitle.trim() ? { seoTitle: seoTitle.trim() } : {}),
        ...(seoDescription.trim() ? { seoDescription: seoDescription.trim() } : {}),
      };
      if (page) {
        await send(`/api/admin/pages/${page.id}/versions`, "POST", {
          title: title.trim(),
          slug,
          content,
          ...optionalSeo,
        });
        setNotice("A new draft version has been saved.");
        router.refresh();
      } else {
        const created = (await send("/api/admin/pages", "POST", {
          title: title.trim(),
          slug,
          contentType,
          content,
          ...optionalSeo,
        })) as { id?: string };
        if (!created.id) throw new Error("The API did not return the new page identifier.");
        router.replace(`/admin/pages/${created.id}`);
        router.refresh();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The draft could not be saved.");
    } finally {
      setPending(false);
    }
  }

  async function workflow(action: string, body?: unknown, confirmText?: string) {
    if (!page) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const suffix =
        action === "review" || action === "approve" || action === "schedule"
          ? `/versions/${page.currentVersionNumber}/${action}`
          : `/${action}`;
      await send(`/api/admin/pages/${page.id}${suffix}`, "POST", body);
      setNotice(
        action === "revalidate"
          ? "The cache revalidation request completed."
          : `The page workflow changed to ${action === "review" ? "review" : action}.`,
      );
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The workflow action failed.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const currentVersion = versions.find(
    (version) => version.versionNumber === page?.currentVersionNumber,
  );
  const currentStatus = currentVersion?.status ?? page?.status ?? "draft";

  return (
    <div className="admin-editor-layout">
      <form className="admin-panel admin-form" onSubmit={save}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="page-title">Page title</label>
            <input
              id="page-title"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </div>
          <div className="field">
            <label htmlFor="page-slug">URL slug</label>
            <input
              id="page-slug"
              maxLength={180}
              onChange={(event) => setSlug(event.target.value)}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              value={slug}
            />
            <small>Lowercase letters and numbers separated by single hyphens.</small>
          </div>
          {!page && (
            <div className="field full">
              <label htmlFor="content-type">Content type</label>
              <select
                id="content-type"
                onChange={(event) => updateType(event.target.value)}
                value={contentType}
              >
                {websiteContentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          )}
          {schemas[contentType].filter((field) => !(contentType === "page" && field.name === "body")).map((field) => (
            <div className={`field ${field.kind === "json" || field.kind === "textarea" ? "full" : ""}`} key={field.name}>
              {field.kind === "boolean" ? (
                <label className="checkbox-label" htmlFor={`content-${field.name}`}>
                  <input
                    checked={fieldValues[field.name] === "true"}
                    id={`content-${field.name}`}
                    onChange={(event) =>
                      setFieldValues((current) => ({
                        ...current,
                        [field.name]: String(event.target.checked),
                      }))
                    }
                    type="checkbox"
                  />
                  {field.label}
                </label>
              ) : (
                <>
                  <label htmlFor={`content-${field.name}`}>{field.label}</label>
                  {field.kind === "textarea" || field.kind === "json" ? (
                    <textarea
                      id={`content-${field.name}`}
                      onChange={(event) =>
                        setFieldValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                      required={field.required}
                      value={fieldValues[field.name] ?? ""}
                    />
                  ) : (
                    <input
                      id={`content-${field.name}`}
                      onChange={(event) =>
                        setFieldValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                      required={field.required}
                      type={field.kind}
                      min={field.kind === "number" ? 0 : undefined}
                      max={field.kind === "number" ? 10_000 : undefined}
                      step={field.kind === "number" ? 1 : undefined}
                      value={fieldValues[field.name] ?? ""}
                    />
                  )}
                </>
              )}
              {field.help && <small>{field.help}</small>}
            </div>
          ))}
        </div>
        {contentType === "page" && (
          <div className="field full">
            <ContentBlockEditor
              initialValue={fieldValues.body}
              onChange={(blocks) =>
                setFieldValues((current) => ({
                  ...current,
                  body: editorialBlocksToJson(blocks),
                }))
              }
            />
            {hasAdvancedBlocks && (
              <p className="editor-api-limit" role="note">
                Advanced sections are available to arrange here, but the current website API only stores
                text, headings, quotes, standalone images, and links. Remove unsupported sections before
                saving to avoid losing work.
              </p>
            )}
            {hasOverLimitEditorialText && (
              <p className="editor-api-limit" role="alert">
                Formatted headings are limited to 1,000 stored characters and text or quote sections to
                4,000. Formatting markup counts towards these API limits.
              </p>
            )}
          </div>
        )}
        <details className="editor-seo-section" open>
          <summary>
            <span>
              <strong>Search appearance</strong>
              <small>SEO title and description</small>
            </span>
            <span aria-hidden="true" className="editor-disclosure" />
          </summary>
          <div className="editor-seo-fields">
            <label className="editor-field">
              <span>SEO title <small>{seoTitle.length}/200</small></span>
              <input
                id="seo-title"
                maxLength={200}
                onChange={(event) => setSeoTitle(event.target.value)}
                value={seoTitle}
              />
            </label>
            <label className="editor-field">
              <span>SEO description <small>{seoDescription.length}/320</small></span>
              <textarea
                id="seo-description"
                maxLength={320}
                onChange={(event) => setSeoDescription(event.target.value)}
                rows={3}
                value={seoDescription}
              />
            </label>
          </div>
        </details>
        {error && (
          <p className="form-message" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p aria-live="polite" className="success-message">
            {notice}
          </p>
        )}
        <div className="admin-actions">
          <button
            className="admin-button"
            disabled={pending || hasAdvancedBlocks || hasOverLimitEditorialText}
            type="submit"
          >
            {pending ? "Saving…" : page ? "Save new draft version" : "Create draft"}
          </button>
          <Link className="admin-button secondary admin-button-link" href="/admin">
            Cancel
          </Link>
        </div>
      </form>

      {page && (
        <aside className="admin-panel workflow-panel">
          <div className="workflow-heading">
            <div>
              <h2>Publishing workflow</h2>
              <p>Current revision: {page.currentVersionNumber}</p>
            </div>
            <span className={`status-pill ${currentStatus}`}>{currentStatus}</span>
          </div>
          <div className="workflow-actions">
            {currentStatus === "draft" && (
              <button
                className="admin-button secondary"
                disabled={pending}
                onClick={() => void workflow("review")}
                type="button"
              >
                Submit for review
              </button>
            )}
            {currentStatus === "review" && (
              <button
                className="admin-button"
                disabled={pending}
                onClick={() => void workflow("approve")}
                type="button"
              >
                Approve revision
              </button>
            )}
            {currentStatus === "approved" && (
              <>
                <button
                  className="admin-button"
                  disabled={pending}
                  onClick={() => void workflow("publish")}
                  type="button"
                >
                  Publish now
                </button>
                <div className="field">
                  <label htmlFor="scheduled-at">Schedule publication</label>
                  <input
                    id="scheduled-at"
                    onChange={(event) => setScheduleAt(event.target.value)}
                    type="datetime-local"
                    value={scheduleAt}
                  />
                  <button
                    className="admin-button secondary"
                    disabled={pending || !scheduleAt}
                    onClick={() =>
                      void workflow("schedule", {
                        scheduledAt: new Date(scheduleAt).toISOString(),
                      })
                    }
                    type="button"
                  >
                    Schedule
                  </button>
                </div>
              </>
            )}
            {page.publishedVersionNumber !== null && (
              <>
                <button
                  className="admin-button secondary"
                  disabled={pending}
                  onClick={() =>
                    void workflow(
                      "unpublish",
                      undefined,
                      "Unpublish this page from the public website?",
                    )
                  }
                  type="button"
                >
                  Unpublish
                </button>
                <button
                  className="admin-button secondary"
                  disabled={pending}
                  onClick={() => void workflow("revalidate")}
                  type="button"
                >
                  Retry cache revalidation
                </button>
              </>
            )}
            {page.publishedVersionNumber === null && currentStatus !== "archived" && (
              <button
                className="admin-button secondary"
                disabled={pending}
                onClick={() =>
                  void workflow("archive", undefined, "Archive this page and its editable revisions?")
                }
                type="button"
              >
                Archive
              </button>
            )}
          </div>
          <p className="workflow-note">
            The API requires a separate publisher permission for approval, scheduling and publishing.
            Authors cannot approve their own revisions.
          </p>
          <h3>Revision history</h3>
          {versions.length === 0 ? (
            <p>No revisions are available.</p>
          ) : (
            <div className="version-list">
              {versions.map((version) => (
                <div className="version-row" key={version.id}>
                  <div>
                    <strong>Revision {version.versionNumber}</strong>
                    <p>
                      {version.status} ·{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(version.createdAt))}
                    </p>
                  </div>
                  {version.versionNumber === page.currentVersionNumber && (
                    <span className="current-revision">Current</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
