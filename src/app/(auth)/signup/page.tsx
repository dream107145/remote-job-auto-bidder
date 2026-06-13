"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { Spinner } from "@/components/ui/spinner";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) setError(result.error);
      if (result?.success) setSuccess(result.message || "Check your email.");
    });
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Check your email</CardTitle>
          <CardDescription>{success}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/signin">
            <Button variant="outline">Back to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center">
          <Logo size="lg" showText={false} />
        </div>
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>Start automating your job applications</CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" placeholder="John Doe" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
            <p className="text-xs text-muted-foreground">
              Min 12 chars with uppercase, lowercase, number, and special character
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner size="sm" className="mr-2" /> Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
