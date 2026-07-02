import type {
  WltDshFinanceRuntimeReadModel,
  WltDshFinanceRuntimeResult,
  WltDshFinanceHubViewModel,
  WltFinancialCenter,
  WltFinancialCenterSection,
  WltAccountPositionLine,
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

function accountForDebit(referenceType: string): { code: string; label: string; type: WltFinancialCenterSection['sectionType'] } {
  if (referenceType === 'refund') return { code: '5001', label: 'مصروف الاسترداد', type: 'expense' };
  if (referenceType === 'settlement') return { code: '1030', label: 'مقاصة التسوية', type: 'asset' };
  return { code: '1010', label: 'رصيد المقاصة البنكية', type: 'asset' };
}

function accountForCredit(referenceType: string): { code: string; label: string; type: WltFinancialCenterSection['sectionType'] } {
  if (referenceType === 'payment_session') return { code: '2001', label: 'رصيد محفظة العميل', type: 'liability' };
  if (referenceType === 'settlement') return { code: '2020', label: 'مستحقات الشريك', type: 'liability' };
  if (referenceType === 'refund') return { code: '2050', label: 'التزام الاسترداد للعميل', type: 'liability' };
  return { code: '4001', label: 'إيرادات WLT', type: 'revenue' };
}

function accountTypeByCode(code: string): WltFinancialCenterSection['sectionType'] {
  if (code.startsWith('1')) return 'asset';
  if (code.startsWith('2')) return 'liability';
  if (code.startsWith('4')) return 'revenue';
  if (code.startsWith('5')) return 'expense';
  return 'asset';
}

function partyLabel(entry: any): string {
  const subject = entry.subject ?? entry.actorId ?? '';
  if (subject.startsWith('captain')) return `كابتن · ${subject}`;
  if (subject.startsWith('partner')) return `شريك · ${subject}`;
  if (subject.startsWith('field')) return `ميداني · ${subject}`;
  if (subject.startsWith('client')) return `عميل · ${subject}`;
  return 'WLT';
}

function partyKind(entry: any): WltLedgerEntryFormatted['partyKind'] {
  const subject = entry.subject ?? entry.actorId ?? '';
  if (subject.startsWith('captain')) return 'captain';
  if (subject.startsWith('partner')) return 'partner';
  if (subject.startsWith('field')) return 'field';
  if (subject.startsWith('client')) return 'client';
  return 'platform';
}

function toFinancialCenterEntry(entry: any): WltLedgerEntryFormatted {
  const debit = accountForDebit(entry.reference_type ?? entry.referenceType ?? '');
  const credit = accountForCredit(entry.reference_type ?? entry.referenceType ?? '');
  // standard raw amount is major, let's parse and get minor
  const rawAmt = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount ?? '0');
  const amount = Math.round(rawAmt * 100);
  const status = mapEntryStatus(entry.status ?? '');

  return {
    id: entry.id,
    debitAccountCode: debit.code,
    debitAccountLabel: debit.label,
    creditAccountCode: credit.code,
    creditAccountLabel: credit.label,
    amountMinorUnits: amount,
    amountLabel: formatWltYer(amount),
    entryKind: mapEntryKind(entry.reference_type ?? entry.referenceType ?? ''),
    party: partyLabel(entry),
    partyKind: partyKind(entry),
    sourceRef: entry.reference_id ?? entry.referenceId ?? entry.orderId ?? entry.id,
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
  const accountLines = new Map<string, {
    readonly type: WltFinancialCenterSection['sectionType'];
    readonly label: string;
    total: number;
    entries: WltLedgerEntryFormatted[];
  }>();

  for (const entry of allEntries) {
    for (const account of [
      { code: entry.debitAccountCode, label: entry.debitAccountLabel, type: accountTypeByCode(entry.debitAccountCode) },
      { code: entry.creditAccountCode, label: entry.creditAccountLabel, type: accountTypeByCode(entry.creditAccountCode) },
    ]) {
      const existing = accountLines.get(account.code);
      if (existing) {
        existing.total += entry.amountMinorUnits;
        existing.entries.push(entry);
      } else {
        accountLines.set(account.code, {
          type: account.type,
          label: account.label,
          total: entry.amountMinorUnits,
          entries: [entry],
        });
      }
    }
  }

  const section = (type: WltFinancialCenterSection['sectionType'], sectionLabel: string): WltFinancialCenterSection => {
    const lines: WltAccountPositionLine[] = [];
    for (const [accountCode, account] of accountLines) {
      if (account.type !== type) continue;
      lines.push({
        accountCode,
        accountLabel: account.label,
        accountType: type,
        totalMinorUnits: account.total,
        totalLabel: formatWltYer(account.total),
        entryCount: account.entries.length,
        pendingCount: account.entries.filter((e) => e.isPending).length,
        entries: account.entries,
        isPreview: false,
      });
    }

    const totalMinorUnits = lines.reduce((sum, line) => sum + line.totalMinorUnits, 0);
    return { sectionType: type, sectionLabel, totalMinorUnits, totalLabel: formatWltYer(totalMinorUnits), lines };
  };

  const assetSection = section('asset', 'الأصول');
  const liabilitySection = section('liability', 'الالتحامات والالتزامات');
  const revenueSection = section('revenue', 'الإيرادات');
  const expenseSection = section('expense', 'المصروفات');
  const netPosition = assetSection.totalMinorUnits - liabilitySection.totalMinorUnits;
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
    sections: [assetSection, liabilitySection, revenueSection, expenseSection],
    allEntries,
    totalAssets: assetSection.totalMinorUnits,
    totalAssetsLabel: assetSection.totalLabel,
    totalLiabilities: liabilitySection.totalMinorUnits,
    totalLiabilitiesLabel: liabilitySection.totalLabel,
    totalRevenue: revenueSection.totalMinorUnits,
    totalRevenueLabel: revenueSection.totalLabel,
    totalExpenses: expenseSection.totalMinorUnits,
    totalExpensesLabel: expenseSection.totalLabel,
    netPosition,
    netPositionLabel: formatWltYer(Math.abs(netPosition)),
    blockingVariances,
    canClose: blockingVariances.length === 0 && runtime.closeStatus?.status !== 'closed',
    contractState: 'WLT_DSH_RUNTIME_BOUND',
    openingBalanceSource: runtime.baseUrl,
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
