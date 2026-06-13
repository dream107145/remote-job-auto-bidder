"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { changePassword } from "@/actions/auth";
import { Spinner } from "@/components/ui/spinner";

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  function handlePasswordChange(formData: FormData) {
    startTransition(async () => {
      const result = await changePassword(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(result?.message || "Password updated");
    });
  }

  return (
    <div>
      <DashboardHeader title="Settings" />

      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" name="currentPassword" type="password" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" name="newPassword" type="password" required />
                <p className="text-xs text-muted-foreground">
                  Min 12 chars with uppercase, lowercase, number, and special character
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" required />
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" /> Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>Add an extra layer of security to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable 2FA</p>
                <p className="text-sm text-muted-foreground">
                  Require a verification code in addition to your password
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={(checked) => {
                  setTwoFactorEnabled(checked);
                  toast.info(
                    checked
                      ? "2FA setup will be available in a future update"
                      : "2FA disabled"
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
