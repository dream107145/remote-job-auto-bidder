export interface IndeedApplyInput {
  jobUrl: string;
  email: string;
  password: string;
  coverLetter: string;
  applicantName: string;
  applicantEmail: string;
}

export interface IndeedApplyResult {
  applied: boolean;
  method: "indeed_apply" | "skipped" | "manual_required";
  message: string;
}

export async function applyToIndeedJob(input: IndeedApplyInput): Promise<IndeedApplyResult> {
  if (!input.email || !input.password) {
    return {
      applied: false,
      method: "skipped",
      message: "Indeed credentials not configured",
    };
  }

  try {
    const { chromium } = await import("playwright");

    const browser = await chromium.launch({
      headless: process.env.INDEED_HEADLESS !== "false",
    });

    try {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);

      await page.goto("https://secure.indeed.com/account/login", {
        waitUntil: "domcontentloaded",
      });

      const emailInput = page.locator('input[type="email"], input[name="__email"]').first();
      await emailInput.waitFor({ state: "visible", timeout: 15000 });
      await emailInput.fill(input.email);

      const continueBtn = page.locator('button[type="submit"], button:has-text("Continue")').first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
      }

      const passwordInput = page.locator('input[type="password"], input[name="__password"]').first();
      await passwordInput.waitFor({ state: "visible", timeout: 15000 });
      await passwordInput.fill(input.password);

      await page.locator('button[type="submit"], button:has-text("Sign in")').first().click();
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => undefined);

      await page.goto(input.jobUrl, { waitUntil: "domcontentloaded" });

      const applySelectors = [
        "#indeedApplyButton",
        "button:has-text('Apply now')",
        "button:has-text('Apply on company site')",
        "a:has-text('Apply now')",
      ];

      let applyClicked = false;
      for (const selector of applySelectors) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          applyClicked = true;
          break;
        }
      }

      if (!applyClicked) {
        return {
          applied: false,
          method: "manual_required",
          message: "No Indeed Apply button found — apply manually on Indeed",
        };
      }

      await page.waitForTimeout(2000);

      const coverLetterField = page
        .locator(
          'textarea[name*="cover"], textarea[id*="cover"], textarea[aria-label*="cover" i], textarea'
        )
        .first();

      if (await coverLetterField.isVisible().catch(() => false)) {
        await coverLetterField.fill(input.coverLetter);
      }

      const nameField = page.locator('input[name*="name" i], input[id*="applicant.name" i]').first();
      if (await nameField.isVisible().catch(() => false)) {
        await nameField.fill(input.applicantName);
      }

      const emailField = page.locator('input[type="email"]').first();
      if (await emailField.isVisible().catch(() => false)) {
        await emailField.fill(input.applicantEmail);
      }

      const submitSelectors = [
        "button:has-text('Submit application')",
        "button:has-text('Continue')",
        "button:has-text('Apply')",
        "button[type='submit']",
      ];

      for (const selector of submitSelectors) {
        const submit = page.locator(selector).first();
        if (await submit.isVisible().catch(() => false)) {
          await submit.click();
          await page.waitForTimeout(3000);
          break;
        }
      }

      const pageText = (await page.content()).toLowerCase();
      const submitted =
        pageText.includes("application submitted") ||
        pageText.includes("you applied") ||
        pageText.includes("application has been submitted");

      return {
        applied: submitted,
        method: "indeed_apply",
        message: submitted
          ? "Application submitted on Indeed"
          : "Indeed Apply flow started — verify submission on Indeed",
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return {
      applied: false,
      method: "manual_required",
      message: (error as Error).message || "Indeed apply automation failed",
    };
  }
}
