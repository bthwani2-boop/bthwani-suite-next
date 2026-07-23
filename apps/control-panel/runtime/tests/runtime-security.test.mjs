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

test("browser identity storage contains no durable real token store", () => {
  const storage = read("core/identity/clients/identity-session-storage.ts");
  assert.doesNotMatch(storage, /\blocalStorage\b/);
  assert.match(storage, /window\.sessionStorage/);

  const proxy = read("apps/control-panel/runtime/src/server/bff-proxy.ts");
  assert.match(proxy, /BFF_HTTP_ONLY_COOKIE_SESSION/);
  assert.match(proxy, /accessToken:\s*BFF_OPAQUE_TOKEN/);
  assert.match(proxy, /refreshToken:\s*BFF_OPAQUE_TOKEN/);
});

test("identity and service clients switch to cookie transport for relative bases", () => {
  const identityClient = read("core/identity/clients/identity-client.ts");
  assert.match(identityClient, /const cookieMode = isRelativeBaseUrl\(baseUrl\)/);
  assert.match(identityClient, /credentials:\s*"include"/);
  assert.match(identityClient, /!cookieMode && options\.token/);

  const kernel = read("services/dsh/frontend/shared/_kernel/dsh-http-request.ts");
  assert.match(kernel, /function resolveRequestUrl/);
  assert.match(kernel, /createDshPublicHttpClient/);
  assert.match(kernel, /createDshFlexibleHttpClient/);
  assert.match(kernel, /createDshRawHttpClient/);
  assert.match(kernel, /requestCredentials\(cookieMode\)/);
  assert.match(kernel, /!cookieMode && token/);

  const resolvers = [
    ["services/dsh/frontend/shared/_kernel/identity-api-base-url.ts", "/api/identity"],
    ["services/dsh/frontend/shared/_kernel/dsh-api-base-url.ts", "/api/dsh"],
    ["services/dsh/frontend/shared/_kernel/workforce-api-base-url.ts", "/api/workforce"],
    ["services/dsh/frontend/shared/_kernel/providers-api-base-url.ts", "/api/providers"],
    ["services/wlt/frontend/shared/dsh/wlt-dsh-api-base-url.ts", "/api/wlt"],
    ["services/dsh/frontend/shared/_kernel/platform-control-api-base-url.ts", "/api/platform-control"],
  ];
  for (const [file, expected] of resolvers) {
    assert.match(read(file), new RegExp(expected.replaceAll("/", "\\/")));
  }
});

test("all control-panel BFF routes share one HttpOnly cookie owner", () => {
  const sessionCookies = read("apps/control-panel/runtime/src/server/session-cookies.ts");
  const proxy = read("apps/control-panel/runtime/src/server/bff-proxy.ts");
  const authCookies = read("apps/control-panel/runtime/src/app/api/auth/_lib/cookies.ts");

  assert.match(sessionCookies, /ACCESS_TOKEN_COOKIE = "dsh_cp_at"/);
  assert.match(sessionCookies, /REFRESH_TOKEN_COOKIE = "dsh_cp_rt"/);
  assert.match(sessionCookies, /httpOnly:\s*true/);
  assert.match(sessionCookies, /sameSite:\s*"strict"/);
  assert.match(proxy, /from "\.\/session-cookies"/);
  assert.match(proxy, /BFF_ACCESS_COOKIE = ACCESS_TOKEN_COOKIE/);
  assert.match(proxy, /BFF_REFRESH_COOKIE = REFRESH_TOKEN_COOKIE/);
  assert.match(authCookies, /from "\.\.\/\.\.\/\.\.\/\.\.\/server\/session-cookies"/);
  assert.doesNotMatch(proxy, /bthwani_cp_access|bthwani_cp_refresh/);
});

