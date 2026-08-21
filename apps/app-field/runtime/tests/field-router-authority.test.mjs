import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../../../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

test('field route contract maps every operational destination to Expo Router paths', async () => {
  const routes = await read('services/dsh/frontend/app-field/dsh-field.routes.ts');
  const routeScreen = await read('apps/app-field/runtime/src/navigation/FieldRouteScreen.tsx');
  assert.match(routes, /export type DshFieldNavigation/);
  assert.match(routes, /export function dshFieldRouteToPath/);
  for (const marker of [
    "case 'stores': return '/'",
    "case 'work-queue': return '/work-queue'",
    "case 'finance': return '/finance'",
    "case 'account': return '/account'",
    "case 'profile': return '/account/profile'",
    "case 'profile-completion': return '/account/completion'",
    'onboarding/assignments/',
    'partners/${segment(route.partnerId)}',
    'stores/${segment(route.storeId)}/visit',
    'stores/${segment(route.storeId)}/visits/${segment(route.visitId)}/verification',
    'stores/${segment(route.storeId)}/visits/${segment(route.visitId)}/checklist',
  ]) assert.match(routes, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(routeScreen, /useRouter/);
  assert.match(routeScreen, /router\.push/);
  assert.match(routeScreen, /router\.back/);
});

test('field Expo Router tree covers identity-bearing routes and redirects malformed params', async () => {
  const files = [
    'apps/app-field/runtime/app/index.tsx',
    'apps/app-field/runtime/app/work-queue.tsx',
    'apps/app-field/runtime/app/onboarding/assignments/[assignmentId].tsx',
    'apps/app-field/runtime/app/partners/[partnerId].tsx',
    'apps/app-field/runtime/app/partners/[partnerId]/products.tsx',
    'apps/app-field/runtime/app/stores/[storeId]/visit.tsx',
    'apps/app-field/runtime/app/stores/[storeId]/visits/[visitId]/checklist.tsx',
    'apps/app-field/runtime/app/stores/[storeId]/visits/[visitId]/verification.tsx',
  ];
  const combined = (await Promise.all(files.map(read))).join('\n');
  assert.match(combined, /FieldRouteScreen/);
  assert.match(combined, /useLocalSearchParams/);
  assert.match(combined, /Redirect href="\/work-queue"/);
  assert.match(combined, /Redirect href="\/"/);
});
