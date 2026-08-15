"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CpBadge, CpButton, CpSelect, CpStatePanel, CpTextInput } from "@bthwani/control-panel/components";
import { Text, alpha, colorRoles } from "@bthwani/ui-kit";
import {
  cancelFieldOnboardingAssignment,
  addOperatorOnboardingMessage,
  createOnboardingChangeRequest,
  createFieldOnboardingAssignment,
  getOperatorOnboardingCollaboration,
  listOperatorFieldOnboardingAssignments,
  reassignFieldOnboardingAssignment,
  type FieldOnboardingAssignment,
  type OnboardingCollaborationView,
} from "../../../shared/field-assignment";
import { listFieldAgents, type FieldAgent } from "../../../shared/workforce";
import { GoogleMapsWebCanvas } from "../../maps/GoogleMapsWebCanvas";

const STATUS_LABELS: Record<FieldOnboardingAssignment["status"], string> = {
  assigned: "مسندة",
  in_progress: "قيد التنفيذ",
  draft_linked: "مرتبطة بمسودة",
  cancelled: "ملغاة",
};

function CollaborationPanel({ item }: { readonly item: FieldOnboardingAssignment }) {
  const [view, setView] = useState<OnboardingCollaborationView | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!item.draftPartnerId) return;
    setBusy(true);
    setError(null);
    try {
      const next = await getOperatorOnboardingCollaboration(item.draftPartnerId, item.id);
      setView(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل سجل المتابعة");
    } finally { setBusy(false); }
  }

  async function send() {
    if (!item.draftPartnerId || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addOperatorOnboardingMessage(item.draftPartnerId, { body: body.trim(), clientMessageId: `cp-${item.id}-${Date.now()}` }, item.id);
      setBody("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إرسال الملاحظة");
    } finally { setBusy(false); }
  }

  async function returnForChanges() {
    if (!item.draftPartnerId || !view || !view.thread.version) return;
    setBusy(true);
    setError(null);
    try {
      await createOnboardingChangeRequest(item.draftPartnerId, {
        targetKind: "draft",
        targetId: item.draftPartnerId,
        reason: "يرجى استكمال الملاحظات المرفقة ثم إعادة الإرسال للمراجعة.",
        expectedVersion: view.partnerVersion,
        toStatus: "documents_missing",
      }, item.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إعادة الملف للميداني");
    } finally { setBusy(false); }
  }

  if (!item.draftPartnerId) return <Text role="caption" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>يظهر سجل المتابعة بعد ربط المسودة بالمتجر.</Text>;
  return (
    <div style={{ borderTop: "1px solid var(--bthwani-control-panel-border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <CpButton disabled={busy} onClick={() => { setOpen((current) => !current); if (!open) void load(); }}>{open ? "إخفاء سجل المتابعة" : "فتح سجل المتابعة"}</CpButton>
      {open ? <>
        {busy && !view ? <Text role="caption">جارٍ تحميل سجل المتابعة…</Text> : null}
        {view?.messages.map((message) => <div key={message.id} style={{ padding: 10, borderRadius: 10, background: colorRoles.surfaceMuted }}><Text role="bodySm">{message.body}</Text><Text role="caption" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>{message.senderSurface === "app-field" ? "الميداني" : "المشرف"} · {new Date(message.createdAt).toLocaleString("ar-YE")}</Text></div>)}
        {view && view.messages.length === 0 ? <Text role="caption">لا توجد ملاحظات بعد. اكتب ملاحظة مرتبطة بهذه المسودة.</Text> : null}
        <CpTextInput value={body} onChange={setBody} placeholder="ملاحظة مرتبطة بهذه المسودة" aria-label="ملاحظة المتابعة" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CpButton disabled={busy || !body.trim()} onClick={() => void send()}>إرسال الملاحظة</CpButton>
          {view ? <CpButton variant="danger" disabled={busy} onClick={() => void returnForChanges()}>إعادة للميداني مع ملاحظات</CpButton> : null}
        </div>
        {error ? <Text role="caption" style={{ color: colorRoles.danger }}>{error}</Text> : null}
      </> : null}
    </div>
  );
}

export function FieldAssignmentWorkspace() {
  const [agents, setAgents] = useState<readonly FieldAgent[]>([]);
  const [assignments, setAssignments] = useState<readonly FieldOnboardingAssignment[]>([]);
  const [selectedActorId, setSelectedActorId] = useState("");
  const [businessTaskKey, setBusinessTaskKey] = useState("");
  const [storeNameHint, setStoreNameHint] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [addressHint, setAddressHint] = useState("");
  const [locationLatitude, setLocationLatitude] = useState("");
  const [locationLongitude, setLocationLongitude] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [fieldAgents, items] = await Promise.all([
        listFieldAgents({ status: "active", limit: 100 }),
        listOperatorFieldOnboardingAssignments(),
      ]);
      setAgents(fieldAgents.filter((agent) => agent.engagementStatus === "active"));
      setAssignments(items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل إسنادات الميدانيين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const agentOptions = useMemo(() => [
    { value: "", label: "اختر الميداني" },
    ...agents.map((agent) => ({ value: agent.actorId, label: `${agent.fullNameAr} · الرقم ${agent.workforceCode}` })),
  ], [agents]);

  const parsedLatitude = Number(locationLatitude.trim());
  const parsedLongitude = Number(locationLongitude.trim());
  const hasCompleteLocation = Boolean(locationLatitude.trim() && locationLongitude.trim())
    && Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)
    && parsedLatitude >= -90 && parsedLatitude <= 90
    && parsedLongitude >= -180 && parsedLongitude <= 180;
  const hasPartialLocation = Boolean(locationLatitude.trim() || locationLongitude.trim());
  const mapPoints = useMemo(() => hasCompleteLocation ? [{
    id: "new-assignment-location",
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    title: storeNameHint.trim() || "موقع المتجر",
  }] : [], [hasCompleteLocation, parsedLatitude, parsedLongitude, storeNameHint]);
  const handleMapClick = React.useCallback((coordinate: { readonly latitude: number; readonly longitude: number }) => {
    setLocationLatitude(coordinate.latitude.toFixed(6));
    setLocationLongitude(coordinate.longitude.toFixed(6));
  }, []);

  async function createAssignment() {
    if (!selectedActorId || !storeNameHint.trim() || (!phoneHint.trim() && !addressHint.trim())) {
      setError("اختر الميداني وأدخل اسم المتجر مع الهاتف أو العنوان.");
      return;
    }
    if (hasPartialLocation && !hasCompleteLocation) {
      setError("أدخل خط العرض وخط الطول بشكل صحيح، أو اترك حقلي الموقع فارغين.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const input = {
        fieldActorId: selectedActorId,
        businessTaskKey: businessTaskKey.trim(),
        storeNameHint: storeNameHint.trim(),
        ...(phoneHint.trim() ? { phoneHint: phoneHint.trim() } : {}),
        ...(addressHint.trim() ? { addressHint: addressHint.trim() } : {}),
        ...(hasCompleteLocation ? { locationLatitude: parsedLatitude, locationLongitude: parsedLongitude } : {}),
      };
      await createFieldOnboardingAssignment(input);
      setBusinessTaskKey("");
      setStoreNameHint("");
      setPhoneHint("");
      setAddressHint("");
      setLocationLatitude("");
      setLocationLongitude("");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء الإسناد");
    } finally {
      setSubmitting(false);
    }
  }

  async function reassign(item: FieldOnboardingAssignment) {
    if (!reassigningId || reassigningId === item.fieldActorId || item.status === "draft_linked" || item.status === "cancelled") return;
    setSubmitting(true);
    try {
      await reassignFieldOnboardingAssignment(item.id, { expectedVersion: item.version, fieldActorId: reassigningId, handoff: item.status === "in_progress", reason: item.status === "in_progress" ? "تسليم رسمي لمهمة بدأت" : "إعادة إسناد من قسم الشركاء" });
      setReassigningId(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إعادة الإسناد");
    } finally { setSubmitting(false); }
  }

  async function cancel(item: FieldOnboardingAssignment) {
    if (item.status === "draft_linked" || item.status === "cancelled") return;
    setSubmitting(true);
    try {
      await cancelFieldOnboardingAssignment(item.id, { expectedVersion: item.version, reason: "إلغاء إسناد مهمة إدخال متجر" });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إلغاء الإسناد");
    } finally { setSubmitting(false); }
  }

  if (loading) return <CpStatePanel role="status" title="جاري تحميل إسنادات الميدانيين" description="يتم جلب المهام والحالة التشغيلية من النظام." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <section style={{ padding: 24, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 16, background: "var(--bthwani-control-panel-surface)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div><Text role="titleMd">إسناد مهمة إدخال متجر</Text><Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>اختر ميدانيًا نشطًا وأدخل اسم المتجر ورقم الهاتف، ثم ثبّت الموقع بالدبوس عند توفره.</Text></div>
          <span aria-hidden="true" style={{ fontSize: 30 }}>📍</span>
        </div>
        <CpSelect value={selectedActorId} onChange={setSelectedActorId} options={agentOptions} aria-label="الميداني" />
        <CpTextInput value={businessTaskKey} onChange={setBusinessTaskKey} placeholder="مرجع مهمة الأعمال" aria-label="مرجع مهمة الأعمال" />
        <CpTextInput value={storeNameHint} onChange={setStoreNameHint} placeholder="اسم المتجر" aria-label="اسم المتجر" />
        <CpTextInput value={phoneHint} onChange={setPhoneHint} placeholder="رقم هاتف المتجر (اختياري إذا وُجد العنوان)" aria-label="رقم هاتف المتجر" />
        <CpTextInput value={addressHint} onChange={setAddressHint} placeholder="العنوان أو وصف المكان (اختياري إذا وُجد الهاتف)" aria-label="عنوان المتجر" />
        <div style={{ padding: 16, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 14, background: "var(--bthwani-control-panel-surface-muted, var(--bthwani-control-panel-surface))", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Text role="bodyStrong">دبوس موقع المتجر</Text>
            <CpBadge tone={hasCompleteLocation ? "success" : "neutral"}>{hasCompleteLocation ? "الموقع مثبت" : "اختياري"}</CpBadge>
          </div>
          <Text role="bodySm" style={{ color: "var(--bthwani-control-panel-text-muted)" }}>انقر على الخريطة لتثبيت الدبوس، أو أدخل خط العرض وخط الطول يدويًا. لا تعتمد العنوان النصي وحده للوصول.</Text>
          <GoogleMapsWebCanvas points={mapPoints} height={240} onMapClick={handleMapClick} ariaLabel="خريطة تحديد موقع المتجر" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <CpTextInput value={locationLatitude} onChange={setLocationLatitude} placeholder="خط العرض مثال 15.3694" aria-label="خط عرض موقع المتجر" />
            <CpTextInput value={locationLongitude} onChange={setLocationLongitude} placeholder="خط الطول مثال 44.1910" aria-label="خط طول موقع المتجر" />
          </div>
        </div>
        <CpButton variant="primary" disabled={submitting || !selectedActorId || !businessTaskKey.trim() || !storeNameHint.trim() || (!phoneHint.trim() && !addressHint.trim())} onClick={() => void createAssignment()}>إنشاء إسناد</CpButton>
      </section>

      {error ? <CpStatePanel role="alert" title="تعذر تنفيذ العملية" description={error} /> : null}
      {assignments.length === 0 ? <CpStatePanel role="status" title="لا توجد إسنادات" description="أنشئ مهمة إدخال متجر من النموذج أعلاه." /> : assignments.map((item) => (
        <section key={item.id} style={{ padding: 20, border: "1px solid var(--bthwani-control-panel-border)", borderRadius: 16, background: "var(--bthwani-control-panel-surface)", boxShadow: `0 8px 24px ${alpha(colorRoles.shadowBase, 0.06)}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div><Text role="titleSm">{item.storeNameHint}</Text><Text role="bodySm">الميداني: {agents.find((agent) => agent.actorId === item.fieldActorId)?.fullNameAr ?? item.fieldActorId}</Text></div>
            <CpBadge tone={item.status === "cancelled" ? "danger" : item.status === "draft_linked" ? "success" : "info"}>{STATUS_LABELS[item.status]}</CpBadge>
          </div>
          <Text role="bodySm">مرجع المهمة: {item.businessTaskKey} · {item.phoneHint || item.addressHint || "لا توجد بيانات اتصال"}</Text>
          <Text role="bodySm">الأولوية: {item.priority} · SLA: {item.slaMinutes} دقيقة{item.overdue ? " · متأخرة" : ""}</Text>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--bthwani-control-panel-text-muted)" }}>
            <span aria-hidden="true">📍</span>
            <Text role="bodySm">{item.locationLatitude !== undefined && item.locationLongitude !== undefined ? `الموقع مثبت: ${item.locationLatitude.toFixed(6)}، ${item.locationLongitude.toFixed(6)}` : "لم يُثبت موقع جغرافي بعد"}</Text>
          </div>
          <CollaborationPanel item={item} />
          {item.status !== "draft_linked" && item.status !== "cancelled" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CpSelect value={reassigningId ?? item.fieldActorId} onChange={setReassigningId} options={agentOptions.filter((option) => option.value !== "")} aria-label="إعادة إسناد الميداني" />
              <CpButton disabled={submitting || !reassigningId || reassigningId === item.fieldActorId} onClick={() => void reassign(item)}>إعادة إسناد</CpButton>
              <CpButton variant="danger" disabled={submitting} onClick={() => void cancel(item)}>إلغاء</CpButton>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}