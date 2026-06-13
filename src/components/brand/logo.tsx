import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: { icon: 28, text: "text-lg" },
  md: { icon: 36, text: "text-xl" },
  lg: { icon: 48, text: "text-2xl" },
  xl: { icon: 72, text: "text-4xl" },
};

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="logoGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="0.5" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="boltGrad" x1="28" y1="12" x2="40" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#logoGrad)" />
        <rect x="4" y="4" width="56" height="56" rx="16" fill="white" fillOpacity="0.08" />
        <circle cx="32" cy="32" r="18" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="4 3" />
        <path
          d="M36 14L26 34h8l-4 16 14-22h-8l4-14z"
          fill="url(#boltGrad)"
          stroke="white"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <circle cx="48" cy="16" r="3" fill="#22d3ee" />
        <circle cx="16" cy="48" r="2.5" fill="#a78bfa" />
      </svg>
      {showText && (
        <span className={cn("font-bold tracking-tight", text)}>
          Auto<span className="text-primary">Bidder</span>
        </span>
      )}
    </div>
  );
}

export function LogoMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="markGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="markBolt" x1="28" y1="12" x2="40" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#markGrad)" />
      <path
        d="M36 14L26 34h8l-4 16 14-22h-8l4-14z"
        fill="url(#markBolt)"
        stroke="white"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
