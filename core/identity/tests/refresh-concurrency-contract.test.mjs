import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("refresh concurrency is coordinated by Identity and PostgreSQL, not process-local BFF memory", async () => {
  const [
    migration,
    manifest,
    repositoryBoundary,
    httpBoundary,
    main,
    overlay,
    contractManifest,
    serverSession,
  ] = await Promise.all([
    read("core/identity/database/migrations/identity-001_canonical_baseline.sql"),
    read("core/identity/database/migrations/manifest.json"),
    read("core/identity/backend/internal/identity/refresh_concurrency.go"),
    read("core/identity/backend/internal/http/refresh_concurrency_boundary.go"),
    read("core/identity/backend/cmd/identity-api/main.go"),
    read("core/identity/contracts/identity.refresh-concurrency.overlay.yaml"),
    read("core/identity/contracts/contract.manifest.yaml"),
    read("apps/control-panel/runtime/src/app/api/auth/_lib/session.ts"),
  ]);

  assert.match(migration, /previous_refresh_token_hash/);
  assert.match(migration, /refresh_rotated_at/);
  assert.match(migration, /CREATE TRIGGER identity_sessions_capture_refresh_rotation/);
  assert.match(migration, /NEW\.previous_refresh_token_hash := OLD\.refresh_token_hash/);

  assert.match(repositoryBoundary, /pg_advisory_xact_lock/);
  assert.match(repositoryBoundary, /ErrRefreshAlreadyRotated/);
  assert.match(repositoryBoundary, /refreshConcurrencyWindow/);
  assert.match(repositoryBoundary, /previousHash\.String == presentedHash/);
  assert.match(repositoryBoundary, /r\.Refresh\(ctx, refreshToken\)/);

  assert.match(httpBoundary, /REFRESH_ALREADY_ROTATED/);
  assert.match(httpBoundary, /http\.StatusConflict/);
  assert.match(main, /GovernedRefreshBoundary\(repository, baseRouter\)/);

  assert.match(overlay, /'409':/);
  assert.match(overlay, /REFRESH_ALREADY_ROTATED/);
  assert.match(contractManifest, /identity\.refresh-concurrency\.overlay\.yaml/);
  assert.match(manifest, /identity-001_canonical_baseline\.sql/);

  assert.doesNotMatch(serverSession, /inFlightRefresh/);
  assert.doesNotMatch(serverSession, /new Map<string, Promise<TokenResponse>>/);
});

test("control-panel BFF preserves cookies for a concurrent refresh loser", async () => {
  const [identityServer, refreshRoute, sessionRoute, bffProxy] = await Promise.all([
    read("apps/control-panel/runtime/src/app/api/auth/_lib/identity-server.ts"),
    read("apps/control-panel/runtime/src/app/api/auth/refresh/route.ts"),
    read("apps/control-panel/runtime/src/app/api/auth/session/route.ts"),
    read("apps/control-panel/runtime/src/server/bff-proxy.adapter.ts"),
  ]);

  assert.match(identityServer, /isConcurrentRefreshError/);
  assert.match(identityServer, /typed\.status === 409/);
  assert.match(identityServer, /REFRESH_ALREADY_ROTATED/);

  for (const source of [refreshRoute, sessionRoute, bffProxy]) {
    assert.match(source, /REFRESH_ALREADY_ROTATED/);
    assert.match(source, /409/);
  }

  assert.match(refreshRoute, /if \(isConcurrentRefreshError\(error\)\)[\s\S]*?return NextResponse\.json/s);
  assert.doesNotMatch(
    refreshRoute.match(/if \(isConcurrentRefreshError\(error\)\)[\s\S]*?\n\s*}/)?.[0] ?? "",
    /clearSessionCookies/,
  );
  assert.match(bffProxy, /refreshFailureResponse/);
  assert.match(bffProxy, /isConcurrentRefreshError\(error\)/);
  assert.match(bffProxy, /logoutRevocationConfirmed/);
});
