export const PLANS = {
  starter: { name: "Starter", price: 19, bidLimit: 50, profileLimit: 1 },
  pro: { name: "Pro", price: 49, bidLimit: 200, profileLimit: 3 },
  enterprise: { name: "Enterprise", price: 149, bidLimit: 1000, profileLimit: 10 },
  unlimited: { name: "Unlimited", price: 299, bidLimit: -1, profileLimit: -1 },
} as const;

export const BID_STATUSES = [
  "pending",
  "submitted",
  "interview",
  "rejected",
  "accepted",
] as const;

export const BID_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  submitted: "Submitted",
  interview: "Interview",
  rejected: "Rejected",
  accepted: "Accepted",
};

export const BID_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  interview: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
  { href: "/dashboard/profiles", label: "Profiles", icon: "User" },
  { href: "/dashboard/auto-bid", label: "Auto Bid", icon: "Zap" },
  { href: "/dashboard/manual-bid", label: "Manual Bid", icon: "Hand" },
  { href: "/dashboard/bids", label: "Bid History", icon: "History" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/dashboard/billing", label: "Billing", icon: "CreditCard" },
  { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/billing", label: "Billing", icon: "DollarSign" },
  { href: "/admin/job-sources", label: "Job Sources", icon: "Globe" },
  { href: "/admin/monitoring", label: "Monitoring", icon: "Activity" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "FileText" },
] as const;

export const BIDS_PER_PAGE = 20;
export const DEFAULT_PAGE_SIZE = 20;
export const ADMIN_PAGE_SIZE = 20;
export const MANUAL_BID_HISTORY_PAGE_SIZE = 10;
