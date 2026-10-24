import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicData } from "@/lib/api/client";
import type { NavigationItem, PublicHomepage } from "@/lib/api/types";

type SiteStyle = CSSProperties & {
  "--color-burgundy": string;
  "--color-burgundy-dark": string;
  "--color-heading": string;
  "--color-sage": string;
};

function colorLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: number, second: number): number {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function safeThemeColor(value: unknown, againstWhite: boolean): string | null {
  if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value)) return null;
  const luminance = colorLuminance(value);
  const contrast = againstWhite
    ? contrastRatio(luminance, 1)
    : contrastRatio(luminance, colorLuminance("#242b2e"));
  return contrast >= 4.5 ? value : null;
}

function darken(hex: string): string {
  const channels = [1, 3, 5].map((offset) =>
    Math.max(0, Math.round(Number.parseInt(hex.slice(offset, offset + 2), 16) * 0.78))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`;
}

function safeLogoUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (
    value.startsWith("https://") ||
    (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))
  ) {
    return value;
  }
  return undefined;
}

export async function PublicLayout({
  children,
  schoolName,
  navigation,
  settings,
}: {
  children: ReactNode;
  schoolName: string;
  navigation?: NavigationItem[];
  settings?: Record<string, unknown>;
}) {
  let navItems = navigation;
  let siteSettings = settings;
  if (!navItems || !siteSettings) {
    const homepage = await getPublicData<PublicHomepage>("/website/homepage", 6);
    if (homepage.data) {
      navItems ??= homepage.data.navigation.items ?? [];
      siteSettings ??= homepage.data.settings;
    }
    if (!navItems) {
      const navigationResponse = await getPublicData<{ navigation: { items?: NavigationItem[] } }>(
        "/website/navigation",
      );
      navItems = navigationResponse.data?.navigation.items ?? [];
    }
  }
  const primaryColor = safeThemeColor(siteSettings?.primaryColor, true) ?? "#68283b";
  const secondaryColor = safeThemeColor(siteSettings?.secondaryColor, false) ?? "#e5ebe5";
  const style: SiteStyle = {
    "--color-burgundy": primaryColor,
    "--color-burgundy-dark": darken(primaryColor),
    "--color-heading": darken(primaryColor),
    "--color-sage": secondaryColor,
  };
  const logoUrl = safeLogoUrl(siteSettings?.logoUrl);

  return (
    <div className="public-site" style={style}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader items={navItems} logoUrl={logoUrl} schoolName={schoolName} />
      <main id="main-content">{children}</main>
      <SiteFooter schoolName={schoolName} />
    </div>
  );
}
