"use client";

import React from "react";
import { Card, Text, spacing } from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
import {
  CpBadge,
  CpButton,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import {
  evaluateDshOperationalPolicy,
  fetchDshOperationalDeliveryModes,
  fetchDshOperationalPolicyAudit,
  fetchDshOperationalProfile,
  rollbackDshOperationalPolicy,
  upsertDshOperationalDeliveryMode,
  upsertDshOperationalProfile,
  useZonesController,
  type DshDeliveryModePolicy,
  type DshFulfillmentMode,
  type DshOperationalDecision,
  type DshOperationalPolicyAuditEvent,
  type DshOperationalProfile,
  type DshZone,
} from "../../shared/platform";

type ProfileForm = {
  slaCategory: string;
  maxPrepMins: string;
  maxAssignmentMins: string;
  maxDeliveryMins: string;
  maxConcurrentOrders: string;
  maxCaptainsOnline: string;
  throttleThreshold: string;
  isPaused: boolean;
  pauseReason: string;
  reason: string;
};

const EMPTY_PROFILE: ProfileForm = {
  slaCategory: "default",
  maxPrepMins: "20",
  maxAssignmentMins: "10",
  maxDeliveryMins: "45",
  maxConcurrentOrders: "100",
  maxCaptainsOnline: "30",
  throttleThreshold: "0.8",
  isPaused: false,
  pauseReason: "",
  reason: "",
};

const MODE_LABELS: Record<DshFulfillmentMode, string> = {
  bthwani_delivery: "توصيل بثواني",
  partner_delivery: "توصيل الشريك",
  client_pickup: "استلام العميل",
};

function integer(value: string, label: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} يجب أن يكون بين ${min} و${max}.`);
  }
  return parsed;
}

function ratio(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error("عتبة الضغط يجب أن تكون بين 0 و1.");
  }
  return parsed;
}

function requiredReason(value: string): string {
  const reason = value.trim();
  if (reason.length < 3 || reason.length > 500) {
    throw new Error("اكتب سببًا واضحًا بين 3 و500 حرف.");
  }
  return reason;
}

function currentVersionForEvent(
  event: DshOperationalPolicyAuditEvent,
  profile: DshOperationalProfile | null,
  modes: readonly DshDeliveryModePolicy[],
  zone: DshZone | null,
): number | null {
  switch (event.aggregateType) {
    case "zone":
      return zone?.version ?? null;
    case "sla_rule":
      return profile?.sla.version ?? null;
    case "capacity_config":
      return profile?.capacity.version ?? null;
    case "delivery_mode":
      return modes.find((item) => item.id === event.aggregateId)?.version ?? null;
    default:
      return null;
  }
}

export function OperationalPolicySection() {
  const zones = useZonesController("authenticated");
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<DshOperationalProfile | null>(null);
  const [modes, setModes] = React.useState<DshDeliveryModePolicy[]>([]);
  const [audit, setAudit] = React.useState<DshOperationalPolicyAuditEvent[]>([]);
  const [form, setForm] = React.useState<ProfileForm>(EMPTY_PROFILE);
  const [evaluationMode, setEvaluationMode] = React.useState<DshFulfillmentMode>("bthwani_delivery");
  const [activeOrders, setActiveOrders] = React.useState("0");
  const [captainsOnline, setCaptainsOnline] = React.useState("0");
  const [decision, setDecision] = React.useState<DshOperationalDecision | null>(null);
  const [selectedAudit, setSelectedAudit] = React.useState<DshOperationalPolicyAuditEvent | null>(null);
  const [rollbackReason, setRollbackReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedZone = React.useMemo(
    () =>
      zones.state.kind === "success"
        ? zones.state.data.find((item) => item.id === selectedZoneId) ?? null
        : null,
    [selectedZoneId, zones.state],
  );

  React.useEffect(() => {
    if (selectedZoneId || zones.state.kind !== "success" || zones.state.data.length === 0) return;
    setSelectedZoneId(zones.state.data[0]?.id ?? null);
  }, [selectedZoneId, zones.state]);

  const load = React.useCallback(async () => {
    if (!selectedZoneId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileResponse, modesResponse, auditResponse] = await Promise.all([
        fetchDshOperationalProfile(selectedZoneId),
        fetchDshOperationalDeliveryModes(selectedZoneId),
        fetchDshOperationalPolicyAudit({ limit: 100 }),
      ]);
      const nextProfile = profileResponse.profile;
      setProfile(nextProfile);
      setModes(modesResponse.deliveryModes);
      setAudit(
        auditResponse.events.filter(
          (event) =>
            event.aggregateType === "zone" ||
            event.aggregateType === "sla_rule" ||
            event.aggregateType === "capacity_config" ||
            modesResponse.deliveryModes.some((mode) => mode.id === event.aggregateId),
        ),
      );
      setForm({
        slaCategory: nextProfile.sla.category ?? "default",
        maxPrepMins: String(nextProfile.sla.maxPrepMins ?? 20),
        maxAssignmentMins: String(nextProfile.sla.maxAssignmentMins ?? 10),
        maxDeliveryMins: String(nextProfile.sla.maxDeliveryMins ?? 45),
        maxConcurrentOrders: String(nextProfile.capacity.maxConcurrentOrders ?? 100),
        maxCaptainsOnline: String(nextProfile.capacity.maxCaptainsOnline ?? 30),
        throttleThreshold: String(nextProfile.capacity.throttleThreshold ?? 0.8),
        isPaused: nextProfile.capacity.isPaused,
        pauseReason: nextProfile.capacity.pauseReason ?? "",
        reason: "",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل سياسات الرحلة 29.");
    } finally {
      setLoading(false);
    }
  }, [selectedZoneId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = React.useCallback(async () => {
    if (!selectedZoneId) return;
    try {
      const reason = requiredReason(form.reason);
      if (form.isPaused && form.pauseReason.trim().length < 3) {
        throw new Error("سبب الإيقاف مطلوب عند إيقاف المنطقة.");
      }
      setLoading(true);
      setError(null);
      await upsertDshOperationalProfile(selectedZoneId, {
        slaCategory: form.slaCategory.trim().toLowerCase() || "default",
        maxPrepMins: integer(form.maxPrepMins, "حد التحضير", 1, 1440),
        maxAssignmentMins: integer(form.maxAssignmentMins, "حد الإسناد", 1, 1440),
        maxDeliveryMins: integer(form.maxDeliveryMins, "حد التوصيل", 1, 1440),
        expectedSlaVersion: profile?.sla.version ?? 0,
        maxConcurrentOrders: integer(form.maxConcurrentOrders, "الطلبات المتزامنة", 1, 1_000_000),
        maxCaptainsOnline: integer(form.maxCaptainsOnline, "الكباتن المتصلون", 0, 1_000_000),
        throttleThreshold: ratio(form.throttleThreshold),
        isPaused: form.isPaused,
        pauseReason: form.isPaused ? form.pauseReason.trim() : "",
        expectedCapacityVersion: profile?.capacity.version ?? 0,
        reason,
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ الملف التشغيلي.");
    } finally {
      setLoading(false);
    }
  }, [form, load, profile, selectedZoneId]);

  const toggleMode = React.useCallback(
    async (mode: DshDeliveryModePolicy) => {
      if (!selectedZoneId) return;
      try {
        setLoading(true);
        setError(null);
        await upsertDshOperationalDeliveryMode(selectedZoneId, mode.fulfillmentMode, {
          isEnabled: !mode.isEnabled,
          slaCategory: mode.slaCategory,
          expectedVersion: mode.version,
          reason: `تغيير إتاحة ${MODE_LABELS[mode.fulfillmentMode]} من لوحة الرحلة 29`,
        });
        await load();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "تعذر تغيير نمط التوصيل.");
      } finally {
        setLoading(false);
      }
    },
    [load, selectedZoneId],
  );

  const evaluate = React.useCallback(async () => {
    if (!selectedZoneId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await evaluateDshOperationalPolicy({
        zoneId: selectedZoneId,
        ...(selectedZone?.cityCode ? { serviceAreaCode: selectedZone.cityCode } : {}),
        fulfillmentMode: evaluationMode,
        slaCategory: form.slaCategory,
        activeOrders: integer(activeOrders, "الطلبات الحالية", 0, 1_000_000),
        captainsOnline: integer(captainsOnline, "الكباتن الحاليون", 0, 1_000_000),
      });
      setDecision(response.decision);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تقييم الأثر التشغيلي.");
    } finally {
      setLoading(false);
    }
  }, [activeOrders, captainsOnline, evaluationMode, form.slaCategory, selectedZone, selectedZoneId]);

  const rollback = React.useCallback(async () => {
    if (!selectedAudit) return;
    const version = currentVersionForEvent(selectedAudit, profile, modes, selectedZone);
    if (version == null) {
      setError("هذا السجل لا يملك إصدارًا حاليًا قابلًا للتراجع من هذه الواجهة.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await rollbackDshOperationalPolicy(selectedAudit.id, {
        expectedCurrentVersion: version,
        reason: requiredReason(rollbackReason),
      });
      setSelectedAudit(null);
      setRollbackReason("");
      await Promise.all([zones.reload(), load()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تنفيذ التراجع.");
    } finally {
      setLoading(false);
    }
  }, [load, modes, profile, rollbackReason, selectedAudit, selectedZone, zones]);

  const zoneRows = zones.state.kind === "success"
    ? (zones.state.data as (DshZone & Record<string, unknown>)[])
    : [];
  const modeRows = modes as (DshDeliveryModePolicy & Record<string, unknown>)[];
  const auditRows = audit as (DshOperationalPolicyAuditEvent & Record<string, unknown>)[];

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.grow}>
          <Text role="titleSm">إغلاق الرحلة 29: القرار التشغيلي الموحد</Text>
          <Text role="caption" tone="muted">
            يربط حدود منطقة الخدمة وSLA للتحضير والإسناد والتوصيل والسعة والإيقاف وأنماط التنفيذ بأثر واحد على السلة والدفع والطلب والتوزيع.
          </Text>
        </View>
        <CpButton variant="secondary" onClick={() => void load()} disabled={loading}>تحديث</CpButton>
      </View>

      {error ? <Text tone="danger">{error}</Text> : null}
      {loading ? <CpStateView kind="loading" title="جارٍ مزامنة الحقيقة التشغيلية…" /> : null}

      {zones.state.kind === "success" && zoneRows.length > 0 ? (
        <CpTable aria-label="مناطق الرحلة 29">
          <thead>
            <tr>
              <CpTableHeaderCell>المنطقة</CpTableHeaderCell>
              <CpTableHeaderCell>منطقة الخدمة</CpTableHeaderCell>
              <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {zoneRows.map((row) => (
              <tr
                key={row.id}
                onClick={() => {
                  setSelectedZoneId(row.id);
                  setDecision(null);
                  setSelectedAudit(null);
                }}
              >
                <CpTableCell>{row.name}</CpTableCell>
                <CpTableCell>{row.cityCode}</CpTableCell>
                <CpTableCell>{String(row.version)}</CpTableCell>
                <CpTableCell>
                  <CpBadge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "نشطة" : "معطلة"}</CpBadge>
                </CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      ) : null}

      {selectedZoneId ? (
        <Card style={styles.card}>
          <Text role="titleSm">SLA والسعة والإيقاف</Text>
          <View style={styles.grid}>
            <CpTextInput aria-label="فئة SLA" value={form.slaCategory} onChange={(slaCategory) => setForm((current) => ({ ...current, slaCategory }))} />
            <CpTextInput aria-label="حد التحضير (د)" value={form.maxPrepMins} onChange={(maxPrepMins) => setForm((current) => ({ ...current, maxPrepMins }))} />
            <CpTextInput aria-label="حد الإسناد (د)" value={form.maxAssignmentMins} onChange={(maxAssignmentMins) => setForm((current) => ({ ...current, maxAssignmentMins }))} />
            <CpTextInput aria-label="حد التوصيل (د)" value={form.maxDeliveryMins} onChange={(maxDeliveryMins) => setForm((current) => ({ ...current, maxDeliveryMins }))} />
            <CpTextInput aria-label="الطلبات المتزامنة" value={form.maxConcurrentOrders} onChange={(maxConcurrentOrders) => setForm((current) => ({ ...current, maxConcurrentOrders }))} />
            <CpTextInput aria-label="الحد الأعلى للكباتن" value={form.maxCaptainsOnline} onChange={(maxCaptainsOnline) => setForm((current) => ({ ...current, maxCaptainsOnline }))} />
            <CpTextInput aria-label="عتبة الضغط 0..1" value={form.throttleThreshold} onChange={(throttleThreshold) => setForm((current) => ({ ...current, throttleThreshold }))} />
          </View>
          <View style={styles.headerRow}>
            <CpBadge tone={form.isPaused ? "danger" : "success"}>{form.isPaused ? "المنطقة متوقفة" : "المنطقة تعمل"}</CpBadge>
            <CpButton
              variant={form.isPaused ? "secondary" : "danger"}
              onClick={() => setForm((current) => ({ ...current, isPaused: !current.isPaused, pauseReason: current.isPaused ? "" : current.pauseReason }))}
            >
              {form.isPaused ? "إلغاء الإيقاف" : "إيقاف تشغيلي"}
            </CpButton>
          </View>
          {form.isPaused ? <CpTextInput aria-label="سبب الإيقاف" value={form.pauseReason} onChange={(pauseReason) => setForm((current) => ({ ...current, pauseReason }))} /> : null}
          <CpTextInput aria-label="سبب تغيير السياسة" value={form.reason} onChange={(reason) => setForm((current) => ({ ...current, reason }))} />
          <CpButton onClick={() => void saveProfile()} disabled={loading}>حفظ SLA والسعة</CpButton>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text role="titleSm">أنماط التوصيل والتنفيذ</Text>
        {modeRows.length === 0 ? <CpStatePanel role="status" title="لا توجد أنماط معرفة" description="شغّل ترحيل الرحلة 29 ثم حدّث البيانات." /> : (
          <CpTable aria-label="أنماط التوصيل والتنفيذ">
            <thead>
              <tr>
                <CpTableHeaderCell>النمط</CpTableHeaderCell>
                <CpTableHeaderCell>فئة SLA</CpTableHeaderCell>
                <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
                <CpTableHeaderCell>الإتاحة</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {modeRows.map((row) => (
                <tr key={row.id} onClick={() => void toggleMode(row)}>
                  <CpTableCell>{MODE_LABELS[row.fulfillmentMode]}</CpTableCell>
                  <CpTableCell>{row.slaCategory}</CpTableCell>
                  <CpTableCell>{String(row.version)}</CpTableCell>
                  <CpTableCell>
                    <CpBadge tone={row.isEnabled ? "success" : "neutral"}>{row.isEnabled ? "متاح" : "موقوف"}</CpBadge>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </Card>

      <Card style={styles.card}>
        <Text role="titleSm">محاكاة الأثر على السلة وCheckout والطلب والتوزيع</Text>
        <View style={styles.modeRow}>
          {(Object.keys(MODE_LABELS) as DshFulfillmentMode[]).map((mode) => (
            <CpButton key={mode} variant={evaluationMode === mode ? "primary" : "secondary"} onClick={() => setEvaluationMode(mode)}>
              {MODE_LABELS[mode]}
            </CpButton>
          ))}
        </View>
        <View style={styles.grid}>
          <CpTextInput aria-label="الطلبات الحالية" value={activeOrders} onChange={setActiveOrders} />
          <CpTextInput aria-label="الكباتن المتصلون" value={captainsOnline} onChange={setCaptainsOnline} />
        </View>
        <CpButton onClick={() => void evaluate()} disabled={!selectedZoneId || loading}>تقييم القرار</CpButton>
        {decision ? (
          <View style={styles.result}>
            <CpBadge tone={decision.serviceable ? "success" : "danger"}>{decision.serviceable ? "قابل للخدمة" : decision.decision}</CpBadge>
            <Text role="body">ضغط السعة: {(decision.pressureRatio * 100).toFixed(1)}%</Text>
            <Text role="caption" tone="muted">الأسباب: {decision.reasonCodes.join("، ") || "لا توجد موانع"}</Text>
            <Text role="caption" tone="muted">
              السلة: {decision.effects.cartAllowed ? "مسموحة" : "ممنوعة"} · Checkout: {decision.effects.checkoutAllowed ? "مسموح" : "ممنوع"} · الطلب: {decision.effects.orderCreationAllowed ? "مسموح" : "ممنوع"} · التوزيع: {decision.effects.dispatchAllowed ? "مسموح" : "ممنوع"}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text role="titleSm">التدقيق والإصدارات والتراجع</Text>
        {auditRows.length === 0 ? <CpStatePanel role="status" title="لا توجد أحداث للمنطقة المختارة" /> : (
          <CpTable aria-label="تدقيق السياسة التشغيلية">
            <thead>
              <tr>
                <CpTableHeaderCell>النوع</CpTableHeaderCell>
                <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
                <CpTableHeaderCell>الإصدار</CpTableHeaderCell>
                <CpTableHeaderCell>السبب</CpTableHeaderCell>
                <CpTableHeaderCell>التوقيت</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={row.id} onClick={() => setSelectedAudit(row)}>
                  <CpTableCell>{row.aggregateType}</CpTableCell>
                  <CpTableCell>{row.action}</CpTableCell>
                  <CpTableCell>{String(row.toVersion)}</CpTableCell>
                  <CpTableCell>{row.reason}</CpTableCell>
                  <CpTableCell>{new Date(row.createdAt).toLocaleString("ar-YE")}</CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
        {selectedAudit ? (
          <View style={styles.result}>
            <Text role="caption">العودة إلى الحدث {selectedAudit.toVersion} من {selectedAudit.aggregateType}</Text>
            <CpTextInput aria-label="سبب التراجع" value={rollbackReason} onChange={setRollbackReason} />
            <CpButton variant="danger" onClick={() => void rollback()} disabled={loading}>تنفيذ تراجع بإصدار جديد</CpButton>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[3] },
  card: { gap: spacing[3] },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[2] },
  grow: { flex: 1, gap: spacing[1] },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: spacing[2] },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  result: { gap: spacing[2] },
});
