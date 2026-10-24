import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicHomepage, PublicSchoolInformation } from "@/lib/api/types";

export const metadata = { title: "Contact" };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export default async function ContactPage() {
  const [result, homepage] = await Promise.all([
    getPublicData<PublicSchoolInformation>("/website/school-information"),
    getPublicData<PublicHomepage>("/website/homepage", 6),
  ]);
  if (result.error && homepage.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState
            kind="error"
            message={result.error.message}
            title="Contact information is unavailable"
          />
        </div>
      </PublicLayout>
    );
  }

  const info = result.data?.information ?? {};
  const settings = homepage.data?.settings ?? {};
  const address = text(info.address);
  const phone = text(info.phone) ?? text(settings.telephone);
  const email = text(info.email) ?? text(settings.contactEmail);
  const website = text(info.websiteUrl);
  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  const phoneHref = phone?.replace(/[^\d+]/g, "");

  return (
    <PublicLayout
      schoolName={result.data?.school.name ?? homepage.data?.school.name ?? "School website"}
      settings={settings}
    >
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          <h1>Contact</h1>
          <p>Contact details published by the school.</p>
        </div>
      </section>
      <section className="section">
        <div className="site-container page-content">
          {address && <p>{address}</p>}
          {phone && phoneHref && /\d/.test(phoneHref) && (
            <p>
              <a href={`tel:${phoneHref}`}>{phone}</a>
            </p>
          )}
          {validEmail && (
            <p>
              <a href={`mailto:${validEmail}`}>{validEmail}</a>
            </p>
          )}
          {website?.startsWith("https://") && (
            <p>
              <a href={website} rel="noreferrer" target="_blank">
                School website
              </a>
            </p>
          )}
          {!address && !(phone && phoneHref && /\d/.test(phoneHref)) && !validEmail && !website && (
            <PublicState
              message="The school has not published contact details yet."
              title="Contact details are not available"
            />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
