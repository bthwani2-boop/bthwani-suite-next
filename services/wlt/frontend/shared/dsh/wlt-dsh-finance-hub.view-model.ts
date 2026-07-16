import type {
  WltDshFinanceRuntimeReadModel,
  WltDshFinanceRuntimeResult,
  WltDshFinanceHubViewModel,
  WltFinancialCenter,
  WltFinancialCenterSection,
  WltAccountPositionLine,
  WltFinancialSummaryRaw,
  WltLedgerEntryFormatted,
  WltLedgerEntryKind,
  WltLedgerEntryStatus,
} from "./wlt-dsh-finance-hub.types";

export function formatWltYer(minorUnits: number): string {
  const major = Math.abs(minorUnits) / 100;
  try {
    return `${major.toLocaleString('ar-YE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ر.ي`;
  } catch {
    return `${major.toLocaleString('ar', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ر.ي`;
  }
}

export function resolveWltFinanceBusinessDate(now: Date = new Date()): string {
  return now.toISOString().split('T')[0]!;
}

function mapEntryKind(referenceType: string): WltLedgerEntryKind {
  if (referenceType === 'payment_session') return 'wallet-movement';
  if (referenceType === 'refund') return 'refund';
  if (referenceType === 'settlement') return 'partner-settlement';
  return 'other';
}

function mapEntryStatus(status: string): WltLedgerEntryStatus {
  if (status === 'COMPLETED') return 'posted';
  if (status === 'FAILED') return 'blocked';
  if (status === 'REVERSED') return 'disputed';
  return 'pending';
}

// Human-readable Arabic labels for the fixed, real wlt_ledger_accounts
// account types (see services/wlt/database/migrations/wlt-017_ledger_kernel.sql).
// Unlike the account codes this file used to invent (5001/2001/1010/...),
// these keys are the actual backend account_type values -- this map only
// supplies display text, it does not decide category or debit/credit
// direction (the backend's /wlt/ledger/financial-summary response already
// carries category + normalBalanceSide computed server-side).
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  wallet: 'محافظ المستخدمين',
  platform_revenue: 'إيرادات المنصة',
  platform_payable: 'مستحقات الدفع',
  provider_clearing: 'مقاصة مزود الدفع',
  platform_commission_receivable: 'عمولات مستحقة القبض',
};

const SECTION_LABELS: Record<WltFinancialCenterSection['sectionType'], string> = {
  asset: 'الأصول',
  liability: 'الالتزامات',
  revenue: 'الإيرادات',
  expense: 'المصروفات',
};

// Builds the Assets/Liabilities/Revenue/Expense sections and net position
// directly from the WLT ledger-kernel summary (GET /wlt/ledger/financial-summary) --
// no client-side debit/credit inference, no invented account codes, no *100
// unit conversion. Picks the YER currency bucket (the platform's primary
// currency); if that is ever multi-currency in practice, this intentionally
// does not sum across currencies (that would be meaningless) -- it falls
// back to the first available currency bucket instead.
function buildFinancialCenterSections(summary: WltFinancialSummaryRaw | null): {
  sections: WltFinancialCenterSection[];
  totalAssets: number;
  totalLiabilities: number;
  totalRevenue: number;
  totalExpenses: number;
  netPosition: number;
  dataCompletenessNotes: readonly string[];
} {
  const currencySummary = summary?.currencies.find((c) => c.currency === 'YER') ?? summary?.currencies[0] ?? null;

  const section = (type: WltFinancialCenterSection['sectionType']): WltFinancialCenterSection => {
    const accounts = (currencySummary?.accounts ?? []).filter((a) => a.category === type);
    const lines: WltAccountPositionLine[] = accounts.map((a) => ({
      accountCode: a.accountType,
      accountLabel: ACCOUNT_TYPE_LABELS[a.accountType] ?? a.accountType,
      accountType: type,
      totalMinorUnits: a.balanceMinorUnits,
      totalLabel: formatWltYer(a.balanceMinorUnits),
      entryCount: 0,
      pendingCount: 0,
      entries: [],
      isPreview: false,
    }));
    const totalMinorUnits = lines.reduce((sum, line) => sum + line.totalMinorUnits, 0);
    return { sectionType: type, sectionLabel: SECTION_LABELS[type], totalMinorUnits, totalLabel: formatWltYer(totalMinorUnits), lines };
  };

  const assetSection = section('asset');
  const liabilitySection = section('liability');
  const revenueSection = section('revenue');
  const expenseSection = section('expense');

  return {
    sections: [assetSection, liabilitySection, revenueSection, expenseSection],
    totalAssets: assetSection.totalMinorUnits,
    totalLiabilities: liabilitySection.totalMinorUnits,
    totalRevenue: revenueSection.totalMinorUnits,
    totalExpenses: expenseSection.totalMinorUnits,
    netPosition: currencySummary?.netPositionMinorUnits ?? 0,
    dataCompletenessNotes: summary?.dataCompleteness ?? [],
  };
}

