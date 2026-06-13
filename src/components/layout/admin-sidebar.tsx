"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Globe,
  Activity,
  FileText,
  Briefcase,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn, getInitials, isNavItemActive } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/actions/auth";
import { useState } from "react";

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/billing", label: "Billing", icon: DollarSign },
  { href: "/admin/job-sources", label: "Job Sources", icon: Globe },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
];

interface AdminSidebarProps {
  user?: { full_name: string | null; email: string; avatar_url: string | null };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-background transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <LogoMark size={28} />
          <span className="text-lg font-bold">Admin</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(user?.full_name || user?.email || "A")}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{user?.full_name || "Admin"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/dashboard">User Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

export function AdminHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
