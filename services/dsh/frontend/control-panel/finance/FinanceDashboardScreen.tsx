"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, StateView, Text } from "@bthwani/ui-kit";
import { useIdentitySession } from "@bthwani/core-identity";
import { CpBadge, CpButton, CpKpiCard, CpKpiStrip, CpTabs } from "@bthwani/control-panel/components";
import { OverviewPageFrame } from "@bthwani/control-panel/shell";
import { useFinanceController } from './finance.controller';
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";
import { CommissionGovernancePanel } from "./CommissionGovernancePanel";
import { GovernedSettlementPanel } from "./GovernedSettlementPanel";
import { LedgerInspectorScreen } from "./LedgerInspectorScreen";
import { PaymentSessionOperationsScreen } from "./PaymentSessionOperationsScreen";
import { PayoutRequestsPanel } from "./PayoutRequestsPanel";
import { ReconciliationCasesPanel } from "./ReconciliationCasesPanel";
import { RefundsCommandPanel } from "./RefundsCommandPanel";
import { RepresentativeWalletLookup } from "./RepresentativeWalletLookup";
import type { WltFinancialCenter, WltFinancialCenterSection, WltAccountPositionLine } from './finance-hub.types';

type FinanceTabItem = { readonly id: string; readonly label: string; readonly active: boolean };

const FINANCE_BLOCK_REASON_COPY: Record<string, { readonly title: string; readonly description: string }> = {
  WLT_NOT_CONFIGURED: {
    title: "WLT غير مُهيّأ (WLT_NOT_CONFIGURED)",
    description: "لم يتم ضبط تكامل WLT في بيئة DSH الحالية. راجع إعداد رمز خدمة WLT وربط WLT في DSH.",
  },
  WLT_UNAVAILABLE: {
    title: "تعذر الوصول إلى WLT (WLT_UNAVAILABLE)",
    description: "استجاب وكيل DSH المالي لكن فشل الاتصال بخادم WLT. تحقق من أن حاوية WLT تعمل وصحية.",
  },
  ROUTE_NOT_FOUND: {
    title: "المسار غير مسجّل (ROUTE_NOT_FOUND)",
    description: "الخادم المستجيب لا يعرّف هذا المسار. تحقق من أن DSH وWLT يشغّلان أحدث كود من الفرع الحالي.",
  },
  AUTH_MISSING: {
    title: "الجلسة غير مصادق عليها (AUTH_MISSING)",
    description: "لا يوجد رمز دخول صالح لهذا المشغّل. سجّل الدخول من جديد ثم أعد المحاولة.",
  },
  MISSING_OperatorContext_ID: {
    title: "سياق المستأجر غير مكتمل (MISSING_OperatorContext_ID)",
    description: "لم تُرجع جلسة المشغّل سياق المستأجر الموثوق. سجّل الدخول من جديد؛ لا تُدخل معرّف مستأجر يدويًا.",
  },
  OperatorContext_MISMATCH: {
    title: "تعارض سياق المستأجر (OperatorContext_MISMATCH)",
    description: "رُفض الطلب لأن محدد المستأجر لا يطابق سياق جلسة المشغّل الموثوق.",
  },
  RUNTIME_PORT_MISMATCH: {
    title: "تعذر الاتصال بالمنفذ (RUNTIME_PORT_MISMATCH)",
    description: "فشل الاتصال الشبكي بعنوان/منفذ DSH runtime API. تحقق من تشغيل الخدمة والمنفذ الصحيح.",
  },
};

function describeFinanceBlockedReason(error: string | undefined): { readonly title: string; readonly description: string } {
  if (!error) return { title: "Finance Hub runtime غير متاح", description: "تعذر تحديد سبب دقيق للانقطاع." };
  for (const code of Object.keys(FINANCE_BLOCK_REASON_COPY)) {
    if (error.includes(code)) return FINANCE_BLOCK_REASON_COPY[code]!;
  }
  return { title: "Finance Hub runtime غير متاح", description: `تعذر الاتصال بخدمة ملخص Finance Hub (${error}).` };
}

