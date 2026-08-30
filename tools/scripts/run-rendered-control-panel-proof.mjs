import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeToolEvidence } from "./capture-tool-evidence.mjs";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const portArg = process.argv.find((v) => v.startsWith("--port="));
const port = Number(portArg?.split("=")[1] ?? 13000);
const baseURL = `http://127.0.0.1:${port}`;
const evidenceDir = mkdtempSync(path.join(tmpdir(), "bthwani-rendered-web-"));
const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

async function waitForServer(url, timeoutMs = 120000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return response.status;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Control Panel did not become reachable: ${lastError?.message ?? "timeout"}`);
}

function stopProcess(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function main() {
  let server;
  let browser;
  const serverChunks = [];
  const serverLog = path.join(evidenceDir, "control-panel-server.log");
  try {
    const serverArgs = ["--dir", "apps/control-panel/runtime", "exec", "next", "dev", "--hostname", "127.0.0.1", "--port", String(port)];
    const usesWindowsCommandShim = process.platform === "win32";
    const executable = usesWindowsCommandShim ? (process.env.ComSpec ?? "cmd.exe") : pnpm;
    const executableArgs = usesWindowsCommandShim ? ["/d", "/s", "/c", pnpm, ...serverArgs] : serverArgs;
    server = spawn(executable, executableArgs, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY:
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY ?? "AIza00000000000000000000000000000000000",
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    server.stdout.on("data", (chunk) => serverChunks.push(chunk));
    server.stderr.on("data", (chunk) => serverChunks.push(chunk));

    await waitForServer(`${baseURL}/dsh/login`);
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      const message = String(error?.message ?? error);
      if (/Executable doesn't exist|playwright install/i.test(message)) {
        process.stderr.write("NOT_COVERED: Playwright Chromium is not installed. Run: pnpm exec playwright install chromium\n");
        process.exitCode = 3;
        return;
      }
      throw error;
    }

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${baseURL}/dsh/login`, { waitUntil: "networkidle", timeout: 120000 });

    const html = page.locator("html");
    const lang = await html.getAttribute("lang");
    const dir = await html.getAttribute("dir");
    const title = await page.title();
    if (lang !== "ar") throw new Error(`Expected html lang=ar, got ${lang}`);
    if (dir !== "rtl") throw new Error(`Expected html dir=rtl, got ${dir}`);

    const formCount = await page.locator("form").count();
    const alertCount = await page.getByRole("alert").count();
    if (formCount === 0 && alertCount === 0) {
      throw new Error("Login surface rendered neither an authentication form nor an explicit service-unavailable alert");
    }

    await page.keyboard.press("Tab");
    const activeTag = await page.evaluate(() => document.activeElement?.tagName ?? null);
    if (!activeTag || !["INPUT", "BUTTON", "A"].includes(activeTag)) {
      throw new Error(`Keyboard focus did not enter an interactive element; active=${activeTag}`);
    }

    const axe = await new AxeBuilder({ page }).analyze();
    const violations = axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
    }));
    if (violations.length > 0) {
      writeFileSync(path.join(evidenceDir, "axe-violations.json"), JSON.stringify(axe.violations, null, 2));
    }

    const screenshot = path.join(evidenceDir, "dsh-login.png");
    await page.screenshot({ path: screenshot, fullPage: true });

    const manifest = {
      schemaVersion: 1,
      candidateSha,
      status: violations.length === 0 ? "PASS" : "FAIL",
      claim: "rendered-control-panel-login-baseline",
      url: `${baseURL}/dsh/login`,
      title,
      lang,
      dir,
      formCount,
      alertCount,
      focusedTag: activeTag,
      accessibilityViolations: violations,
      screenshot,
      evidenceDir,
    };
    const manifestPath = path.join(evidenceDir, "manifest.json");
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\nEVIDENCE_MANIFEST=${manifestPath}\n`);
    writeToolEvidence({
      toolId: "rendered-web",
      status: violations.length === 0 ? "PASS" : "FAIL",
      exitCode: violations.length === 0 ? 0 : 1,
      rawText: JSON.stringify(manifest),
      nativePayload: manifest,
      rawPath: manifestPath,
      claim: "Rendered Web and Axe evidence",
      scope: "exact candidate login journey",
    });
    if (violations.length > 0) process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) {
      stopProcess(server);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      writeFileSync(serverLog, Buffer.concat(serverChunks).toString("utf8"));
    }
  }
}

await main();
