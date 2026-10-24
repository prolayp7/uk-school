import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/page-editor";
import { SchoolChooser } from "@/components/admin/school-chooser";
import { getCmsContext, getCmsPageSummary, getCmsVersions } from "@/lib/server/cms";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditWebsitePage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  if (!uuidPattern.test(pageId)) notFound();

  const { schoolId } = await getCmsContext();
  if (!schoolId) {
    return (
      <main className="admin-content">
        <SchoolChooser />
      </main>
    );
  }

  const [summary, versions] = await Promise.all([
    getCmsPageSummary(pageId),
    getCmsVersions(pageId),
  ]);
  if (summary.error?.status === 404 || versions.error?.status === 404) notFound();

  return (
    <main className="admin-content">
      {summary.error || versions.error ? (
        <div className="admin-error" role="alert">
          <h1>Page could not be loaded</h1>
          <p>{summary.error?.message ?? versions.error?.message}</p>
        </div>
      ) : (
        <>
          <h1>Edit website content</h1>
          <p className="admin-lead">
            Updates create a new draft revision. Published content stays live until the approved revision is published.
          </p>
          <PageEditor
            initialVersion={versions.data.items.find(
              (version) => version.versionNumber === summary.data.currentVersionNumber,
            )}
            page={summary.data}
            versions={versions.data.items}
          />
        </>
      )}
    </main>
  );
}
