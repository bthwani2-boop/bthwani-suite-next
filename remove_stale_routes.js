const fs = require('fs');
const path = 'tools/guards/dsh-route-declaration-allowlist.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const staleRoutes = new Set([
  'GET /dsh/operator/admin/approvals',
  'GET /dsh/operator/admin/diagnostics',
  'GET /dsh/operator/admin/role-requests',
  'GET /dsh/operator/admin/rollback-requests',
  'POST /dsh/operator/admin/approvals/{approvalId}/review',
  'POST /dsh/operator/admin/approvals/{approvalId}/rollback-requests',
  'POST /dsh/operator/admin/role-requests/{requestId}/review',
  'POST /dsh/operator/admin/roles/requests',
  'POST /dsh/operator/admin/rollback-requests/{requestId}/review',
  'POST /dsh/operator/workforce/employees/{actorId}/media/uploads',
  'PUT /dsh/operator/catalog/stores/{storeId}/images/{role}'
]);

data.entries = data.entries.filter(entry => !staleRoutes.has(entry.route));
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('done');
