import { ModuleListingDesign } from "@/components/admin/module-design";

export const metadata = { title: "Footer menu listing" };

export default function FooterMenuPage() {
  return (
    <ModuleListingDesign
      columns={["Menu label", "Destination", "Order", "Actions"]}
      description="Review the links shown in the public website footer."
      emptyDescription="Footer menu records will appear here once this module is connected to the CMS API."
      emptyTitle="No footer menu items to display"
      title="Footer menu listing"
    />
  );
}
