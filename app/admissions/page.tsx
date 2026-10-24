import Link from "next/link";
import { ContentBody } from "@/components/content-renderer";
import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicAdmissions } from "@/lib/api/types";

export const metadata = { title: "Admissions" };

export default async function AdmissionsPage() {
  const result = await getPublicData<PublicAdmissions>("/website/admissions");
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="Admissions information is unavailable" />
        </div>
      </PublicLayout>
    );
  }
  const admission = result.data.items[0];
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          <h1>{admission?.title ?? "Admissions"}</h1>
          {admission && typeof admission.content.summary === "string" && (
            <p>{admission.content.summary}</p>
          )}
        </div>
      </section>
      <section className="section">
        <div className="site-container page-content">
          {!admission ? (
            <PublicState
              message="The school has not published admissions information yet."
              title="Admissions information is not available"
            />
          ) : (
            <>
              <ContentBody content={admission.content} />
              {Array.isArray(admission.content.steps) && admission.content.steps.length > 0 && (
                <div className="admissions-steps">
                  {admission.content.steps.map((step, index) =>
                    typeof step === "string" ? (
                      <section className="admissions-step" key={`${index}-${step}`}>
                        <h2>{step}</h2>
                      </section>
                    ) : null,
                  )}
                </div>
              )}
              {typeof admission.content.applicationUrl === "string" &&
                (admission.content.applicationUrl.startsWith("/") ||
                  admission.content.applicationUrl.startsWith("https://")) && (
                  <p>
                    <a
                      className="button"
                      href={admission.content.applicationUrl}
                      rel={
                        admission.content.applicationUrl.startsWith("https://")
                          ? "noreferrer"
                          : undefined
                      }
                      target={
                        admission.content.applicationUrl.startsWith("https://")
                          ? "_blank"
                          : undefined
                      }
                    >
                      Application information
                    </a>
                  </p>
                )}
              {typeof admission.content.open === "boolean" && (
                <p className="admissions-status">
                  Admissions are currently {admission.content.open ? "open" : "closed"}.
                </p>
              )}
            </>
          )}
          <p>
            <Link className="admin-link" href="/contact">
              Contact the school
            </Link>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
