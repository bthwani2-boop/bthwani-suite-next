import fs from 'node:fs';
import path from 'node:path';

const files = [
  'services/dsh/frontend/shared/checkout/use-checkout-controller.tsx',
  'services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx',
  'services/dsh/frontend/shared/orders/use-client-order-journey-controller.ts',
  'services/dsh/frontend/shared/orders/use-partner-order-commands.ts',
  'services/dsh/frontend/app-client/checkout/GovernedCheckoutScreen.tsx',
  'services/dsh/frontend/app-client/orders/useClientOrderJourneyController.ts',
  'services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx',
  'services/dsh/frontend/app-partner/orders/usePartnerOrderCommands.ts',
  'services/dsh/frontend/app-partner/orders/OperationalOrderDecisionScreen.tsx',
  'services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx',
  'services/dsh/frontend/shared/dispatch/use-dispatch-controller.ts',
  'services/dsh/frontend/shared/delivery/captain-inbox.mapper.ts',
  'services/dsh/frontend/shared/delivery/captain-inbox.model.ts',
  'services/dsh/frontend/app-captain/dispatch/DshCaptainOrdersScreen.tsx',
  'services/dsh/frontend/control-panel/operations/OrderJourneyDispatchAssignmentScreen.tsx',
  'services/dsh/frontend/shared/pickup/use-pickup-controller.tsx',
  'services/dsh/frontend/control-panel/operations/PickupWorkbenchScreen.tsx',
];

const violations = [];
const financialMutations = /\b(createLedger|appendLedger|mutateWallet|setWalletBalance|updateWalletBalance|confirmPaymentProviderResult|createPayout|settlePayout|createRefund|settleRefund|markSettlement|walletBalance\s*=|ledgerEntries\.push|settlementStatus\s*=|payoutStatus\s*=|refundStatus\s*=)\b/;
const providerAccess = /\b(WLT_FINANCIAL_PROVIDER_BASE_URL|wiremock-financial-provider|(?:card|payment|financial|electricity|telecom)[-_]?(?:gateway|provider)[-_]?(?:base[-_]?url|url|endpoint))\b/i;
const importRegex = /\b(?:import|export)\s+(?:[^'"`]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const toPosix = (value) => value.replaceAll(path.sep, '/');

for (const file of files) {
  if (!fs.existsSync(file)) {
    violations.push(`${file} is missing`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  const surfaceMatch = file.match(/^services\/([^/]+)\/frontend\/([^/]+)\//);
  const isSurface = Boolean(surfaceMatch && surfaceMatch[2] !== 'shared');
  const currentSurface = isSurface ? surfaceMatch[2] : null;
  const isShared = file.includes('/frontend/shared/');

  if (isSurface) {
    for (const [pattern, message] of [
      [/\bfetch\(/, 'direct fetch in surface'],
      [/\baxios\b/, 'axios in surface'],
      [/process\.env/, 'process.env in surface'],
      [/\bnew\s+URL\(/, 'runtime URL construction in surface'],
    ]) {
      if (pattern.test(content)) violations.push(`${file} ${message}`);
    }
  }

  if (financialMutations.test(content)) violations.push(`${file} financial mutation outside WLT`);
  if (providerAccess.test(content)) violations.push(`${file} direct financial provider access outside WLT`);

  importRegex.lastIndex = 0;
  let match;
  while ((match = importRegex.exec(content))) {
    const specifier = match[1];
    const resolved = specifier.startsWith('.')
      ? toPosix(path.relative('.', path.resolve(path.dirname(file), specifier)))
      : specifier;

    if (isSurface) {
      const importedSurface = resolved.match(/^services\/([^/]+)\/frontend\/([^/]+)\//)?.[2];
      if (importedSurface && importedSurface !== 'shared' && importedSurface !== currentSurface) {
        violations.push(`${file} imports other surface ${importedSurface}`);
      }
      if (/^services\/[^/]+\/(backend|clients|generated)\//.test(resolved) || /\.api(?:\.|\/|$)/.test(resolved) || /\.controller-core(?:\.|\/|$)/.test(resolved)) {
        violations.push(`${file} imports API/backend/controller-core directly`);
      }
    }

    if (isShared) {
      const importedSurface = resolved.match(/^services\/([^/]+)\/frontend\/([^/]+)\//)?.[2];
      if (importedSurface && importedSurface !== 'shared') violations.push(`${file} shared imports surface ${importedSurface}`);
      if (resolved.startsWith('apps/')) violations.push(`${file} shared imports apps runtime`);
    }
  }
}

if (violations.length > 0) {
  console.error('jrn-010-015-affected-boundary: FAIL');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('jrn-010-015-affected-boundary: PASS');