import type { components } from "../../../clients/generated/wlt-api";
type WltLedgerEntry = components["schemas"]["WltLedgerEntry"];

function partyLabel(entry: WltLedgerEntry): string {
  const subject = (entry as any).subject ?? entry.actorId ?? '';
  if (subject.startsWith('captain')) return `كابتن · ${subject}`;
  if (subject.startsWith('partner')) return `شريك · ${subject}`;
  if (subject.startsWith('field')) return `ميداني · ${subject}`;
  if (subject.startsWith('client')) return `عميل · ${subject}`;
  return 'WLT';
}

function partyKind(entry: WltLedgerEntry): WltLedgerEntryFormatted['partyKind'] {
  const subject = (entry as any).subject ?? entry.actorId ?? '';
  if (subject.startsWith('captain')) return 'captain';
  if (subject.startsWith('partner')) return 'partner';
  if (subject.startsWith('field')) return 'field';
  if (subject.startsWith('client')) return 'client';
  return 'platform';
}

// A wlt_ledger_entries row is a single-sided movement (one actor, one
// debitCredit direction) -- it was never a two-leg journal entry, so unlike
// the old code this does not invent a second "credit account" to pair it
// with. Only the side the entry actually records is populated; the other is
// left empty rather than fabricated. Real fields (amountMinorUnits,
// debitCredit) are read directly -- no *100 conversion, no inference from
// referenceType.
function toFinancialCenterEntry(entry: WltLedgerEntry): WltLedgerEntryFormatted {
  const amount: number = typeof entry.amountMinorUnits === 'number' ? entry.amountMinorUnits : 0;
  const debitCredit: string = (entry as any).debitCredit ?? '';
  const status = mapEntryStatus((entry as any).status ?? '');
  const sideLabel = ACCOUNT_TYPE_LABELS[entry.actorType] ?? entry.entryType ?? entry.referenceType ?? '';

  return {
    id: entry.id,
    debitAccountCode: debitCredit === 'debit' ? entry.actorType ?? '' : '',
    debitAccountLabel: debitCredit === 'debit' ? sideLabel : '',
    creditAccountCode: debitCredit === 'credit' ? entry.actorType ?? '' : '',
    creditAccountLabel: debitCredit === 'credit' ? sideLabel : '',
    amountMinorUnits: amount,
    amountLabel: formatWltYer(amount),
    entryKind: mapEntryKind(entry.referenceType ?? ''),
    party: partyLabel(entry),
    partyKind: partyKind(entry),
    sourceRef: entry.referenceId ?? entry.orderId ?? entry.id,
    statusLabel: status === 'posted' ? 'مرحّل من WLT' : 'يتطلب مراجعة WLT',
    status,
    isPending: status !== 'posted',
    needsReconciliation: status !== 'posted',
    isPreview: false,
  };
}

