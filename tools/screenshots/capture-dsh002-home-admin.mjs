#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../../..");
const output = join(root, "services/dsh/evidence/DSH-002-home-discovery-fullstack/screenshots");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const baseUrl = "http://localhost:13000";

async function login(page) {
  await page.locator('[aria-label="اسم المستخدم"]').fill("operator");
  await page.locator('[aria-label="كلمة المرور"]').fill("123456");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
}

async function capture(kind, state) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const api = `**/dsh/operator/home-discovery/${kind}`;
  if (state === "loading") {
    await page.route(api, () => new Promise(() => undefined));
  } else if (state === "empty") {
    await page.route(api, (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"items":[]}' }));
  } else if (state === "error") {
    await page.route(api, (route) => route.fulfill({ status: 500, contentType: "application/json", body: '{"code":"INTERNAL_ERROR"}' }));
  }
  await page.goto(`${baseUrl}/dsh/marketing/home-discovery/${kind}`);
  await page.waitForSelector('[aria-label="اسم المستخدم"]', { timeout: 20000 });
  await login(page);
  const marker = {
    loading: "جاري تحميل المحتوى",
    empty: "لا يوجد محتوى",
    error: "تعذر تحميل المحتوى",
    success: "تحكم مباشر بالمحتوى",
  }[state];
  await page.getByText(marker, { exact: false }).first().waitFor({ timeout: 20000 });
  await page.screenshot({ path: join(output, `control-panel-home-${kind}-${state}.png`), fullPage: true });
  await page.close();
}

for (const kind of ["banners", "promos", "categories"]) {
  for (const state of ["loading", "success", "empty", "error"]) {
    await capture(kind, state);
    console.log(`captured ${kind}:${state}`);
  }
}

await browser.close();
