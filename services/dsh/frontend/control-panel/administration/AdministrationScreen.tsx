"use client";

import { useIdentitySession } from "@bthwani/app-shell";
import {
  Badge,
  DataTable,
  Header,
  ScrollScreen,
  StateView,
  Text,
  View,
  StyleSheet,
  spacing,
} from "@bthwani/ui-kit";
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
              { key: "partnerId", label: "معرّف الشريك" },
              { key: "status", label: "الحالة", render: (v) => (
                <Badge label={ACTIVATION_LABELS[String(v)] ?? String(v)} tone={ACTIVATION_BADGE[String(v)] ?? "neutral"} />
              )},
              { key: "reviewedBy", label: "راجعه" },
            ]}
            rows={partnerState.data as Record<string, unknown>[]}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text role="titleSm">بيانات القباطنة</Text>
        {captainState.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {captainState.kind === "success" && (
          <DataTable
            columns={[
              { key: "captainId", label: "معرّف القبطان" },
              { key: "licenseNumber", label: "رقم الرخصة" },
              { key: "vehicleType", label: "نوع المركبة" },
              { key: "status", label: "الحالة", render: (v) => <Badge label={String(v)} tone="neutral" /> },
            ]}
            rows={captainState.data as Record<string, unknown>[]}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text role="titleSm">سجل التدقيق</Text>
        {auditState.kind === "loading" && <StateView title="جارٍ التحميل…" />}
        {auditState.kind === "success" && (
          <DataTable
            columns={[
              { key: "actorId", label: "المنفّذ" },
              { key: "action", label: "الإجراء" },
              { key: "targetId", label: "الهدف" },
              { key: "createdAt", label: "التاريخ" },
            ]}
            rows={auditState.data as Record<string, unknown>[]}
          />
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
});
