import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("control-panel emits governed browser security headers", () => {
  const config = read("apps/control-panel/runtime/next.config.ts");
  for (const header of [
    "Content-Security-Policy",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Permissions-Policy",
  ]) {
    assert.match(config, new RegExp(header.replaceAll("-", "\\-")));
  }
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /connect-src 'self'/);
  assert.match(config, /NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED:\s*"true"/);
});

test("browser identity tokens are not persisted in localStorage", () => {
  const storage = read("core/identity/clients/identity-session-storage.ts");
  assert.doesNotMatch(storage, /\blocalStorage\b/);
  assert.match(storage, /window\.sessionStorage/);
});

test("control-panel BFF keeps credentials server-side and rejects open proxy behavior", () => {
  const proxy = read("apps/control-panel/runtime/src/server/bff-proxy.ts");
  const route = read("apps/control-panel/runtime/src/app/api/[service]/[...path]/route.ts");
  const forwardedHeaders = proxy.match(
    /const FORWARDED_REQUEST_HEADERS = \[([\s\S]*?)\] as const;/,
  )?.[1];

  assert.ok(forwardedHeaders, "forwarded header allowlist must remain explicit");
  assert.doesNotMatch(forwardedHeaders, /authorization/i);
  assert.doesNotMatch(forwardedHeaders, /cookie/i);
  assert.doesNotMatch(forwardedHeaders, /x-service-caller/i);
  assert.match(proxy, /httpOnly:\s*true/);
  assert.match(proxy, /sameSite:\s*"strict"/);
  assert.match(proxy, /headers\.set\("authorization", `Bearer \$\{accessToken\}`\)/);
  assert.match(proxy, /BFF_HTTP_ONLY_COOKIE_SESSION/);
  assert.match(proxy, /BFF_CROSS_SITE_FORBIDDEN/);
  assert.match(proxy, /redirect:\s*"manual"/);
  assert.doesNotMatch(proxy, /redirect:\s*"follow"/);

  for (const service of [
    "dsh",
    "identity",
    "wlt",
    "workforce",
    "providers",
    "platform-control",
  ]) {
    assert.match(route, new RegExp(`"${service.replace("-", "\\-")}"`));
  }
  assert.match(route, /BFF_SERVICE_NOT_ALLOWED/);
});

test("web compatibility adapters preserve visible and truthful behavior", () => {
  const icons = read("apps/control-panel/runtime/stubs/ionicons-stub.js");
  assert.doesNotMatch(icons, /return\s+null/);
  assert.match(icons, /aria-label/);

  const netinfo = read("apps/control-panel/runtime/stubs/netinfo-stub.js");
  assert.match(netinfo, /navigator\.onLine/);
  assert.match(netinfo, /addEventListener\("online"/);
  assert.match(netinfo, /addEventListener\("offline"/);

  const picker = read("apps/control-panel/runtime/stubs/expo-image-picker-web.js");
  assert.match(picker, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(picker, /CAMERA_PERMISSION_DENIED/);
  assert.doesNotMatch(picker, /catch\s*\{\s*finish\(\{ canceled: true/);
});
