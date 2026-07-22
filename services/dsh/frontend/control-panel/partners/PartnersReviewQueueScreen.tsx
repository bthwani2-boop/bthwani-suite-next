"use client";

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
import { usePartnersController } from "../../shared/partner";
import { PartnerListScreen } from "./PartnerListScreen";
import { FieldReadinessQueueScreen } from "./field-readiness/FieldReadinessQueueScreen";

type Props = {
  readonly onOpenPartner?: (partnerId: string) => void;
};

export function PartnersReviewQueueScreen({ onOpenPartner }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    activeTab,
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
    authKind: "authenticated",
  });

  const renderRegistrationQueue = () => {
    if (adminController.listState.kind === "loading" || adminController.listState.kind === "idle") {
      return (
        <StateView
          stateId="loading"
          title="جاري تحميل ملفات الانضمام"
          description="تتم قراءة الشركاء من DSH Runtime."
        />
      );
    }

    if (adminController.listState.kind === "offline") {
      return (
        <StateView
          stateId="offline"
          tone="warning"
          title="لا يوجد اتصال بخدمة الشركاء"
          description="لم تُعرض بيانات محلية كحقيقة تشغيلية. أعد الاتصال ثم اقرأ أحدث حالة من DSH."
          actionLabel="إعادة المحاولة"
          onActionPress={adminController.retry}
        />
      );
    }

    if (adminController.listState.kind === "error") {
      return (
        <StateView
          stateId="recoverableError"
          title="تعذر تحميل ملفات الانضمام"
          description={adminController.listState.message}
          actionLabel="إعادة المحاولة"
          onActionPress={adminController.retry}
        />
      );
    }

    if (adminController.listState.kind === "empty" || adminController.rows.length === 0) {
      return (
        <StateView
          stateId="empty"
          title="لا توجد ملفات انضمام"
          description="لا توجد طلبات شراكة مطابقة للحالة الحالية."
          actionLabel="تحديث"
          onActionPress={adminController.retry}
        />
      );
    }

    return (
      <Card style={{ padding: "1rem" }}>
        <Text role="titleMd" style={{ marginBottom: "1rem" }}>طلبات الشركاء والمقدمين</Text>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${lightThemeColors.borderColor}` }}>
                <th style={{ padding: "0.75rem" }}>اسم الشريك</th>
                <th style={{ padding: "0.75rem" }}>رقم الجوال</th>
                <th style={{ padding: "0.75rem" }}>الحالة</th>
                <th style={{ padding: "0.75rem" }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {adminController.rows.map((row) => {
                const originalPartner = adminController.listState.kind === "success"
                  ? adminController.listState.partners.find((partner) => partner.id === row.id)
                  : undefined;
                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${lightThemeColors.borderColor}` }}>
                    <td style={{ padding: "0.75rem" }}>
                      <Text style={{ fontWeight: "bold" }}>{row.displayName}</Text>
                    </td>
                    <td style={{ padding: "0.75rem" }}>{originalPartner?.primaryPhone || "—"}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <Badge
                        label={row.statusLabel}
                        tone={
                          row.statusTone === "muted" ? "neutral" :
                          row.statusTone === "success" ? "success" :
                          row.statusTone === "warning" ? "warning" :
                          row.statusTone === "danger" ? "danger" : "info"
                        }
                      />
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {onOpenPartner ? (
                        <Button
                          label="فتح ملف الشريك"
                          tone="secondary"
                          onPress={() => onOpenPartner(row.id)}
                        />
                      ) : (
                        <Text role="caption" tone="muted">مسار التفاصيل غير متاح</Text>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "inbox":
        return renderRegistrationQueue();
      case "all_partners":
        return <PartnerListScreen {...(onOpenPartner ? { onSelectPartner: onOpenPartner } : {})} />;
      case "field_readiness":
        return <FieldReadinessQueueScreen />;
    }
  };

  return (
    <ScrollScreen>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderBottom: `1px solid ${lightThemeColors.borderColor}`, paddingBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Text role="titleMd">شركاء DSH</Text>
              <Badge label="حقيقة تشغيلية" tone="action" />
            </div>
            <Text role="body" tone="muted" style={{ fontSize: "12px", marginTop: "0.25rem" }}>
              طلبات الانضمام، ملفات الشركاء، وتصعيدات الجاهزية المرتبطة بخدمات DSH الفعلية
            </Text>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Card style={{ padding: "0.5rem 0.75rem", alignItems: "center" }}>
              <Text role="caption" tone="muted">نشطون أو ظاهرون</Text>
              <Text role="titleMd" style={{ fontWeight: "bold", marginTop: "0.25rem" }}>{activePartnersCount}</Text>
            </Card>
            <Card style={{ padding: "0.5rem 0.75rem", alignItems: "center" }}>
              <Text role="caption" tone="muted">قيد المعالجة</Text>
              <Text role="titleMd" style={{ fontWeight: "bold", color: lightThemeColors.warning, marginTop: "0.25rem" }}>{pendingCount}</Text>
            </Card>
          </div>
        </div>

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

        {subTabItems.length > 1 && (
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
        )}

        <div style={{ marginTop: "0.5rem" }}>{renderContent()}</div>
      </div>
    </ScrollScreen>
  );
}
