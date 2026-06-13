"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import {
  LayoutDashboard,
  User,
  Zap,
  Hand,
  History,
  BarChart3,
  CreditCard,
  Settings,
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

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/profiles", label: "Profiles", icon: User },
  { href: "/dashboard/auto-bid", label: "Auto Bid", icon: Zap },
  { href: "/dashboard/manual-bid", label: "Manual Bid", icon: Hand },
  { href: "/dashboard/bids", label: "Bid History", icon: History },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface DashboardSidebarProps {
  user?: { full_name: string | null; email: string; avatar_url: string | null };
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
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
                <AvatarFallback>{getInitials(user?.full_name || user?.email || "U")}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">{user?.full_name || "User"}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

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
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-background transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function DashboardHeader({ title, children }: { title: string; children?: React.ReactNode }) {
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
