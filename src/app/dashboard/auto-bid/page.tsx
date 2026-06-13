"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { autoBidSettingsSchema, type AutoBidSettingsInput } from "@/lib/validations";
import { saveAutoBidSettings } from "@/actions/billing";
import { Zap, X } from "lucide-react";
import type { Profile } from "@/types";

function parseOptionalNumber(v: unknown) {
  if (v === "" || v == null) return undefined;
  const num = Number(v);
  return Number.isNaN(num) ? undefined : num;
}

function parseNumber(v: unknown) {
  if (v === "" || v == null) return undefined;
  const num = Number(v);
  return Number.isNaN(num) ? undefined : num;
}

async function fetchAutoBidData() {
  const [settingsRes, profilesRes] = await Promise.all([
    fetch("/api/auto-bid"),
    fetch("/api/profiles"),
  ]);
  const settings = settingsRes.ok ? (await settingsRes.json()).data : null;
  const profiles = profilesRes.ok ? (await profilesRes.json()).data : [];
  return { settings, profiles };
}

export default function AutoBidPage() {
  const queryClient = useQueryClient();
  const [skillInput, setSkillInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const { data, isLoading } = useQuery({
    queryKey: ["auto-bid"],
    queryFn: fetchAutoBidData,
  });

  const form = useForm<AutoBidSettingsInput>({
    resolver: zodResolver(autoBidSettingsSchema),
    defaultValues: {
      profileId: "",
      isEnabled: false,
      minSalary: undefined,
      maxSalary: undefined,
      jobTypes: [],
      requiredSkills: [],
      excludedCompanies: [],
      dailyBidLimit: 10,
    },
    values: data?.settings
      ? {
          profileId: data.settings.profile_id || "",
          isEnabled: data.settings.is_enabled,
          minSalary: data.settings.min_salary ?? undefined,
          maxSalary: data.settings.max_salary ?? undefined,
          jobTypes: data.settings.job_types || [],
          requiredSkills: data.settings.required_skills || [],
          excludedCompanies: data.settings.excluded_companies || [],
          dailyBidLimit: data.settings.daily_bid_limit ?? 10,
        }
      : undefined,
  });

  const requiredSkills = form.watch("requiredSkills") || [];
  const excludedCompanies = form.watch("excludedCompanies") || [];

  function onSubmit(formData: AutoBidSettingsInput) {
    startTransition(async () => {
      const result = await saveAutoBidSettings(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Auto-bid settings saved");
        queryClient.invalidateQueries({ queryKey: ["auto-bid"] });
      }
    });
  }

  if (isLoading) {
    return (
      <div>
        <DashboardHeader title="Auto Bid" />
        <PageLoader label="Loading auto-bid settings..." />
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Auto Bid" />

      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" /> Auto-Bidding Engine
                </CardTitle>
                <CardDescription>
                  Automatically find and apply to matching remote jobs
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch
                  id="enabled"
                  checked={form.watch("isEnabled")}
                  onCheckedChange={(checked) => form.setValue("isEnabled", checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label>Bidding Profile</Label>
                <Select
                  value={form.watch("profileId")}
                  onValueChange={(v) => form.setValue("profileId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.profiles as Profile[])?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="minSalary">Min Salary ($)</Label>
                  <Input
                    id="minSalary"
                    type="number"
                    min={0}
                    placeholder="80000"
                    {...form.register("minSalary", { setValueAs: parseOptionalNumber })}
                  />
                  {form.formState.errors.minSalary && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.minSalary.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSalary">Max Salary ($)</Label>
                  <Input
                    id="maxSalary"
                    type="number"
                    min={0}
                    placeholder="150000"
                    {...form.register("maxSalary", { setValueAs: parseOptionalNumber })}
                  />
                  {form.formState.errors.maxSalary && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.maxSalary.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyBidLimit">Daily Bid Limit</Label>
                  <Input
                    id="dailyBidLimit"
                    type="number"
                    min={1}
                    max={100}
                    {...form.register("dailyBidLimit", {
                      setValueAs: (v) => parseNumber(v) ?? 10,
                    })}
                  />
                  {form.formState.errors.dailyBidLimit && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.dailyBidLimit.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Required Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add required skill"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = skillInput.trim();
                        if (trimmed && !requiredSkills.includes(trimmed)) {
                          form.setValue("requiredSkills", [...requiredSkills, trimmed]);
                          setSkillInput("");
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          form.setValue(
                            "requiredSkills",
                            requiredSkills.filter((s) => s !== skill)
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Excluded Companies</Label>
                <div className="flex gap-2">
                  <Input
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    placeholder="Add company to exclude"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = companyInput.trim();
                        if (trimmed && !excludedCompanies.includes(trimmed)) {
                          form.setValue("excludedCompanies", [...excludedCompanies, trimmed]);
                          setCompanyInput("");
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {excludedCompanies.map((company) => (
                    <Badge key={company} variant="outline" className="gap-1">
                      {company}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          form.setValue(
                            "excludedCompanies",
                            excludedCompanies.filter((c) => c !== company)
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" /> Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
