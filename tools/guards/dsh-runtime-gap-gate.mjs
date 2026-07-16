import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const targets = [
  { file: 'services/dsh/frontend/app-partner/DshPartnerSurface.tsx', matches: ['configureIdentitySession'] },
  { file: 'services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx', matches: ['storeScopeOptions', 'fakhama-1', 'fakhama-2', 'fakhama-3', 'yasmin', 'nada', "selectedStoreScopeId === 'all' ? ''", 'onOpenStoreScope={() => {}}', 'تم الحفظ محليًا', 'يحتاج تفعيل backend لاحقًا', 'ربط WLT قيد التنفيذ', 'دعوة محلية', 'runtimePartnerTeamMembers', 'runtimePartnerCoverageZones', 'runtimePartnerAnalytics', 'preview/seed data only in runtime UI', 'local financial calculation', 'WLT bridge with no finance query'] },
  { file: 'services/dsh/frontend/app-partner/orders/usePartnerOrdersRuntime.ts', matches: ['local_only_order_success', 'setOrders(localOptimisticFinalState)', 'mutation success without read-after-write'] },
  { file: 'services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx', matches: ['team-management', 'PartnerStoreScreen'] },
];

let failed = false;

for (const target of targets) {
  const filePath = path.join(ROOT_DIR, target.file);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const match of target.matches) {
    if (content.includes(match)) {
      console.error(`[dsh-runtime-gap-gate] FAIL: Found forbidden pattern "${match}" in ${target.file}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('[dsh-runtime-gap-gate] FAILED: DSH runtime gaps detected.');
  process.exit(1);
} else {
  console.log('[dsh-runtime-gap-gate] PASS: No DSH runtime gaps detected.');
  process.exit(0);
}
