import { redirect } from "next/navigation";
import { getUser } from "@/actions/auth";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/signin");

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar user={user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
