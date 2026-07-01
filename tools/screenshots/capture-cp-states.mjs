#!/usr/bin/env node
/**
 * Playwright script to capture control-panel store management screenshots
 * for all required Store Discovery evidence states.
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../../..");
const SCREENSHOTS_DIR = join(
  ROOT,
  "services/dsh/evidence/Store Discovery-store-discovery-fullstack-multi-surface/screenshots",
);

const CP_URL = "http://localhost:13000";
const DSH_OPERATOR_STORES = "**/dsh/operator/stores";

const USERNAME = "operator";
const PASSWORD = "123456";

if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const browser = await chromium.launch({ headless: true });

async function newPage() {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  return page;
}

async function doLogin(page) {
  await page.locator('[aria-label="اسم المستخدم"]').fill(USERNAME);
  await page.locator('[aria-label="كلمة المرور"]').fill(PASSWORD);
  await page.locator('button:text("تسجيل الدخول")').click();
}

// ─── 1. permission_denied ────────────────────────────────────────────────────
console.log("Capturing: control-panel-stores-admin-permission-denied.png");
{
  const page = await newPage();
  await page.goto(`${CP_URL}/dsh/partners/stores`);
  await page.waitForSelector('[aria-label="اسم المستخدم"]', { timeout: 15000 });
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, "control-panel-stores-admin-permission-denied.png"),
  });
  await page.close();
  console.log("  ✓ permission_denied");
}

// ─── 2. loading state ────────────────────────────────────────────────────────
console.log("Capturing: control-panel-stores-admin-loading.png");
{
  const page = await newPage();
  let delayResolve;
  const delayPromise = new Promise((resolve) => { delayResolve = resolve; });
  // Intercept operator stores to delay indefinitely until we screenshot
  await page.route(DSH_OPERATOR_STORES, async (route) => {
    await delayPromise;
    await route.abort();
  });
  await page.goto(`${CP_URL}/dsh/partners/stores`);
  await page.waitForSelector('[aria-label="اسم المستخدم"]', { timeout: 15000 });
  await doLogin(page);
  // Wait for the loading state panel to appear
  await page.waitForSelector('text=جاري التحميل', { timeout: 10000 });
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, "control-panel-stores-admin-loading.png"),
  });
  delayResolve(); // release the intercepted request
  await page.close();
  console.log("  ✓ loading");
}

// ─── 3. empty state ──────────────────────────────────────────────────────────
console.log("Capturing: control-panel-stores-admin-empty.png");
{
  const page = await newPage();
  await page.route(DSH_OPERATOR_STORES, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        stores: [],
        pagination: { total: 0, limit: 20, offset: 0 },
      }),
    });
  });
  await page.goto(`${CP_URL}/dsh/partners/stores`);
  await page.waitForSelector('[aria-label="اسم المستخدم"]', { timeout: 15000 });
  await doLogin(page);
  await page.waitForSelector('text=لا توجد متاجر', { timeout: 10000 });
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, "control-panel-stores-admin-empty.png"),
  });
  await page.close();
  console.log("  ✓ empty");
}

// ─── 4. error state ──────────────────────────────────────────────────────────
console.log("Capturing: control-panel-stores-admin-error.png");
{
  const page = await newPage();
  await page.route(DSH_OPERATOR_STORES, async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "store service error" }),
    });
  });
  await page.goto(`${CP_URL}/dsh/partners/stores`);
  await page.waitForSelector('[aria-label="اسم المستخدم"]', { timeout: 15000 });
  await doLogin(page);
  await page.waitForSelector('text=تعذر تحميل المتاجر', { timeout: 10000 });
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, "control-panel-stores-admin-error.png"),
  });
  await page.close();
  console.log("  ✓ error");
}

await browser.close();
console.log("All control-panel screenshots captured.");
