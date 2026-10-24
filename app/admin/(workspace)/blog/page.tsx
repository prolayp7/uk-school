import { ModuleListingDesign } from "@/components/admin/module-design";

export const metadata = { title: "Blog listing" };

export default function BlogListingPage() {
  return (
    <ModuleListingDesign
      addHref="/admin/blog/new"
      addLabel="Add blog post"
      columns={["Post title", "Status", "Last updated", "Actions"]}
      description="Review and manage the school website blog."
      emptyDescription="Blog post records will appear here once this module is connected to the CMS API."
      emptyTitle="No blog posts to display"
      title="Blog listing"
    />
  );
}
