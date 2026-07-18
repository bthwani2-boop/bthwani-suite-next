import fs from 'node:fs';

function replaceAll(path, from, to) {
  const current = fs.readFileSync(path, 'utf8');
  if (!current.includes(from)) return 0;
  const count = current.split(from).length - 1;
  fs.writeFileSync(path, current.split(from).join(to), 'utf8');
  return count;
}

function replaceOnceIfMissing(path, marker, from, to) {
  const current = fs.readFileSync(path, 'utf8');
  if (current.includes(marker)) return false;
  if (!current.includes(from)) throw new Error(`${path}: required replacement marker not found`);
  fs.writeFileSync(path, current.replace(from, to), 'utf8');
  return true;
}

const tenantFallback = `COALESCE(to_jsonb(wlt_payment_sessions)->>'tenant_id', 'tenant-dev-001')`;
let removedTenantFallbacks = 0;
removedTenantFallbacks += replaceAll(
  'services/wlt/backend/internal/payment/payment.go',
  tenantFallback,
  'tenant_id',
);
removedTenantFallbacks += replaceAll(
  'services/wlt/backend/internal/payment/sovereign_capture.go',
  tenantFallback,
  'tenant_id',
);

replaceOnceIfMissing(
  'services/dsh/backend/internal/wlt/client.go',
  'req.Header.Set("X-Tenant-ID", input.TenantID)',
  'req.Header.Set("X-Service-Caller", "dsh")\n\tif input.CorrelationID != "" {',
  'req.Header.Set("X-Service-Caller", "dsh")\n\tif input.TenantID != "" {\n\t\treq.Header.Set("X-Tenant-ID", input.TenantID)\n\t}\n\tif input.CorrelationID != "" {',
);

replaceAll(
  'services/dsh/frontend/control-panel/finance/PayoutRequestsPanel.tsx',
  'const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;',
  'const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 0;',
);

console.log(`Finance source drift closure complete; removed ${removedTenantFallbacks} tenant fallback(s).`);
