"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { getIndeedSettings, saveIndeedSettings } from "@/actions/indeed";
import { Badge } from "@/components/ui/badge";

export function IndeedSettingsCard() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [autoApply, setAutoApply] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    getIndeedSettings().then((result) => {
      if (result.success && result.data) {
        setEmail(result.data.email);
        setAutoApply(result.data.autoApply);
        setHasPassword(result.data.hasPassword);
      }
      setLoading(false);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("email", email);
    if (password) formData.set("password", password);
    if (autoApply) formData.set("autoApply", "on");

    startTransition(async () => {
      const result = await saveIndeedSettings(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.message || "Indeed settings saved");
        if (password) {
          setHasPassword(true);
          setPassword("");
        }
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Indeed Auto-Apply</CardTitle>
            <CardDescription>
              Connect your Indeed account to scrape jobs and submit applications via browser
              automation (Playwright).
            </CardDescription>
          </div>
          {hasPassword && (
            <Badge variant="outline" className="shrink-0">
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Spinner size="md" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="indeedEmail">Indeed Email</Label>
              <Input
                id="indeedEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="indeedPassword">
                Indeed Password
                {hasPassword && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (leave blank to keep current)
                  </span>
                )}
              </Label>
              <Input
                id="indeedPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={hasPassword ? "••••••••" : "Your Indeed password"}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Auto-apply on Indeed jobs</p>
                <p className="text-sm text-muted-foreground">
                  When enabled, manual bids on Indeed listings attempt Indeed Apply via web
                  scraping
                </p>
              </div>
              <Switch checked={autoApply} onCheckedChange={setAutoApply} />
            </div>
            <p className="text-xs text-muted-foreground">
              Admins sync Indeed jobs from Admin → Jobs. Respect Indeed&apos;s terms of service.
            </p>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Saving...
                </>
              ) : (
                "Save Indeed Settings"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
