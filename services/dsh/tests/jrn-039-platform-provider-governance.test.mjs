import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

function includesAll(content, values, label) {
  for (const value of values) {
    assert.ok(content.includes(value), `${label} is missing ${value}`);
  }
}

function excludesAll(content, values, label) {
  for (const value of values) {
    assert.ok(!content.includes(value), `${label} still contains forbidden ${value}`);
  }
}

test("JRN-039 provider mutation is providers-owned, idempotent, correlated, and atomically audited", () => {
  const server = read("core/providers/backend/internal/http/server.go");
  const service = read("core/providers/backend/internal/providers/service.go");
  const governedUpdate = read("core/providers/backend/internal/providers/governed_update.go");
  const repository = read("core/providers/backend/internal/providers/repository.go");
  const contract = read("core/providers/contracts/providers.openapi.yaml");
  const api = read("services/dsh/frontend/shared/platform/providers.api.ts");

  includesAll(server, [
    'identity.HasPermission("providers", action, "all")',
    'r.Header.Get("X-Correlation-ID")',
    'r.Header.Get("Idempotency-Key")',
  ], "Providers HTTP ownership");
  excludesAll(server, ['identity.HasPermission("workforce", action'], "Providers HTTP ownership");

  includesAll(service, [
    "providerUpdateRequestHash",
    "UpdateProviderGoverned",
    "CorrelationID:",
    "IdempotencyKey:",
  ], "Providers governed service mutation");

  includesAll(governedUpdate, [
    "BeginTx",
    "pg_advisory_xact_lock",
    "FOR UPDATE",
    "insertProviderAuditTx",
    "INSERT INTO providers_idempotency",
    "tx.Commit()",
  ], "Providers atomic mutation transaction");
  excludesAll(repository, ["func (r *Repository) UpdateProvider("], "Providers repository bypass");

  includesAll(contract, [
    "Idempotency-Key",
    "X-Correlation-ID",
    '"409":',
    "writeOnly: true",
  ], "Providers OpenAPI mutation contract");
  includesAll(api, [
    "idempotencyKey: mutationId",
    "correlationId: mutationId",
  ], "Providers shared frontend mutation client");
});

test("JRN-039 provider reads and health never expose secret runtime truth", () => {
  const model = read("core/providers/backend/internal/providers/model.go");
  const service = read("core/providers/backend/internal/providers/service.go");
  const migration = read("core/providers/database/migrations/providers-002_jrn_039_secret_safe_health.sql");
  const runtime = read("infra/docker/compose.runtime.yml");
  const panel = read("services/dsh/frontend/control-panel/platform/ProviderRegistryPanel.tsx");

  includesAll(model, [
    'CredentialConfigured bool',
    'Credentials          json.RawMessage `json:"-"`',
  ], "Providers secret-safe model");
  includesAll(service, [
    "sanitizeProviderParameters",
    "PROVIDERS_HEALTH_PROBE_ALLOWED_HOSTS",
    "http.ErrUseLastResponse",
    "Active provider has no governed health probe",
  ], "Providers secret-safe health service");
  includesAll(migration, [
    "active = false",
    "credentials = '{}'::jsonb",
    "external_providers_kind_active_idx",
  ], "Providers mock retirement migration");
  includesAll(runtime, [
    "PROVIDERS_HEALTH_PROBE_ALLOWED_HOSTS",
    "/providers/readiness",
  ], "Providers canonical runtime");
  includesAll(panel, [
    'hasServiceControlPanelPermission(identity, "providers", "provider:read")',
    'hasServiceControlPanelPermission(identity, "providers", "provider:update")',
    "وضع القراءة فقط",
  ], "Provider Registry permission states");
});
