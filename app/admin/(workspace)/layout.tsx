import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminWorkspaceLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.get("school_session")?.value) redirect("/admin/login");
  return (
    <div className="admin-body">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
