import fs from "node:fs";

function replaceRequired(path, from, to, count = 1) {
  let text = fs.readFileSync(path, "utf8");
  let replacements = 0;
  while (text.includes(from) && replacements < count) {
    text = text.replace(from, to);
    replacements += 1;
  }
  if (replacements !== count) {
    throw new Error(`${path}: expected ${count} replacement(s), got ${replacements}`);
  }
  fs.writeFileSync(path, text, "utf8");
}

function replaceAllIfPresent(path, from, to) {
  const text = fs.readFileSync(path, "utf8");
  if (!text.includes(from)) return 0;
  const count = text.split(from).length - 1;
  fs.writeFileSync(path, text.split(from).join(to), "utf8");
  return count;
}

const dshClient = "services/dsh/backend/internal/wlt/client.go";
const headerMarker = `req.Header.Set("Authorization", "Bearer "+c.serviceToken)\n\treq.Header.Set("X-Service-Caller", "dsh")\n\tif input.CorrelationID != "" {`;
const headerReplacement = `req.Header.Set("Authorization", "Bearer "+c.serviceToken)\n\treq.Header.Set("X-Service-Caller", "dsh")\n\treq.Header.Set("X-Tenant-ID", input.TenantID)\n\tif input.CorrelationID != "" {`;
const dshText = fs.readFileSync(dshClient, "utf8");
if (!dshText.includes('req.Header.Set("X-Tenant-ID", input.TenantID)')) {
  replaceRequired(dshClient, headerMarker, headerReplacement);
}

const fallback = `COALESCE(to_jsonb(wlt_payment_sessions)->>'tenant_id', 'tenant-dev-001')`;
let removed = 0;
removed += replaceAllIfPresent("services/wlt/backend/internal/payment/payment.go", fallback, "tenant_id");
removed += replaceAllIfPresent("services/wlt/backend/internal/payment/sovereign_capture.go", fallback, "tenant_id");
console.log(`Removed ${removed} runtime tenant fallback(s).`);

const testPath = "services/wlt/backend/internal/reference/payment_session_test.go";
let tests = fs.readFileSync(testPath, "utf8");
if (!tests.includes("TestHandleCreatePaymentSessionRejectsTenantMismatch")) {
  tests += `

func TestHandleCreatePaymentSessionRejectsTenantMismatch(t *testing.T) {
\tt.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
\tbody := \`{"checkoutIntentId":"intent-1","tenantId":"tenant-a","clientId":"client-1","storeId":"store-1","paymentMethod":"cod","amountMinorUnits":100,"currency":"YER"}\`
\treq := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(body))
\treq.Header.Set("Authorization", "Bearer "+testDshServiceToken)
\treq.Header.Set("X-Service-Caller", "dsh")
\treq.Header.Set("X-Tenant-ID", "tenant-b")
\treq.Header.Set("Idempotency-Key", "idem-1")
\treq.Header.Set("X-Correlation-ID", "corr-1")
\trec := httptest.NewRecorder()

\tHandleCreatePaymentSession(nil).ServeHTTP(rec, req)

\tif rec.Code != http.StatusForbidden {
\t\tt.Fatalf("expected 403 for tenant mismatch, got %d: %s", rec.Code, rec.Body.String())
\t}
}
`;
  fs.writeFileSync(testPath, tests, "utf8");
}

console.log("Finance tenant lock patched idempotently.");
