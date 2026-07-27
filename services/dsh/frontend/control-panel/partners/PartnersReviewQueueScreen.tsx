"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CpBadge,
  CpButton,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpStatePanel,
  CpTabs,
} from "@bthwani/control-panel/components";
import { QueuePageFrame } from "@bthwani/control-panel/shell";
import { useControlPanelSession } from "@dsh-shared/session/control-panel-session";
import { usePartnersController } from "../../shared/partner";
import { PartnerListScreen } from "./PartnerListScreen";
import { StoreManagementScreen } from "./stores/StoreManagementScreen";
import { FieldReadinessQueueScreen } from "./field-readiness/FieldReadinessQueueScreen";
import { PartnerGovernanceWorkspaceScreen } from "./PartnerGovernanceWorkspaceScreen";
import { PartnerCreatePanel } from "./PartnerCreatePanel";

type Props = {
  readonly onOpenPartner?: (partnerId: string) => void;
};

export function PartnersReviewQueueScreen({ onOpenPartner }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: sessionState } = useControlPanelSession();
  const [createOpen, setCreateOpen] = useState(false);
  const {
    activeTab,
    activeSubTab,
    tabItems,
    subTabItems,
    activePartnersCount,
    pendingCount,
    adminController,
    handleSelectTab,
    handleSelectSubTab,
  } = usePartnersController({
    initialWorkspace: "inbox",
    searchParams: searchParams ?? undefined,
    router: router ?? undefined,
    authKind: sessionState.kind,
  });

  if (sessionState.kind !== "authenticated") {
    const restoring = sessionState.kind === "restoring" || sessionState.kind === "authenticating";
    return (
      <QueuePageFrame
        stateView={(
          <CpStatePanel
            role={restoring ? "status" : "alert"}
            title={restoring ? "جاري استعادة جلسة لوحة التحكم" : "جلسة مصادق عليها مطلوبة"}
            description="لا يتم تحميل أو عرض بيانات الشركاء قبل استعادة جلسة المشغل وصلاحيات المستأجر."
          />
        )}
      >
        {null}
      </QueuePageFrame>
    );
  }

  const renderContent = () => {
    if (activeTab === "field_readiness") return <FieldReadinessQueueScreen />;
    if (activeTab === "stores") return <StoreManagementScreen />;
    if (activeTab === "all_partners") {
      return <PartnerListScreen {...(onOpenPartner ? { onSelectPartner: onOpenPartner } : {})} />;
    }
    return (
      <PartnerGovernanceWorkspaceScreen
        workspace={activeTab}
        subTab={activeSubTab}
        controller={adminController}
        {...(onOpenPartner ? { onOpenPartner } : {})}
      />
    );
  };

  return (
    <QueuePageFrame
      header={(
        <CpPageHeader title="الشركاء والمتاجر">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <CpBadge tone="brand">فول ستاك متعدد المستأجرين</CpBadge>
            <CpButton variant="primary" onClick={() => setCreateOpen((current) => !current)}>
              {createOpen ? "إغلاق نموذج الإضافة" : "+ إضافة شريك"}
            </CpButton>
          </div>
        </CpPageHeader>
      )}
      filters={(
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <CpTabs
            items={tabItems.map((tab) => ({ value: tab.id, label: tab.label }))}
            value={activeTab}
            onChange={(value) => handleSelectTab(value as typeof activeTab)}
            aria-label="مساحات عمل الشركاء"
          />
          {subTabItems.length > 0 ? (
            <CpTabs
              items={subTabItems.map((subTab) => ({ value: subTab.id, label: subTab.label }))}
              value={activeSubTab}
              onChange={handleSelectSubTab}
              aria-label="تصنيفات فرعية"
            />
          ) : null}
        </div>
      )}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <CpKpiStrip>
          <CpKpiCard label="نشطون أو ظاهرون" value={activePartnersCount} />
          <CpKpiCard label="قيد المعالجة" value={pendingCount} />
        </CpKpiStrip>
        {createOpen ? (
          <PartnerCreatePanel
            controller={adminController}
            onClose={() => setCreateOpen(false)}
            {...(onOpenPartner ? { onCreated: onOpenPartner } : {})}
          />
        ) : null}
        {renderContent()}
      </div>
    </QueuePageFrame>
  );
}
