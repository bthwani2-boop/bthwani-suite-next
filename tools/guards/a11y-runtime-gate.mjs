import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const guardId = "a11y-runtime-gate";
const baseUrl = process.env.A11Y_RUNTIME_URL?.trim();
if (!baseUrl) {
  console.error(`${guardId}: FAIL A11Y_RUNTIME_URL is required and must point to a running surface`);
  process.exit(1);
}

const paths = (process.env.A11Y_RUNTIME_PATHS ?? "/")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (paths.length === 0) {
  console.error(`${guardId}: FAIL A11Y_RUNTIME_PATHS resolved to an empty route set`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const findings = [];
try {
  const context = await browser.newContext({ locale: "ar-YE" });
  for (const route of paths) {
    const page = await context.newPage();
    const target = new URL(route, baseUrl).toString();
    const response = await page.goto(target, { waitUntil: "networkidle", timeout: 60_000 });
    if (!response || !response.ok()) {
      findings.push({ target, reason: `HTTP_${response?.status() ?? "NO_RESPONSE"}` });
      await page.close();
      continue;
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    for (const violation of result.violations) {
      findings.push({
        target,
        rule: violation.id,
        impact: violation.impact ?? "unknown",
        nodes: violation.nodes.length,
        help: violation.help,
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (findings.length > 0) {
  console.error(`${guardId}: FAIL`);
  for (const finding of findings) console.error(JSON.stringify(finding));
  process.exit(1);
}
console.log(`${guardId}: PASS routes=${paths.length}`);
