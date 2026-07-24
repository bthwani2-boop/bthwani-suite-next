"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  ScrollScreen,
  StateView,
  Text,
  lightThemeColors,
  colorPalette,
  alpha,
} from "@bthwani/ui-kit";
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
      <ScrollScreen>
        <StateView
          stateId={restoring ? "loading" : "recoverableError"}
          loading={restoring}
          tone={restoring ? "neutral" : "warning"}
          title={restoring ? "جاري استعادة جلسة لوحة التحكم" : "جلسة مصادق عليها مطلوبة"}
          description="لا يتم تحميل أو عرض بيانات الشركاء قبل استعادة جلسة المشغل وصلاحيات المستأجر."
        />
      </ScrollScreen>
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
    <ScrollScreen>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderBottom: `1px solid ${lightThemeColors.borderColor}`, paddingBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Text role="titleMd">الشركاء والمتاجر</Text>
              <Badge label="فول ستاك متعدد المستأجرين" tone="action" />
            </div>
            <Text role="body" tone="muted" style={{ fontSize: "12px", marginTop: "0.25rem" }}>
              الهوية القانونية، التفعيل، الوثائق، الفروع، الجاهزية، الكتالوج، الأداء، الترويج، مستوى الخدمة والعقود ضمن مساحة موحدة
            </Text>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <Card style={{ padding: "0.5rem 0.75rem", alignItems: "center" }}>
              <Text role="caption" tone="muted">نشطون أو ظاهرون</Text>
              <Text role="titleMd" style={{ fontWeight: "bold", marginTop: "0.25rem" }}>{activePartnersCount}</Text>
            </Card>
            <Card style={{ padding: "0.5rem 0.75rem", alignItems: "center" }}>
              <Text role="caption" tone="muted">قيد المعالجة</Text>
              <Text role="titleMd" style={{ fontWeight: "bold", color: lightThemeColors.warning, marginTop: "0.25rem" }}>{pendingCount}</Text>
            </Card>
            <Button label={createOpen ? "إغلاق نموذج الإضافة" : "+ إضافة شريك"} tone="primary" onPress={() => setCreateOpen((current) => !current)} />
          </div>
        </div>

        {createOpen ? (
          <PartnerCreatePanel
            controller={adminController}
            onClose={() => setCreateOpen(false)}
            {...(onOpenPartner ? { onCreated: onOpenPartner } : {})}
          />
        ) : null}

        <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 0", flexWrap: "wrap" }}>
          {tabItems.map((tab) => (
            <Button
              key={tab.id}
              label={tab.label}
              tone={tab.active ? "primary" : "secondary"}
              onPress={() => handleSelectTab(tab.id)}
            />
          ))}
        </div>

        {subTabItems.length > 0 ? (
          <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem", flexWrap: "wrap", background: alpha(colorPalette.black, 0.02), borderRadius: "4px" }}>
            {subTabItems.map((subTab) => (
              <Button
                key={subTab.id}
                label={subTab.label}
                tone={subTab.active ? "success" : "secondary"}
                onPress={() => handleSelectSubTab(subTab.id)}
              />
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: "0.5rem" }}>{renderContent()}</div>
      </div>
    </ScrollScreen>
  );
}
