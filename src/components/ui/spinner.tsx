import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function Spinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", sizes[size], className)}
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size="sm" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function ChartLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[300px] items-center justify-center", className)}>
      <Spinner size="lg" />
    </div>
  );
}
