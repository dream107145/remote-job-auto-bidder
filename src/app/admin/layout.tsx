import { redirect } from "next/navigation";
import { getUser } from "@/actions/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/signin");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar user={user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
