"use client";

import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  DataTable,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import {
  usePartnerActivationController,
  useCaptainCredentialController,
  useAdminAuditController,
} from "../../shared/administration";

const ACTIVATION_BADGE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  submitted: "warning",
  ops_approved: "warning",
  partner_active: "success",
  blocked: "danger",
};

const ACTIVATION_LABELS: Record<string, string> = {
  submitted: "مُقدَّم",
  ops_approved: "موافقة العمليات",
  partner_active: "نشط",
  blocked: "محظور",
};

export function AdministrationScreen() {
  const identity = useIdentitySession();
  const { state: partnerState, reload: reloadPartners } =
    usePartnerActivationController(identity.state.kind);
  const { state: captainState } = useCaptainCredentialController(identity.state.kind);
  const { state: auditState } = useAdminAuditController(identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

  return (
    <ScrollScreen>
      <Header title="الإدارة والصلاحيات" subtitle="تفعيل الشركاء وبيانات القباطنة والتدقيق" />

      <View style={styles.section}>
        <Text role="titleSm">تفعيل الشركاء</Text>
        {partnerState.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {partnerState.kind === "error" && (
          <StateView title="خطأ" description={partnerState.message} actionLabel="إعادة المحاولة" onActionPress={reloadPartners} />
        )}
        {partnerState.kind === "success" && (
          <DataTable
            columns={[
              { key: "partnerId", header: "معرّف الشريك", render: (row) => String(row.partnerId ?? "") },
              { key: "status", header: "الحالة", render: (row) => (
                <Badge label={ACTIVATION_LABELS[String(row.status)] ?? String(row.status)} tone={ACTIVATION_BADGE[String(row.status)] ?? "neutral"} />
              )},
              { key: "reviewedBy", header: "راجعه", render: (row) => String(row.reviewedBy ?? "") },
            ]}
            rows={partnerState.data as Record<string, unknown>[]}
            getRowKey={(row) => String(row.partnerId)}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text role="titleSm">بيانات القباطنة</Text>
        {captainState.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {captainState.kind === "success" && (
          <DataTable
            columns={[
              { key: "captainId", header: "معرّف القبطان", render: (row) => String(row.captainId ?? "") },
              { key: "licenseNumber", header: "رقم الرخصة", render: (row) => String(row.licenseNumber ?? "") },
              { key: "vehicleType", header: "نوع المركبة", render: (row) => String(row.vehicleType ?? "") },
              { key: "status", header: "الحالة", render: (row) => <Badge label={String(row.status)} tone="neutral" /> },
            ]}
            rows={captainState.data as Record<string, unknown>[]}
            getRowKey={(row) => String(row.captainId)}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text role="titleSm">سجل التدقيق</Text>
        {auditState.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {auditState.kind === "success" && (
          <DataTable
            columns={[
              { key: "actorId", header: "المنفّذ", render: (row) => String(row.actorId ?? "") },
              { key: "action", header: "الإجراء", render: (row) => String(row.action ?? "") },
              { key: "targetId", header: "الهدف", render: (row) => String(row.targetId ?? "") },
              { key: "createdAt", header: "التاريخ", render: (row) => String(row.createdAt ?? "") },
            ]}
            rows={auditState.data as Record<string, unknown>[]}
            getRowKey={(row) => `${String(row.actorId)}-${String(row.action)}-${String(row.createdAt)}`}
          />
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
});