export function buildWltRuntimeFinancialCenter(
  businessDate: string,
  runtime: WltDshFinanceRuntimeReadModel,
): WltFinancialCenter {
  const allEntries = (runtime.ledgerEntries ?? []).map(toFinancialCenterEntry);

  const {
    sections,
    totalAssets,
    totalLiabilities,
    totalRevenue,
    totalExpenses,
    netPosition,
    dataCompletenessNotes,
  } = buildFinancialCenterSections(runtime.financialSummary);

  const blockingVariances = allEntries
    .filter((entry) => entry.needsReconciliation)
    .map((entry) => ({
      entryId: entry.id,
      description: `${entry.party} — ${entry.sourceRef}`,
      varianceMinorUnits: entry.amountMinorUnits,
      varianceLabel: entry.amountLabel,
      partyKind: entry.partyKind,
      reason: entry.statusLabel,
    }));

  return {
    businessDate,
    sections,
    dataCompletenessNotes,
    allEntries,
    totalAssets,
    totalAssetsLabel: formatWltYer(totalAssets),
    totalLiabilities,
    totalLiabilitiesLabel: formatWltYer(totalLiabilities),
    totalRevenue,
    totalRevenueLabel: formatWltYer(totalRevenue),
    totalExpenses,
    totalExpensesLabel: formatWltYer(totalExpenses),
    netPosition,
    netPositionLabel: formatWltYer(Math.abs(netPosition)),
    blockingVariances,
    canClose: blockingVariances.length === 0 && runtime.closeStatus?.status !== 'closed',
    contractState: 'WLT_DSH_RUNTIME_BOUND',
    openingBalanceSource: runtime.runtimeApiUrl,
    closingBalanceSource: runtime.closeStatus?.id ?? '',
    isPreview: false,
  };
}

export function buildWltDshFinanceHubViewModel(runtimeFinance: WltDshFinanceRuntimeResult | null): WltDshFinanceHubViewModel {
  const center = runtimeFinance?.state === 'runtime'
    ? buildWltRuntimeFinancialCenter(resolveWltFinanceBusinessDate(), runtimeFinance.data)
    : null;

  const pendingCount = center?.allEntries.filter((entry) => entry.isPending).length ?? 0;
  const openRisksCount = center?.allEntries.filter((entry) => entry.status === 'blocked' || entry.status === 'disputed').length ?? 0;

  const affectedParties = new Set<string>();
  center?.allEntries.forEach((entry) => {
    if (!entry.isPending && entry.status !== 'blocked' && entry.status !== 'disputed') return;
    if (entry.partyKind === 'client') affectedParties.add('العملاء');
    if (entry.partyKind === 'partner') affectedParties.add('الشركاء');
    if (entry.partyKind === 'captain') affectedParties.add('الكباتن');
    if (entry.partyKind === 'field') affectedParties.add('الميدانيين');
  });

  const affectedSurfaces = !center
    ? '—'
    : affectedParties.size === 0
      ? 'لا يوجد طرف متأثر حالياً'
      : Array.from(affectedParties).join(' · ');

  const requiredAction = !center
    ? '—'
    : center.blockingVariances.length > 0
      ? 'تحقيق ومطابقة الفوارق يدوياً'
      : center.allEntries.some((entry) => entry.status === 'pending')
        ? 'اعتماد وصرف المستحقات مع WLT'
        : 'مراقبة وتدقيق الأرصدة اليومية';

  const operationalRisk = !center
    ? '—'
    : center.blockingVariances.length > 0
      ? `يوجد فوارق معلقة (${center.blockingVariances.length} فارق نشط)`
      : center.allEntries.some((entry) => entry.status === 'blocked')
        ? 'مخاطر حرج عالية (High Risk)'
        : center.allEntries.some((entry) => entry.status === 'disputed' || entry.status === 'pending')
          ? 'تنبيه تدقيق متوسط (Medium Risk)'
          : 'لا توجد مخاطر مالية مكشوفة';

  const holdsStatus = !center
    ? '—'
    : center.blockingVariances.length > 0
      ? '🔒 معلق بالكامل (تسوية وصرف محجوبة)'
      : center.allEntries.some((entry) => entry.status === 'blocked' || entry.status === 'disputed')
        ? '⚠️ تعليق جزئي (حظر تسوية متأثرة)'
        : '✓ لا يوجد حظر (جاهز للتسوية)';

  return {
    center,
    pendingCount,
    openRisksCount,
    affectedSurfaces,
    requiredAction,
    operationalRisk,
    holdsStatus,
  };
}
