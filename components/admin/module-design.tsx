"use client";

import Link from "next/link";
import { useState } from "react";
import { ContentBlockEditor } from "@/components/admin/content-block-editor";

type ModuleListingDesignProps = {
  title: string;
  description: string;
  addHref?: string;
  addLabel?: string;
  columns: string[];
  emptyTitle: string;
  emptyDescription: string;
};

export function ModuleListingDesign({
  title,
  description,
  addHref,
  addLabel,
  columns,
  emptyTitle,
  emptyDescription,
}: ModuleListingDesignProps) {
  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div>
          <h1>{title}</h1>
          <p className="admin-lead">{description}</p>
        </div>
        {addHref && addLabel ? (
          <Link className="admin-button admin-button-link" href={addHref}>
            {addLabel}
          </Link>
        ) : null}
      </div>
      <div className="module-design-notice" role="note">
        <strong>Design preview</strong>
        <span>This module is not connected to the CMS API. No content is loaded or saved here.</span>
      </div>
      <section aria-label={title} className="admin-panel module-listing-panel">
        <div className="module-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">{column}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="module-empty-state">
          <span aria-hidden="true" className="module-empty-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 5h14v14H5zM8 9h8M8 13h8M8 17h5" />
            </svg>
          </span>
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
          {addHref && addLabel ? (
            <Link className="admin-button admin-button-link" href={addHref}>
              {addLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function BlogEditorDesign({ postId }: { postId?: string }) {
  const isEditing = Boolean(postId);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [summary, setSummary] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div>
          <h1>{isEditing ? "Edit blog post" : "Add blog post"}</h1>
          <p className="admin-lead">
            {isEditing
              ? "Shape the post, arrange its sections, and prepare its search preview."
              : "Write and organise a post using flexible content sections."}
          </p>
        </div>
        <Link className="admin-button secondary" href="/admin/blog">
          Back to blog listing
        </Link>
      </div>
      <div className="module-design-notice" role="note">
        <strong>Design preview</strong>
        <span>
          {isEditing
            ? `Post ${postId} is not loaded. This editor is not connected to the CMS API; edits remain in this browser view and cannot be saved.`
            : "This editor is not connected to the CMS API. Edits remain in this browser view and cannot be saved."}
        </span>
      </div>
      <section aria-label="Blog editor preview" className="admin-panel module-editor-panel blog-editor-panel">
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="blog-title">Post title</label>
            <input
              id="blog-title"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter a blog post title"
              value={title}
            />
          </div>
          <div className="field">
            <label htmlFor="blog-slug">URL slug</label>
            <input
              id="blog-slug"
              maxLength={180}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="post-url"
              value={slug}
            />
          </div>
          <div className="field">
            <label htmlFor="blog-status">Status</label>
            <select id="blog-status" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="blog-summary">Summary</label>
            <textarea
              id="blog-summary"
              maxLength={320}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Write a short introduction"
              rows={3}
              value={summary}
            />
            <small>{summary.length}/320 characters</small>
          </div>
        </div>
        <ContentBlockEditor />
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
                maxLength={200}
                onChange={(event) => setSeoTitle(event.target.value)}
                placeholder="A clear title for search results"
                value={seoTitle}
              />
            </label>
            <label className="editor-field">
              <span>SEO description <small>{seoDescription.length}/320</small></span>
              <textarea
                maxLength={320}
                onChange={(event) => setSeoDescription(event.target.value)}
                placeholder="Summarise this post for search results"
                rows={3}
                value={seoDescription}
              />
            </label>
            <div aria-label="Search result preview" className="editor-search-preview">
              <span>{slug ? `school.example/${slug}` : "school.example/blog/post-url"}</span>
              <strong>{seoTitle || title || "Your post title"}</strong>
              <p>{seoDescription || summary || "Your search description will appear here."}</p>
            </div>
          </div>
        </details>
        <div className="module-editor-actions">
          <button aria-disabled="true" className="admin-button" disabled type="button">
            Save draft
          </button>
          <button aria-disabled="true" className="admin-button secondary" disabled type="button">
            Publish post
          </button>
          <span className="editor-unsaved-note">
            {status === "published" ? "Publishing is unavailable until Blog is connected to the CMS API." : "Saving is unavailable until Blog is connected to the CMS API."}
          </span>
        </div>
      </section>
    </main>
  );
}
