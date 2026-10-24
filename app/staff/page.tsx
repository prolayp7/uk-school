import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { CmsImage } from "@/components/content-renderer";
import { getPublicData } from "@/lib/api/client";
import type { PublicCollection } from "@/lib/api/types";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const result = await getPublicData<PublicCollection>("/website/staff", 100);
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="Staff information is unavailable" />
        </div>
      </PublicLayout>
    );
  }
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          <h1>Staff</h1>
          <p>Staff information published by the school.</p>
        </div>
      </section>
      <section className="section">
        <div className="site-container">
          {result.data.items.length === 0 ? (
            <PublicState message="There are no staff profiles published yet." title="No staff profiles" />
          ) : (
            <div className="staff-grid">
              {result.data.items.map((staff) => (
                <article className="news-item" key={staff.slug}>
                  {typeof staff.content.imageUrl === "string" && (
                    <CmsImage alt={staff.title} className="staff-photo" url={staff.content.imageUrl} />
                  )}
                  <h2>{staff.title}</h2>
                  {typeof staff.content.jobTitle === "string" && <p>{staff.content.jobTitle}</p>}
                  {typeof staff.content.department === "string" && <p>{staff.content.department}</p>}
                  {typeof staff.content.biography === "string" && <p>{staff.content.biography}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
