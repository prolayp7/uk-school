import { ModuleListingDesign } from "@/components/admin/module-design";

export const metadata = { title: "Header menu listing" };

export default function HeaderMenuPage() {
  return (
    <ModuleListingDesign
      columns={["Menu label", "Destination", "Order", "Actions"]}
      description="Review the links shown in the public website header."
      emptyDescription="Header menu records will appear here once this module is connected to the CMS API."
      emptyTitle="No header menu items to display"
      title="Header menu listing"
    />
  );
}
