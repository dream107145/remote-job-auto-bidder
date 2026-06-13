import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function VerifyPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a verification link to your email address. Please check your inbox
          and click the link to activate your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>Didn&apos;t receive the email? Check your spam folder or contact support.</p>
      </CardContent>
    </Card>
  );
}