function FinanceCapabilityGap({ label }: { readonly label: string }) {
  return (
    <Card style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-start" }}>
      <CpBadge tone="danger">قدرة تشغيلية غير مكتملة</CpBadge>
      <Text role="titleMd">{label}</Text>
      <Text role="body" tone="muted">
        لا يوجد Owner تشغيلي محكوم ومثبت لهذا التبويب في العقد الحالي. لن يتم ربطه ببيانات بديلة أو شاشة مشابهة أو أرقام مصطنعة؛ يلزم إكمال عقد WLT/DSH الحقيقي وربط القراءة والإجراء والـreadback قبل اعتباره متاحًا.
      </Text>
    </Card>
  );
}

export function FinanceDashboardScreen() {
  const { state: sessionState } = useIdentitySession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canManageFinance = hasServiceControlPanelPermission(identity, "dsh", "finance.manage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const controller = useFinanceController({
    group: "financial-command-center",
    searchParams: searchParams ?? undefined,
    router: router ?? undefined,
  });
  const {
    activeGroup,
    activeGroupMeta,
    activeSubGroup,
    activeSubGroupMeta,
    activeState,
    tabItems,
    subTabItems,
    reload,
    financeHubView,
    runtimeFinance,
    onTabSelect,
    onSubTabSelect,
  } = controller;

  const runtimeSourceLabel = useMemo(() => {
    if (activeState === "loading") return "ملخص Finance Hub: جارٍ التحميل";
    if (!runtimeFinance) return "ملخص Finance Hub: غير متصل";
    if (runtimeFinance.state === "runtime") return `ملخص Finance Hub عبر: ${runtimeFinance.data.runtimeApiUrl}`;
    return `ملخص Finance Hub محجوب (${describeFinanceBlockedReason(runtimeFinance.error).title}) عبر: ${runtimeFinance.runtimeApiUrl}`;
  }, [activeState, runtimeFinance]);

  const renderFinancialCenterPosition = (center: WltFinancialCenter) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
      {center.dataCompletenessNotes.length > 0 ? (
        <Card style={{ padding: "1rem" }}>
          <Text role="body" tone="muted">
            ملاحظة اكتمال البيانات: هذا الملخص لا يشمل بعد {center.dataCompletenessNotes.join("، ")} — الأرقام أقل من الواقع لتلك الأحداث حتى تُنقل إلى Ledger Kernel.
          </Text>
        </Card>
      ) : null}
      {center.sections.map((section: WltFinancialCenterSection) => (
        <Card key={section.sectionType} style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
            <Text role="titleMd" style={{ fontWeight: "bold" }}>{section.sectionLabel}</Text>
            <Text role="titleMd" style={{ fontWeight: "bold" }}>{section.totalLabel}</Text>
          </div>
          {section.lines.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {section.lines.map((line: WltAccountPositionLine) => (
                <div key={line.accountCode} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                  <Text role="body">{line.accountLabel} ({line.accountCode})</Text>
                  <Text role="body" style={{ fontWeight: "bold" }}>{line.totalLabel}</Text>
                </div>
              ))}
            </div>
          ) : <Text role="body" tone="muted">لا توجد قيود مسجلة بداخل هذا الباب.</Text>}
        </Card>
      ))}
    </div>
  );

  const renderContent = () => {
    const activeSub = activeSubGroup || activeGroupMeta.subGroups?.[0]?.id;

    if (activeGroup === "refunds-disputes-holds" && activeSub === "refunds") {
      return <RefundsCommandPanel canManage={canManageFinance} />;
    }
    if (activeGroup === "payments-wallets" && activeSub === "payments") {
      return <PaymentSessionOperationsScreen />;
    }
    if (activeGroup === "payments-wallets" && activeSub === "client-wallets") {
      return <RepresentativeWalletLookup actorType="client" lockActorType />;
    }
    if (activeGroup === "payments-wallets" && activeSub === "partner-wallets") {
      return <RepresentativeWalletLookup actorType="partner" lockActorType />;
    }
    if (activeGroup === "payments-wallets" && activeSub === "captain-wallets") {
      return <RepresentativeWalletLookup actorType="captain" lockActorType />;
    }
    if (activeGroup === "settlements-payouts" && activeSub === "partners") {
      const requests = runtimeFinance?.state === "runtime" ? runtimeFinance.data.payoutRequests : [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <GovernedSettlementPanel reload={reload} canManage={canManageFinance} />
          {runtimeFinance?.state === "runtime" ? (
            <PayoutRequestsPanel requests={requests} reload={reload} canManage={canManageFinance} beneficiaryActorType="partner" />
          ) : null}
        </div>
      );
    }
    if (activeGroup === "settlements-payouts" && activeSub === "captains") {
      const requests = runtimeFinance?.state === "runtime" ? runtimeFinance.data.payoutRequests : [];
      return runtimeFinance?.state === "runtime"
        ? <PayoutRequestsPanel requests={requests} reload={reload} canManage={canManageFinance} beneficiaryActorType="captain" />
        : <FinanceCapabilityGap label="طلبات صرف الكباتن — تعذر إثبات Finance Hub" />;
    }
    if (activeGroup === "settlements-payouts" && activeSub === "field") {
      const requests = runtimeFinance?.state === "runtime" ? runtimeFinance.data.payoutRequests : [];
      return runtimeFinance?.state === "runtime"
        ? <PayoutRequestsPanel requests={requests} reload={reload} canManage={canManageFinance} beneficiaryActorType="field" />
        : <FinanceCapabilityGap label="طلبات صرف الميدانيين — تعذر إثبات Finance Hub" />;
    }
    if (activeGroup === "commissions-fees-promo" && activeSub === "commissions") {
      return <CommissionGovernancePanel canManage={canManageFinance} />;
    }
    if (activeGroup === "reconciliation-risk" && activeSub === "reconciliation") {
      return <ReconciliationCasesPanel canManage={canManageFinance} />;
    }

    if (activeState === "loading") {
      return <Card style={{ padding: "3rem", alignItems: "center", justifyContent: "center" }}><Text role="body">جاري تحميل ملخص Finance Hub...</Text></Card>;
    }
    if (activeState === "error") {
      return <StateView title="تعذر تحميل ملخص Finance Hub" description="فشل الاتصال بخدمة الملخص المالي." actionLabel="إعادة المحاولة" onActionPress={reload} />;
    }
    if (activeState === "offline" || activeState === "empty") {
      const blockedReason = describeFinanceBlockedReason(runtimeFinance?.state === "blocked" ? runtimeFinance.error : undefined);
      return (
        <Card style={{ padding: "3rem", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "1rem" }}>
          <CpBadge tone="danger">{blockedReason.title}</CpBadge>
          <Text role="body" tone="muted" style={{ maxWidth: "450px" }}>{blockedReason.description}</Text>
          <CpButton variant="primary" onClick={reload}>إعادة المحاولة</CpButton>
        </Card>
      );
    }
    if (activeGroup === "financial-command-center") {
      if (activeSub === "position" && financeHubView.center) return renderFinancialCenterPosition(financeHubView.center);
      return (
        <Card style={{ padding: "2rem" }}>
          <Text role="titleMd" style={{ marginBottom: "1rem" }}>الخلاصة والتدقيق المالي العام</Text>
          <Text role="body" tone="muted">الأرقام مستمدة مباشرة من خادم WLT عبر وكيل DSH المالي المحكوم.</Text>
          <Text role="body" tone="muted" style={{ marginTop: "0.5rem" }}>
            {`الوضع التشغيلي: ${financeHubView.operationalRisk} · حظر الصرف/التسوية: ${financeHubView.holdsStatus} · الإجراء المطلوب: ${financeHubView.requiredAction}`}
          </Text>
        </Card>
      );
    }
    if (activeGroup === "ledger-order-finance" && activeSub === "ledger") {
      return <LedgerInspectorScreen />;
    }

    return <FinanceCapabilityGap label={activeSubGroupMeta?.label || activeSubGroup || activeGroupMeta.label} />;
  };

  const financeHubProven = activeState === "ready" && runtimeFinance?.state === "runtime";
  const hasBlockingVariances = financeHubProven && (financeHubView.center?.blockingVariances.length ?? 0) > 0;
  const readinessTone = hasBlockingVariances ? "danger" : financeHubView.pendingCount > 0 ? "warning" : "success";
  const readinessLabel = hasBlockingVariances
    ? "محجوب / يوجد مخاطر (Blocked / Risk)"
    : financeHubView.pendingCount > 0
      ? "يحتاج إجراء (Needs action)"
      : "جاهز للمطابقة (Ready)";

  return (
    <OverviewPageFrame
      header={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Text role="titleMd">غرفة القيادة المالية</Text>
              <CpBadge tone={financeHubProven ? "success" : "danger"}>
                {financeHubProven ? "Finance Hub runtime مثبت" : "Finance Hub runtime غير مثبت"}
              </CpBadge>
            </div>
            <Text role="body" tone="muted" style={{ fontSize: "12px", marginTop: "0.25rem" }}>
              العملة: <strong>ر.ي (ريال يمني)</strong> · {runtimeSourceLabel}
            </Text>
          </div>
          <CpButton variant="secondary" onClick={reload}>تحديث ملخص Finance Hub</CpButton>
        </div>
      }
      toolbar={
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <CpTabs
            aria-label="أقسام لوحة القيادة المالية"
            items={tabItems.map((tab: FinanceTabItem) => ({ value: tab.id, label: tab.label }))}
            value={tabItems.find((tab: FinanceTabItem) => tab.active)?.id ?? activeGroup}
            onChange={onTabSelect}
          />
          {subTabItems.length > 0 ? (
            <CpTabs
              aria-label="تبويبات فرعية"
              items={subTabItems.map((subTab: FinanceTabItem) => ({ value: subTab.id, label: subTab.label }))}
              value={subTabItems.find((subTab: FinanceTabItem) => subTab.active)?.id ?? activeSubGroup ?? ""}
              onChange={onSubTabSelect}
            />
          ) : null}
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {financeHubProven ? (
          <CpKpiStrip>
            <CpKpiCard label="صافي المركز المالي" value={financeHubView.center?.netPositionLabel ?? "—"} />
            <CpKpiCard label="مبالغ معلقة" value={`${financeHubView.pendingCount.toLocaleString("ar-YE")} ذمة`} />
            <CpKpiCard label="فوارق مطابقة" value={`${(financeHubView.center?.blockingVariances.length ?? 0).toLocaleString("ar-YE")} فوارق`} />
            <CpKpiCard label="مخاطر مفتوحة" value={`${financeHubView.openRisksCount.toLocaleString("ar-YE")} مخاطر`} />
          </CpKpiStrip>
        ) : (
          <Card style={{ padding: "1rem" }}>
            <Text role="body" tone="muted">لن تُعرض مؤشرات Finance Hub حتى تُثبت القراءة الحية من WLT؛ لا تُحوّل حالة الانقطاع إلى أصفار تشغيلية.</Text>
          </Card>
        )}

        {financeHubProven ? (
          <Card style={{ padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <CpBadge tone={readinessTone}>{readinessLabel}</CpBadge>
              <div>
                <Text role="body" style={{ fontWeight: "bold" }}>حالة الجاهزية التشغيلية</Text>
                <Text role="caption" tone="muted">ملخص Finance Hub المملوك لـ WLT</Text>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: "150px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Text role="caption" tone="muted">الخطر المالي</Text>
                <Text role="body" tone={hasBlockingVariances ? "danger" : "default"} style={{ fontWeight: "bold" }}>{financeHubView.operationalRisk}</Text>
              </div>
              <div style={{ flex: 1, minWidth: "150px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Text role="caption" tone="muted">الجهة المتأثرة</Text>
                <Text role="body" style={{ fontWeight: "bold" }}>{financeHubView.affectedSurfaces}</Text>
              </div>
              <div style={{ flex: 1, minWidth: "150px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Text role="caption" tone="muted">الإجراء المطلوب</Text>
                <Text role="body" tone="info" style={{ fontWeight: "bold" }}>{financeHubView.requiredAction}</Text>
              </div>
              <div style={{ flex: 1, minWidth: "150px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Text role="caption" tone="muted">حظر الصرف/التسوية</Text>
                <Text role="body" style={{ fontWeight: "bold" }}>{financeHubView.holdsStatus}</Text>
              </div>
            </div>
          </Card>
        ) : null}
        {renderContent()}
      </div>
    </OverviewPageFrame>
  );
}
