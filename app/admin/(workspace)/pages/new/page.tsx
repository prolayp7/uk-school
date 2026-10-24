import { SchoolChooser } from "@/components/admin/school-chooser";
import { PageEditor } from "@/components/admin/page-editor";
import { getCmsContext } from "@/lib/server/cms";

export const metadata = { title: "Create website content" };

export default async function NewWebsitePage() {
  const { schoolId } = await getCmsContext();
  return (
    <main className="admin-content">
      {!schoolId ? (
        <SchoolChooser />
      ) : (
        <>
          <h1>Create content</h1>
          <p className="admin-lead">
            Draft content is saved to the school CMS and is not public until it is approved and published.
          </p>
          <PageEditor />
        </>
      )}
    </main>
  );
}
