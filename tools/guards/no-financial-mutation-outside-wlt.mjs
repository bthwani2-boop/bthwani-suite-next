import { fail, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-financial-mutation-outside-wlt";
const violations = [];

const mutationRegex = /\b(createLedger|appendLedger|mutateWallet|setWalletBalance|updateWalletBalance|confirmPaymentProviderResult|createPayout|settlePayout|createRefund|settleRefund|markSettlement|walletBalance\s*=|ledgerEntries\.push|settlementStatus\s*=|payoutStatus\s*=|refundStatus\s*=)\b/g;

for (const file of listCodeFiles()) {
  if (file.startsWith("services/wlt/")) continue;
  if (file.startsWith("governance/") || file.startsWith("contracts/")) continue;
  if (file.includes("/tests/") || file.includes("/test/") || file.includes(".test.") || file.includes(".spec.")) continue;

  const content = read(file);
  let match;
  while ((match = mutationRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `financial mutation belongs to WLT only. Policy source: governance/02_SERVICES_AND_SURFACES.md`
    });
  }
}

fail(guardId, violations);