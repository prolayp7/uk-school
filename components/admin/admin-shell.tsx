"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/admin/logout-button";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isBlogEditor =
    pathname === "/admin/blog/new" || /^\/admin\/blog\/[^/]+$/.test(pathname);
  const navigationId = useId();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const firstItem = sidebarRef.current?.querySelector<HTMLElement>(
      "a[href], button:not(:disabled)",
    );
    firstItem?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableItems = sidebarRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not(:disabled)",
      );
      if (!focusableItems?.length) return;

      const first = focusableItems[0];
      const last = focusableItems[focusableItems.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  function closeMobileNav() {
    if (!mobileNavOpen) return;
    setMobileNavOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className={`admin-shell${isBlogEditor ? " is-blog-editor" : ""}`}>
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          className="admin-scrim"
          onClick={closeMobileNav}
          type="button"
        />
      )}
      <aside
        aria-label="Website management"
        className={`admin-sidebar${mobileNavOpen ? " is-open" : ""}`}
        id={navigationId}
        ref={sidebarRef}
      >
        <div className="admin-sidebar-top">
          <Link
            aria-label="School website content management"
            className="admin-brand"
            href="/admin"
            onClick={closeMobileNav}
          >
            <span aria-hidden="true" className="admin-brand-mark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 9.5 12 4l9 5.5-9 5.5-9-5.5Z" />
                <path d="M6.5 12v5.2c3.3 2.3 7.7 2.3 11 0V12M21 10v6" />
              </svg>
            </span>
            <span className="admin-brand-copy">
              <strong>School website</strong>
              <small>Content management</small>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="admin-sidebar-close"
            onClick={closeMobileNav}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav aria-label="CMS navigation" className="admin-navigation">
          <div className="admin-navigation-group">
            <div className="admin-nav-label">Blog module</div>
            <Link
              aria-current={pathname === "/admin/blog" ? "page" : undefined}
              href="/admin/blog"
              title="Blog listing"
              onClick={closeMobileNav}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
                <path d="M4 6h13M8 10h8M8 14h6" />
              </svg>
              <span>Blog listing</span>
            </Link>
            <Link
              aria-current={
                pathname === "/admin/blog/new" || /^\/admin\/blog\/[^/]+$/.test(pathname)
                  ? "page"
                  : undefined
              }
              href="/admin/blog/new"
              title="Add / edit blog"
              onClick={closeMobileNav}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add / edit blog</span>
            </Link>
          </div>
          <div className="admin-navigation-group">
            <div className="admin-nav-label">Pages module</div>
            <Link
              aria-current={
                pathname === "/admin" ||
                (pathname.startsWith("/admin/pages/") && pathname !== "/admin/pages/new")
                  ? "page"
                  : undefined
              }
              href="/admin"
              title="Pages listing"
              onClick={closeMobileNav}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M5 5h14v14H5zM8 9h8M8 13h8M8 17h5" />
              </svg>
              <span>Pages listing</span>
            </Link>
            <Link
              aria-current={pathname === "/admin/pages/new" ? "page" : undefined}
              href="/admin/pages/new"
              title="Add / edit page"
              onClick={closeMobileNav}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add / edit page</span>
            </Link>
          </div>
          <div className="admin-navigation-group">
            <div className="admin-nav-label">Menu module</div>
            <Link
              aria-current={pathname === "/admin/menus/header" ? "page" : undefined}
              href="/admin/menus/header"
              title="Header menu"
              onClick={closeMobileNav}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Header menu</span>
            </Link>
            <Link
              aria-current={pathname === "/admin/menus/footer" ? "page" : undefined}
              href="/admin/menus/footer"
              title="Footer menu"
              onClick={closeMobileNav}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <path d="M7 4v4m5-4v4m5-4v4" />
              </svg>
              <span>Footer menu</span>
            </Link>
          </div>
        </nav>
        <div className="admin-sidebar-footer">
          <LogoutButton />
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-start">
            <button
              aria-controls={navigationId}
              aria-expanded={mobileNavOpen}
              aria-label="Open navigation"
              className="admin-menu-button"
              onClick={() => setMobileNavOpen(true)}
              ref={menuButtonRef}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {isBlogEditor ? (
              <Link className="blog-editor-back" href="/admin/blog">
                <svg aria-hidden="true" className="blog-editor-icon" fill="none" viewBox="0 0 24 24">
                  <path d="m14 18-6-6 6-6M20 12H8" />
                </svg>
                <span>All blog posts</span>
              </Link>
            ) : (
              <span className="admin-topbar-title">Website content</span>
            )}
          </div>
          <div className="admin-topbar-end">
            {isBlogEditor ? (
              <>
                <span className="blog-editor-preview-tag">
                  <span aria-hidden="true" />
                  Preview only
                </span>
                <button
                  className="blog-editor-save"
                  disabled
                  title="Blog post saving is not supported by the API"
                  type="button"
                >
                  <svg aria-hidden="true" className="blog-editor-icon" fill="none" viewBox="0 0 24 24">
                    <path d="M5 3h12l4 4v14H3V3h2Z" />
                    <path d="M7 3v6h10V3M7 21v-8h10v8" />
                  </svg>
                  <span>Save post</span>
                </button>
              </>
            ) : (
              <>
                <span className="admin-topbar-label">School website CMS</span>
                <Link href="/">
                  View public website <span aria-hidden="true">↗</span>
                </Link>
              </>
            )}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