test("all identity token rotation paths require control-panel operator role", () => {
  const proxy = read("apps/control-panel/runtime/src/server/bff-proxy.ts");
  const loginRoute = read("apps/control-panel/runtime/src/app/api/auth/login/route.ts");
  const refreshRoute = read("apps/control-panel/runtime/src/app/api/auth/refresh/route.ts");
  const sessionRoute = read("apps/control-panel/runtime/src/app/api/auth/session/route.ts");

  assert.match(proxy, /function tokenResponseHasOperatorIdentity/);
  assert.match(proxy, /roles\.includes\("operator"\)/);
  assert.match(proxy, /CONTROL_PANEL_FORBIDDEN/);
  assert.match(proxy, /clearSessionCookies\(response\)/);
  assert.match(loginRoute, /tokens\.identity\.roles\.includes\("operator"\)/);
  assert.match(refreshRoute, /rotated\.identity\.roles\.includes\("operator"\)/);
  assert.match(refreshRoute, /clearSessionCookies\(response\)/);
  assert.match(sessionRoute, /resolved\.identity\.roles\.includes\("operator"\)/);
});

test("dynamic BFF is limited to Identity and read-only WLT references", () => {
  const proxy = read("apps/control-panel/runtime/src/server/bff-proxy.ts");
  const route = read("apps/control-panel/runtime/src/app/api/[service]/[...path]/route.ts");
  const forwardedHeaders = proxy.match(
    /const FORWARDED_REQUEST_HEADERS = \[([\s\S]*?)\] as const;/,
  )?.[1];

  assert.ok(forwardedHeaders, "forwarded header allowlist must remain explicit");
  assert.doesNotMatch(forwardedHeaders, /authorization/i);
  assert.doesNotMatch(forwardedHeaders, /cookie/i);
  assert.doesNotMatch(forwardedHeaders, /x-service-caller/i);
  assert.match(proxy, /headers\.set\("authorization", `Bearer \$\{accessToken\}`\)/);
  assert.match(proxy, /BFF_CROSS_SITE_FORBIDDEN/);
  assert.match(proxy, /redirect:\s*"manual"/);
  assert.doesNotMatch(proxy, /redirect:\s*"follow"/);
  assert.match(route, /identity:\s*new Set\(\["auth", "identity"\]\)/);
  assert.match(route, /wlt:\s*new Set\(\["wlt"\]\)/);
  assert.doesNotMatch(route, /dsh:\s*new Set/);
  assert.doesNotMatch(route, /workforce:\s*new Set/);
  assert.doesNotMatch(route, /providers:\s*new Set/);
  assert.doesNotMatch(route, /"platform-control":\s*new Set/);
  assert.match(route, /BFF_SERVICE_NOT_ALLOWED/);
  assert.match(route, /BFF_PATH_NOT_ALLOWED/);
  assert.match(route, /Object\.hasOwn\(allowedPathPrefixes, service\)/);
});

test("authenticated business services use explicit static BFF routes", () => {
  const staticRoutes = [
    "apps/control-panel/runtime/src/app/api/dsh/[...path]/route.ts",
    "apps/control-panel/runtime/src/app/api/workforce/[...path]/route.ts",
    "apps/control-panel/runtime/src/app/api/providers/[...path]/route.ts",
    "apps/control-panel/runtime/src/app/api/platform-control/[...path]/route.ts",
  ];
  for (const routeFile of staticRoutes) {
    const route = read(routeFile);
    assert.match(route, /proxyAuthenticatedUpstream/);
  }
});

test("production BFF upstreams are server-only and fail closed when absent", () => {
  const proxy = read("apps/control-panel/runtime/src/server/bff-proxy.ts");
  for (const variable of ["IDENTITY_API_BASE_URL", "WLT_API_BASE_URL"]) {
    assert.match(proxy, new RegExp(`env: "${variable}"`));
  }
  assert.doesNotMatch(proxy, /NEXT_PUBLIC_[A-Z_]+_API_BASE_URL/);
  assert.match(proxy, /process\.env\.NODE_ENV === "production"/);
  assert.match(proxy, /BFF_UPSTREAM_NOT_CONFIGURED/);
  assert.match(proxy, /return null/);
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
