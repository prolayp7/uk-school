import Link from "next/link";
import { PageList } from "@/components/admin/page-list";
import { SchoolChooser } from "@/components/admin/school-chooser";
import { getCmsContext, getCmsPages } from "@/lib/server/cms";

export const metadata = { title: "Manage website content" };

export default async function AdminHomePage() {
  const { schoolId } = await getCmsContext();
  if (!schoolId) {
    return (
      <main className="admin-content">
        <SchoolChooser />
      </main>
    );
  }

  const result = await getCmsPages(20, 0);
  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div>
          <h1>Website content</h1>
          <p className="admin-lead">Manage CMS pages and their publishing workflow.</p>
        </div>
        <Link className="admin-button admin-button-link" href="/admin/pages/new">
          Create content
        </Link>
      </div>
      <section aria-label="Website pages" className="admin-panel">
        {result.error ? (
          <div className="admin-error" role="alert">
            <h2>Pages could not be loaded</h2>
            <p>{result.error.message}</p>
            {result.error.status === 401 && <Link href="/admin/login">Sign in again</Link>}
          </div>
        ) : (
          <PageList initial={result.data} />
        )}
      </section>
    </main>
  );
}
