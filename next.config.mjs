/** @type {import('next').NextConfig} */
const sparticuzChromiumInclude = ["./node_modules/@sparticuz/chromium/**/*"];

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "playwright",
      "playwright-core",
      "@sparticuz/chromium",
      "cheerio",
    ],
    outputFileTracingIncludes: {
      "/api/admin/jobs/route": sparticuzChromiumInclude,
      "/api/admin/job-sources/route": sparticuzChromiumInclude,
      "/api/cron/route": sparticuzChromiumInclude,
    },
  },
};

export default nextConfig;
