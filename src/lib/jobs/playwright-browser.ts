import type { Browser, LaunchOptions } from "playwright-core";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function isServerlessRuntime() {
  return process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function launchPlaywrightBrowser(
  options: LaunchOptions = {}
): Promise<Browser> {
  if (isServerlessRuntime()) {
    const [{ chromium }, sparticuzChromium] = await Promise.all([
      import("playwright-core"),
      import("@sparticuz/chromium"),
    ]);

    return chromium.launch({
      ...options,
      args: [...sparticuzChromium.default.args, ...(options.args ?? [])],
      executablePath: await sparticuzChromium.default.executablePath(),
      headless: options.headless ?? true,
    });
  }

  const { chromium } = await import("playwright");
  return chromium.launch(options);
}

export { USER_AGENT };
