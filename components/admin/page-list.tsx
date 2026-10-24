"use client";

import Link from "next/link";
import { useState } from "react";
import type { CmsPageSummary, CmsPagesResponse } from "@/lib/api/types";

const pageSize = 20;

export function PageList({ initial }: { initial: CmsPagesResponse }) {
  const [pages, setPages] = useState<CmsPageSummary[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [offset, setOffset] = useState(initial.offset);
  const [status, setStatus] = useState("");
  const [contentType, setContentType] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load(nextOffset: number, nextStatus = status, nextType = contentType) {
    setPending(true);
    setError(null);
    const query = new URLSearchParams({
      limit: String(pageSize),
      offset: String(nextOffset),
    });
    if (nextStatus) query.set("status", nextStatus);
    if (nextType) query.set("contentType", nextType);

    try {
      const response = await fetch(`/api/admin/pages?${query}`, { cache: "no-store" });
      const payload = (await response.json()) as CmsPagesResponse & { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Website pages could not be loaded.");
        return;
      }
      setPages(payload.items);
      setTotal(payload.total);
      setOffset(payload.offset);
    } catch {
      setError("The website CMS could not be reached.");
    } finally {
      setPending(false);
    }
  }

  const visiblePages = pages.filter((page) =>
    `${page.title} ${page.slug}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );

  return (
    <>
      <div className="page-list-controls">
        <div className="field">
          <label htmlFor="page-search">Search this page</label>
          <input
            id="page-search"
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            value={search}
          />
        </div>
        <div className="field">
          <label htmlFor="page-status">Status</label>
          <select
            id="page-status"
            onChange={(event) => {
              setStatus(event.target.value);
              void load(0, event.target.value, contentType);
            }}
            value={status}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="page-type">Content type</label>
          <select
            id="page-type"
            onChange={(event) => {
              setContentType(event.target.value);
              void load(0, status, event.target.value);
            }}
            value={contentType}
          >
            <option value="">All types</option>
            <option value="homepage">Homepage</option>
            <option value="page">Page</option>
            <option value="navigation">Navigation</option>
            <option value="news">News</option>
            <option value="staff">Staff</option>
            <option value="policy">Policy</option>
            <option value="document">Document</option>
            <option value="admissions">Admissions</option>
            <option value="results">Results</option>
            <option value="school_information">School information</option>
            <option value="settings">Settings</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
      {pending && <p aria-live="polite">Loading pages…</p>}
      {visiblePages.length === 0 && !pending ? (
        <p className="empty-admin">
          {pages.length === 0 ? "No pages match these filters." : "No pages match your search."}
        </p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiblePages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <strong>{page.title}</strong>
                    <br />
                    <span>/{page.slug}</span>
                  </td>
                  <td>{page.contentType.replaceAll("_", " ")}</td>
                  <td>
                    <span className={`status-pill ${page.status}`}>{page.status}</span>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(page.updatedAt))}
                  </td>
                  <td>
                    <Link className="admin-link" href={`/admin/pages/${page.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination-controls">
        <span>
          {total === 0 ? "No pages" : `${offset + 1}-${Math.min(offset + pageSize, total)} of ${total}`}
        </span>
        <div className="admin-actions">
          <button
            className="admin-button secondary"
            disabled={pending || offset === 0}
            onClick={() => void load(Math.max(0, offset - pageSize))}
            type="button"
          >
            Previous
          </button>
          <button
            className="admin-button secondary"
            disabled={pending || offset + pageSize >= total}
            onClick={() => void load(offset + pageSize)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
