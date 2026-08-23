import assert from "node:assert/strict";
import test from "node:test";

import {
  isPresignedMediaUrl,
  isPrivateIpv4,
  resolveGatewayRoute,
  rewritePresignedMediaLocation,
} from "../../../tools/dev/mobile-dev-gateway.mjs";

const presignedQuery = [
  "X-Amz-Algorithm=AWS4-HMAC-SHA256",
  "X-Amz-Credential=test%2F20260810%2Fus-east-1%2Fs3%2Faws4_request",
  "X-Amz-Date=20260810T120000Z",
  "X-Amz-Expires=3600",
  "X-Amz-SignedHeaders=host",
  "X-Amz-Signature=0123456789abcdef",
].join("&");

test("LAN gateway accepts only RFC1918 IPv4 hosts", () => {
  for (const address of ["10.0.0.8", "172.16.0.4", "172.31.255.254", "192.168.1.23"]) {
    assert.equal(isPrivateIpv4(address), true, address);
  }
  for (const address of ["127.0.0.1", "169.254.1.2", "172.32.0.1", "8.8.8.8", "0.0.0.0", "not-an-ip"]) {
    assert.equal(isPrivateIpv4(address), false, address);
  }
});

test("gateway service routes are fixed allowlisted upstreams", () => {
  assert.deepEqual(resolveGatewayRoute("/dsh/health?probe=1"), {
    kind: "service",
    host: "127.0.0.1",
    port: 58080,
    path: "/dsh/health?probe=1",
    requiresCapability: false,
  });
  assert.equal(resolveGatewayRoute("/identity/readiness")?.port, 18082);
  assert.equal(resolveGatewayRoute("/workforce/health")?.port, 58086);
  assert.equal(resolveGatewayRoute("/wlt/health"), null);
  assert.equal(resolveGatewayRoute("/http://example.com"), null);
});

test("developer sessions stay behind the capability-protected loopback broker route", () => {
  assert.deepEqual(resolveGatewayRoute("/__dev-session/session"), {
    kind: "dev-session",
    host: "127.0.0.1",
    port: 58100,
    path: "/session",
    requiresCapability: true,
  });
});

test("media route accepts only presigned requests and preserves signed path/query", () => {
  const signed = resolveGatewayRoute(`/__media/dsh-media/catalog/test.jpg?${presignedQuery}`);
  assert.equal(signed?.kind, "media");
  assert.equal(signed?.host, "127.0.0.1");
  assert.equal(signed?.port, 59000);
  assert.equal(signed?.presigned, true);
  assert.match(signed?.path ?? "", /^\/dsh-media\/catalog\/test\.jpg\?/);

  const unsigned = resolveGatewayRoute("/__media/dsh-media/catalog/test.jpg");
  assert.equal(unsigned?.presigned, false);
  assert.equal(isPresignedMediaUrl("http://localhost:59000/test"), false);
});

test("MinIO redirects are rewritten to the gateway without changing the signed object path or query", () => {
  const location = `http://localhost:59000/dsh-media/catalog/test.jpg?${presignedQuery}`;
  const rewritten = rewritePresignedMediaLocation(location, "http://192.168.1.20:58110");
  assert.equal(
    rewritten,
    `http://192.168.1.20:58110/__media/dsh-media/catalog/test.jpg?${presignedQuery}`,
  );

  assert.equal(
    rewritePresignedMediaLocation("https://example.com/public.jpg", "http://192.168.1.20:58110"),
    "https://example.com/public.jpg",
  );
});
