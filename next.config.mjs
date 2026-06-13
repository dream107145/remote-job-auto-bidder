/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["playwright", "cheerio"],
    outputFileTracingIncludes: {
      "/api/admin/jobs/route": ["./node_modules/playwright/.local-browsers/**/*"],
      "/api/admin/job-sources/route": ["./node_modules/playwright/.local-browsers/**/*"],
      "/api/cron/route": ["./node_modules/playwright/.local-browsers/**/*"],
    },
  },
};

export default nextConfig;
