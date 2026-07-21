import fs from 'node:fs';

// This affected-only guard complements, but never replaces, repository-wide full-stack and WLT gates.
const violations = [];
const surfaceFiles = [
  'services/dsh/frontend/app-partner/orders/PartnerFulfillmentActionsPanel.tsx',
  'services/dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx',
  'services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx',
  'services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx',
  'services/dsh/frontend/control-panel/operations/PickupWorkbenchScreen.tsx',
  'services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx',
  'services/dsh/frontend/control-panel/operations/OrderJourneyDispatchAssignmentScreen.tsx',
];
const sharedFiles = [
  'services/dsh/frontend/shared/media/pod/delivery-proof-media.api.ts',
  'services/dsh/frontend/shared/delivery/delivery.actions.ts',
  'services/dsh/frontend/shared/delivery/use-captain-order-runtime.ts',
  'services/dsh/frontend/shared/partner-delivery/use-partner-delivery-controller.tsx',
  'services/dsh/frontend/shared/dispatch/use-partner-return-to-store-controller.ts',
  'services/dsh/frontend/shared/pickup/use-pickup-controller.tsx',
];

function read(file) {
  if (!fs.existsSync(file)) {
    violations.push(`${file}: required affected file is missing`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

for (const file of surfaceFiles) {
  const content = read(file);
  if (/\bfetch\(/.test(content)) violations.push(`${file}: direct fetch() in surface`);
  if (/\baxios\b/.test(content)) violations.push(`${file}: axios in surface`);
  if (/process\.env/.test(content)) violations.push(`${file}: process.env in surface`);
  if (/\bnew\s+URL\(/.test(content)) violations.push(`${file}: URL construction in surface`);
  if (file.endsWith('PartnerFulfillmentActionsPanel.tsx') && /style=\{\{/.test(content)) {
    violations.push(`${file}: inline styles remain in the JRN-015/JRN-016/JRN-020 fulfillment surface`);
  }

  for (const match of content.matchAll(/(?:from\s+|import\s*\()(["'])([^"']+)\1/g)) {
    const specifier = match[2];
    if (specifier.endsWith('.api') || specifier.includes('.api.') || specifier.includes('.api/')) {
      violations.push(`${file}: surface imports API adapter directly (${specifier})`);
    }
    if (specifier.includes('/frontend/app-') || specifier.includes('/frontend/control-panel')) {
      violations.push(`${file}: surface imports another surface (${specifier})`);
    }
  }
}

for (const file of sharedFiles) {
  const content = read(file);
  if (/frontend\/(?:app-[^/]+|control-panel)\//.test(content)) {
    violations.push(`${file}: shared brain imports a surface`);
  }
  if (/captain-confirmed-delivery/.test(content)) {
    violations.push(`${file}: synthetic delivery completion truth remains`);
  }
}

const routeRegistrar = read('services/dsh/backend/internal/http/server.go');
if (!/POST \/dsh\/captain\/dispatch\/assignments\/\{assignmentId\}\/status", protected\.handleGovernedUpdateDeliveryStatus/.test(routeRegistrar)) {
  violations.push('services/dsh/backend/internal/http/server.go: captain status route does not use the governed store-captain custody handler');
}
if (/POST \/dsh\/captain\/dispatch\/assignments\/\{assignmentId\}\/status", protected\.handleUpdateDeliveryStatus/.test(routeRegistrar)) {
  violations.push('services/dsh/backend/internal/http/server.go: legacy ungoverned captain status handler is registered');
}

if (violations.length > 0) {
  console.error(`FORBIDDEN: ${violations[0]}`);
  for (const violation of violations.slice(1)) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('[jrn-015-020-affected-boundary] PASS');
