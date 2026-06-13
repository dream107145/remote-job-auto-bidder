"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, Shield, BarChart3, Bot, Globe, Users, Trophy, TrendingUp } from "lucide-react";
import type { PlatformStats } from "@/actions/stats";

async function fetchStats(): Promise<PlatformStats> {
  const res = await fetch("/api/stats");
  if (!res.ok) throw new Error("Failed to load stats");
  return (await res.json()).data;
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-md transition-shadow hover:shadow-lg">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      {loading ? (
        <Spinner size="md" className="mb-2" />
      ) : (
        <p className="text-3xl font-bold tracking-tight">
          {value}
          {suffix && <span className="text-lg font-normal text-muted-foreground">{suffix}</span>}
        </p>
      )}
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function HomePage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: fetchStats,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="mb-8 flex justify-center">
            <Logo size="xl" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Automate Your Remote
            <br />
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              Job Applications
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            AI-powered auto-bidding platform that finds matching remote jobs,
            generates personalized cover letters, and submits applications on your behalf.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-2 text-center text-3xl font-bold">Platform at a Glance</h2>
            <p className="mb-10 text-center text-muted-foreground">
              Real-time stats from our auto-bidding engine
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Globe}
                label="Remote Job Sites"
                value={stats?.jobSitesCount ?? 0}
                loading={isLoading}
              />
              <StatCard
                icon={Users}
                label="Registered Users"
                value={stats?.usersCount ?? 0}
                loading={isLoading}
              />
              <StatCard
                icon={Trophy}
                label="Successful Bids"
                value={stats?.successfulBidsCount ?? 0}
                loading={isLoading}
              />
              <StatCard
                icon={TrendingUp}
                label="Success Rate"
                value={stats?.successRate ?? 0}
                suffix="%"
                loading={isLoading}
              />
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">Enterprise-Grade Features</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <Bot className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">AI Cover Letters & Resumes</h3>
                <p className="mt-2 text-muted-foreground">
                  GPT-powered cover letters and resume generation tailored to each job and profile.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <BarChart3 className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Analytics Dashboard</h3>
                <p className="mt-2 text-muted-foreground">
                  Track success rates, daily volume, and profile performance with detailed charts.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <Shield className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Multi-Profile Management</h3>
                <p className="mt-2 text-muted-foreground">
                  Manage multiple developer profiles with resumes, skills, and custom templates.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-muted-foreground">Pay with crypto. Scale as you grow.</p>
            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {[
                { name: "Starter", price: "$19", bids: "50 bids/mo", profiles: "1 profile" },
                { name: "Pro", price: "$49", bids: "200 bids/mo", profiles: "3 profiles" },
                { name: "Enterprise", price: "$149", bids: "1000 bids/mo", profiles: "10 profiles" },
                { name: "Unlimited", price: "$299", bids: "Unlimited", profiles: "Unlimited" },
              ].map((plan) => (
                <div key={plan.name} className="rounded-lg border bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-bold">
                    {plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li>{plan.bids}</li>
                    <li>{plan.profiles}</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Remote Job Auto Bidder. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
