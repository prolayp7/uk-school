import Link from "next/link";
import Image from "next/image";
import type { NavigationItem } from "@/lib/api/types";

type SiteHeaderProps = {
  schoolName: string;
  items: NavigationItem[];
  logoUrl?: string;
};

function safeInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

export function SiteHeader({ schoolName, items, logoUrl }: SiteHeaderProps) {
  const navigation = items.filter((item) =>
    item.external ? item.href.startsWith("https://") : safeInternalHref(item.href),
  );
  const primaryLinks = navigation.slice(0, 5);
  const additionalLinks = navigation.slice(5);

  function renderLink(item: NavigationItem) {
    return item.external ? (
      <a href={item.href} key={`${item.href}-${item.label}`} rel="noreferrer" target="_blank">
        {item.label}
      </a>
    ) : (
      <Link href={item.href} key={`${item.href}-${item.label}`}>
        {item.label}
      </Link>
    );
  }

  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="site-container utility-inner">
          <span>Welcome to {schoolName}</span>
          <Link href="/admin/login">Staff sign in</Link>
        </div>
      </div>
      <div className="site-container header-main">
        <Link aria-label={`${schoolName} home`} className="school-wordmark" href="/">
          {logoUrl ? (
            <Image alt={schoolName} className="school-logo" height={54} src={logoUrl} unoptimized width={170} />
          ) : (
            <>
              <span className="wordmark-seal" aria-hidden="true">
                {schoolName.trim().charAt(0).toUpperCase()}
              </span>
              <span>{schoolName}</span>
            </>
          )}
        </Link>
        <nav aria-label="Main navigation" className="desktop-navigation">
          {primaryLinks.map(renderLink)}
          {additionalLinks.length > 0 && (
            <details className="navigation-more">
              <summary>More</summary>
              <div>{additionalLinks.map(renderLink)}</div>
            </details>
          )}
        </nav>
        {navigation.length > 0 && (
          <details className="mobile-navigation">
            <summary aria-label="Toggle navigation">
              <span aria-hidden="true" className="menu-glyph" />
            </summary>
            <nav aria-label="Mobile navigation" className="mobile-navigation-panel">
              {navigation.map((item) =>
                item.external ? (
                  <a href={item.href} key={`${item.href}-${item.label}`} rel="noreferrer" target="_blank">
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} key={`${item.href}-${item.label}`}>
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </details>
        )}
      </div>
    </header>
  );
}
