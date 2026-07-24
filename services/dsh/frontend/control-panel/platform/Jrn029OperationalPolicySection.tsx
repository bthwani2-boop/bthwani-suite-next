"use client";

import React from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  WebStyleSheet as StyleSheet,
  WebView as View,
} from "@bthwani/ui-kit/web";
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

export function Jrn029OperationalPolicySection() {
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
        <Button label="تحديث" tone="secondary" onPress={() => void load()} disabled={loading} />
      </View>

      {error ? <Text tone="danger">{error}</Text> : null}
      {loading ? <StateView title="جارٍ مزامنة الحقيقة التشغيلية…" /> : null}

      {zones.state.kind === "success" && zoneRows.length > 0 ? (
        <DataTable<DshZone & Record<string, unknown>>
          columns={[
            { key: "name", header: "المنطقة", render: (row) => row.name },
            { key: "cityCode", header: "منطقة الخدمة", render: (row) => row.cityCode },
            { key: "version", header: "الإصدار", render: (row) => String(row.version) },
            {
              key: "isActive",
              header: "الحالة",
              render: (row) => <Badge label={row.isActive ? "نشطة" : "معطلة"} tone={row.isActive ? "success" : "neutral"} />,
            },
          ]}
          rows={zoneRows}
          getRowKey={(row) => row.id}
          onRowPress={(row) => {
            setSelectedZoneId(row.id);
            setDecision(null);
            setSelectedAudit(null);
          }}
        />
      ) : null}

      {selectedZoneId ? (
        <Card style={styles.card}>
          <Text role="titleSm">SLA والسعة والإيقاف</Text>
          <View style={styles.grid}>
            <TextField label="فئة SLA" value={form.slaCategory} onChangeText={(slaCategory) => setForm((current) => ({ ...current, slaCategory }))} />
            <TextField label="حد التحضير (د)" value={form.maxPrepMins} onChangeText={(maxPrepMins) => setForm((current) => ({ ...current, maxPrepMins }))} />
            <TextField label="حد الإسناد (د)" value={form.maxAssignmentMins} onChangeText={(maxAssignmentMins) => setForm((current) => ({ ...current, maxAssignmentMins }))} />
            <TextField label="حد التوصيل (د)" value={form.maxDeliveryMins} onChangeText={(maxDeliveryMins) => setForm((current) => ({ ...current, maxDeliveryMins }))} />
            <TextField label="الطلبات المتزامنة" value={form.maxConcurrentOrders} onChangeText={(maxConcurrentOrders) => setForm((current) => ({ ...current, maxConcurrentOrders }))} />
            <TextField label="الحد الأعلى للكباتن" value={form.maxCaptainsOnline} onChangeText={(maxCaptainsOnline) => setForm((current) => ({ ...current, maxCaptainsOnline }))} />
            <TextField label="عتبة الضغط 0..1" value={form.throttleThreshold} onChangeText={(throttleThreshold) => setForm((current) => ({ ...current, throttleThreshold }))} />
          </View>
          <View style={styles.headerRow}>
            <Badge label={form.isPaused ? "المنطقة متوقفة" : "المنطقة تعمل"} tone={form.isPaused ? "danger" : "success"} />
            <Button
              label={form.isPaused ? "إلغاء الإيقاف" : "إيقاف تشغيلي"}
              tone={form.isPaused ? "secondary" : "danger"}
              onPress={() => setForm((current) => ({ ...current, isPaused: !current.isPaused, pauseReason: current.isPaused ? "" : current.pauseReason }))}
            />
          </View>
          {form.isPaused ? <TextField label="سبب الإيقاف" value={form.pauseReason} onChangeText={(pauseReason) => setForm((current) => ({ ...current, pauseReason }))} /> : null}
          <TextField label="سبب تغيير السياسة" value={form.reason} onChangeText={(reason) => setForm((current) => ({ ...current, reason }))} />
          <Button label="حفظ SLA والسعة" onPress={() => void saveProfile()} disabled={loading} />
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text role="titleSm">أنماط التوصيل والتنفيذ</Text>
        {modeRows.length === 0 ? <StateView title="لا توجد أنماط معرفة" description="شغّل ترحيل الرحلة 29 ثم حدّث البيانات." /> : (
          <DataTable<DshDeliveryModePolicy & Record<string, unknown>>
            columns={[
              { key: "fulfillmentMode", header: "النمط", render: (row) => MODE_LABELS[row.fulfillmentMode] },
              { key: "slaCategory", header: "فئة SLA", render: (row) => row.slaCategory },
              { key: "version", header: "الإصدار", render: (row) => String(row.version) },
              { key: "isEnabled", header: "الإتاحة", render: (row) => <Badge label={row.isEnabled ? "متاح" : "موقوف"} tone={row.isEnabled ? "success" : "neutral"} /> },
            ]}
            rows={modeRows}
            getRowKey={(row) => row.id}
            onRowPress={(row) => void toggleMode(row)}
          />
        )}
      </Card>

      <Card style={styles.card}>
        <Text role="titleSm">محاكاة الأثر على السلة وCheckout والطلب والتوزيع</Text>
        <View style={styles.modeRow}>
          {(Object.keys(MODE_LABELS) as DshFulfillmentMode[]).map((mode) => (
            <Button key={mode} label={MODE_LABELS[mode]} tone={evaluationMode === mode ? "primary" : "secondary"} onPress={() => setEvaluationMode(mode)} />
          ))}
        </View>
        <View style={styles.grid}>
          <TextField label="الطلبات الحالية" value={activeOrders} onChangeText={setActiveOrders} />
          <TextField label="الكباتن المتصلون" value={captainsOnline} onChangeText={setCaptainsOnline} />
        </View>
        <Button label="تقييم القرار" onPress={() => void evaluate()} disabled={!selectedZoneId || loading} />
        {decision ? (
          <View style={styles.result}>
            <Badge label={decision.serviceable ? "قابل للخدمة" : decision.decision} tone={decision.serviceable ? "success" : "danger"} />
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
        {auditRows.length === 0 ? <StateView title="لا توجد أحداث للمنطقة المختارة" /> : (
          <DataTable<DshOperationalPolicyAuditEvent & Record<string, unknown>>
            columns={[
              { key: "aggregateType", header: "النوع", render: (row) => row.aggregateType },
              { key: "action", header: "الإجراء", render: (row) => row.action },
              { key: "toVersion", header: "الإصدار", render: (row) => String(row.toVersion) },
              { key: "reason", header: "السبب", render: (row) => row.reason },
              { key: "createdAt", header: "التوقيت", render: (row) => new Date(row.createdAt).toLocaleString("ar-YE") },
            ]}
            rows={auditRows}
            getRowKey={(row) => row.id}
            onRowPress={setSelectedAudit}
          />
        )}
        {selectedAudit ? (
          <View style={styles.result}>
            <Text role="caption">العودة إلى الحدث {selectedAudit.toVersion} من {selectedAudit.aggregateType}</Text>
            <TextField label="سبب التراجع" value={rollbackReason} onChangeText={setRollbackReason} />
            <Button label="تنفيذ تراجع بإصدار جديد" tone="danger" onPress={() => void rollback()} disabled={loading} />
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
