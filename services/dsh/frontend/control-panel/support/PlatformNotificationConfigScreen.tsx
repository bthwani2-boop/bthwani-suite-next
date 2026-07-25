"use client";

import React, { type ReactNode } from "react";
import {
  CpBadge,
  CpButton,
  CpFilterBar,
  CpMutedInline,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
  type CpBadgeTone,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  useNotificationDeliveryAuditController,
  usePlatformNotificationConfigController,
} from "../../shared/notifications";
import type {
  DshNotificationChannel,
  DshNotificationDeliveryAttempt,
  DshNotificationDeliveryOutcome,
  DshPlatformNotificationConfig,
  DshPushDeliveryAudit,
} from "../../shared/notifications";

const OUTCOME_LABELS: Readonly<Record<DshNotificationDeliveryOutcome, string>> = {
  sent: "تم الإرسال",
  retry_scheduled: "إعادة محاولة",
  dead_letter: "Dead letter",
};

function outcomeTone(outcome: DshNotificationDeliveryOutcome): CpBadgeTone {
  if (outcome === "sent") return "success";
  if (outcome === "dead_letter") return "danger";
  return "warning";
}

function pushStatusTone(status: DshPushDeliveryAudit["status"]): CpBadgeTone {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

function pushStatusLabel(status: DshPushDeliveryAudit["status"]): string {
  if (status === "sent") return "Push مرسل";
  if (status === "failed") return "Push فاشل";
  return "Push معلّق";
}

function splitValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseChannels(value: string): DshNotificationChannel[] {
  const channels = splitValues(value).filter(
    (item): item is DshNotificationChannel => item === "in_app" || item === "push",
  );
  return channels.length > 0 ? channels : ["in_app"];
}

let labeledFieldSeq = 0;

function LabeledField({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const id = React.useMemo(() => `platform-notification-field-${++labeledFieldSeq}`, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <label htmlFor={id}>{label}</label>
      {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id }) : children}
    </div>
  );
}

// CpTextInput has no multiline mode and CpPrimitives.tsx is off-limits for this
// migration, so multi-line fields keep a plain <textarea> instead of losing the
// multiline affordance.
function LabeledTextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly rows?: number;
}) {
  return (
    <LabeledField label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ width: "100%", font: "inherit", padding: "0.5rem 0.75rem", borderRadius: "0.75rem" }}
      />
    </LabeledField>
  );
}

export function PlatformNotificationConfigScreen() {
  const { state, reload, save } = usePlatformNotificationConfigController("authenticated");
  const deliveryAudit = useNotificationDeliveryAuditController("authenticated");
  const [editingConfig, setEditingConfig] = React.useState<DshPlatformNotificationConfig | null>(null);
  const [topic, setTopic] = React.useState("");
  const [actorTypes, setActorTypes] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [defaultChannels, setDefaultChannels] = React.useState("in_app");
  const [titleAr, setTitleAr] = React.useState("");
  const [bodyAr, setBodyAr] = React.useState("");
  const [titleEn, setTitleEn] = React.useState("");
  const [bodyEn, setBodyEn] = React.useState("");
  const [variables, setVariables] = React.useState("");
  const [deepLinkPattern, setDeepLinkPattern] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  function startEdit(row: DshPlatformNotificationConfig) {
    setEditingConfig(row);
    setTopic(row.topic);
    setActorTypes(row.actorTypes.join(", "));
    setDescription(row.description);
    setDefaultChannels(row.defaultChannels.join(", "));
    setTitleAr(row.titleAr);
    setBodyAr(row.bodyAr);
    setTitleEn(row.titleEn);
    setBodyEn(row.bodyEn);
    setVariables(row.variables.join(", "));
    setDeepLinkPattern(row.deepLinkPattern);
    setSaveMessage(null);
  }

  function resetEditor() {
    setEditingConfig(null);
    setTopic("");
    setActorTypes("");
    setDescription("");
    setDefaultChannels("in_app");
    setTitleAr("");
    setBodyAr("");
    setTitleEn("");
    setBodyEn("");
    setVariables("");
    setDeepLinkPattern("");
    setSaveMessage(null);
  }

  async function handleSave(nextEnabled: boolean) {
    const resolvedTopic = topic.trim();
    if (!resolvedTopic) {
      setSaveMessage("الموضوع مطلوب قبل الحفظ.");
      return;
    }
    if (!titleAr.trim() || !bodyAr.trim()) {
      setSaveMessage("العنوان والنص العربيان مطلوبان لضمان fallback تشغيلي.");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await save({
        topic: resolvedTopic,
        actorTypes: splitValues(actorTypes),
        isEnabled: nextEnabled,
        description: description.trim(),
        defaultChannels: parseChannels(defaultChannels),
        titleAr: titleAr.trim(),
        bodyAr: bodyAr.trim(),
        titleEn: titleEn.trim(),
        bodyEn: bodyEn.trim(),
        variables: splitValues(variables),
        deepLinkPattern: deepLinkPattern.trim(),
      });
      setSaveMessage("تم حفظ إعداد الإشعار.");
      setEditingConfig(null);
    } catch {
      setSaveMessage("تعذر حفظ إعداد الإشعار.");
    } finally {
      setIsSaving(false);
    }
  }

  const stateView =
    state.kind === "loading" || state.kind === "idle" ? (
      <CpStatePanel role="status" title="جارٍ التحميل…" />
    ) : state.kind === "error" ? (
      <CpStatePanel role="alert" title="خطأ" description={state.message}>
        <CpRetryButton onClick={reload}>إعادة المحاولة</CpRetryButton>
      </CpStatePanel>
    ) : undefined;

  const header = (
    <CpPageHeader title="إعدادات الإشعارات">
      <CpMutedInline tight>إدارة الاستهداف والقنوات والقوالب والروابط وتدقيق التسليم</CpMutedInline>
    </CpPageHeader>
  );

  if (state.kind !== "success") {
    return (
      <DataTablePageFrame dir="rtl" header={header} stateView={stateView}>
        {null}
      </DataTablePageFrame>
    );
  }

  return (
    <DataTablePageFrame dir="rtl" header={header}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1rem" }}>
        {state.configs.length === 0 ? (
          <CpStatePanel role="status" title="لا توجد إعدادات" description="لم يتم تهيئة أي إشعارات منصة بعد." />
        ) : (
          <CpTable aria-label="إعدادات إشعارات المنصة">
            <thead>
              <tr>
                <CpTableHeaderCell>الموضوع</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>الممثلون</CpTableHeaderCell>
                <CpTableHeaderCell>القنوات</CpTableHeaderCell>
                <CpTableHeaderCell>الوصف</CpTableHeaderCell>
                <CpTableHeaderCell>عُدِّل من</CpTableHeaderCell>
                <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {state.configs.map((row) => (
                <tr key={row.id}>
                  <CpTableCell>{row.topic}</CpTableCell>
                  <CpTableCell>
                    <CpBadge tone={row.isEnabled ? "success" : "neutral"}>{row.isEnabled ? "مفعّل" : "معطّل"}</CpBadge>
                  </CpTableCell>
                  <CpTableCell>{row.actorTypes.join(", ") || "الكل"}</CpTableCell>
                  <CpTableCell>{row.defaultChannels.join(", ")}</CpTableCell>
                  <CpTableCell>{row.description}</CpTableCell>
                  <CpTableCell>{row.updatedBy}</CpTableCell>
                  <CpTableCell>
                    <CpButton onClick={() => startEdit(row)}>تعديل</CpButton>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <strong>{editingConfig ? `تعديل ${editingConfig.topic}` : "تهيئة إشعار منصة"}</strong>
          <LabeledField label="الموضوع">
            <CpTextInput value={topic} onChange={setTopic} placeholder="order.status_changed" aria-label="الموضوع" />
          </LabeledField>
          <LabeledField label="أنواع الممثلين">
            <CpTextInput value={actorTypes} onChange={setActorTypes} placeholder="client, partner, captain, field" aria-label="أنواع الممثلين" />
          </LabeledField>
          <LabeledField label="القنوات الافتراضية">
            <CpTextInput value={defaultChannels} onChange={setDefaultChannels} placeholder="in_app, push" aria-label="القنوات الافتراضية" />
          </LabeledField>
          <LabeledTextArea label="الوصف" value={description} onChange={setDescription} rows={2} />
          <LabeledField label="العنوان العربي">
            <CpTextInput value={titleAr} onChange={setTitleAr} placeholder="تم تحديث طلبك" aria-label="العنوان العربي" />
          </LabeledField>
          <LabeledTextArea label="النص العربي" value={bodyAr} onChange={setBodyAr} rows={3} placeholder="تغيرت حالة الطلب إلى {{status}}" />
          <LabeledField label="English title">
            <CpTextInput value={titleEn} onChange={setTitleEn} placeholder="Your order was updated" aria-label="English title" />
          </LabeledField>
          <LabeledTextArea label="English body" value={bodyEn} onChange={setBodyEn} rows={3} placeholder="Order status changed to {{status}}" />
          <LabeledField label="متغيرات القالب">
            <CpTextInput value={variables} onChange={setVariables} placeholder="status, entityId" aria-label="متغيرات القالب" />
          </LabeledField>
          <LabeledField label="نمط الرابط العميق">
            <CpTextInput value={deepLinkPattern} onChange={setDeepLinkPattern} placeholder="/orders/{{entityId}}" aria-label="نمط الرابط العميق" />
          </LabeledField>
          {saveMessage ? <CpMutedInline tight>{saveMessage}</CpMutedInline> : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <CpButton variant="brand" disabled={isSaving} onClick={() => { void handleSave(true); }}>حفظ مفعّل</CpButton>
            <CpButton disabled={isSaving} onClick={() => { void handleSave(false); }}>حفظ معطّل</CpButton>
            {editingConfig ? <CpButton variant="ghost" onClick={resetEditor}>إلغاء</CpButton> : null}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <strong>تدقيق تسليم الإشعارات</strong>
          {deliveryAudit.state.kind === "idle" || deliveryAudit.state.kind === "loading" ? (
            <CpStatePanel role="status" title="جارٍ تحميل سجل التسليم…" />
          ) : deliveryAudit.state.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل سجل التسليم" description={deliveryAudit.state.message}>
              <CpRetryButton onClick={deliveryAudit.reload}>إعادة المحاولة</CpRetryButton>
            </CpStatePanel>
          ) : (
            <>
              <CpFilterBar label="ملخص تسليم الإشعارات">
                <CpBadge tone="success">{`Outbox مرسل: ${deliveryAudit.state.summary.sent}`}</CpBadge>
                <CpBadge tone="warning">{`Outbox يعاد: ${deliveryAudit.state.summary.retryScheduled}`}</CpBadge>
                <CpBadge tone="danger">{`Outbox dead letter: ${deliveryAudit.state.summary.deadLetter}`}</CpBadge>
                <CpBadge tone="neutral">{`Outbox معلّق: ${deliveryAudit.state.summary.pendingOutbox}`}</CpBadge>
                <CpBadge tone="danger">{`Outbox فاشل: ${deliveryAudit.state.summary.failedOutbox}`}</CpBadge>
                <CpBadge tone="success">{`Push مرسل: ${deliveryAudit.state.summary.sentPush}`}</CpBadge>
                <CpBadge tone="warning">{`Push معلّق: ${deliveryAudit.state.summary.pendingPush}`}</CpBadge>
                <CpBadge tone="danger">{`Push فاشل: ${deliveryAudit.state.summary.failedPush}`}</CpBadge>
              </CpFilterBar>
              <CpFilterBar label="فلاتر تدقيق التسليم">
                <CpButton variant={deliveryAudit.outcome ? "secondary" : "brand"} onClick={() => { void deliveryAudit.filter(); }}>الكل</CpButton>
                <CpButton variant={deliveryAudit.outcome === "sent" ? "brand" : "secondary"} onClick={() => { void deliveryAudit.filter("sent"); }}>تم الإرسال</CpButton>
                <CpButton variant={deliveryAudit.outcome === "retry_scheduled" ? "brand" : "secondary"} onClick={() => { void deliveryAudit.filter("retry_scheduled"); }}>إعادة محاولة</CpButton>
                <CpButton variant={deliveryAudit.outcome === "dead_letter" ? "brand" : "secondary"} onClick={() => { void deliveryAudit.filter("dead_letter"); }}>Dead letter</CpButton>
              </CpFilterBar>
              {deliveryAudit.state.attempts.length === 0 ? (
                <CpStatePanel role="status" title="لا توجد محاولات Outbox" description="لا توجد محاولات مطابقة للفلتر الحالي." />
              ) : (
                <CpTable aria-label="محاولات تسليم Outbox">
                  <thead>
                    <tr>
                      <CpTableHeaderCell>الحدث</CpTableHeaderCell>
                      <CpTableHeaderCell>الكيان</CpTableHeaderCell>
                      <CpTableHeaderCell>المحاولة</CpTableHeaderCell>
                      <CpTableHeaderCell>النتيجة</CpTableHeaderCell>
                      <CpTableHeaderCell>الخطأ</CpTableHeaderCell>
                      <CpTableHeaderCell>الوقت</CpTableHeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryAudit.state.attempts.map((row: DshNotificationDeliveryAttempt) => (
                      <tr key={row.id}>
                        <CpTableCell>{row.eventType}</CpTableCell>
                        <CpTableCell>{row.entityType} · {row.entityId}</CpTableCell>
                        <CpTableCell>{String(row.attemptNumber)}</CpTableCell>
                        <CpTableCell>
                          <CpBadge tone={outcomeTone(row.outcome)}>{OUTCOME_LABELS[row.outcome]}</CpBadge>
                        </CpTableCell>
                        <CpTableCell>{row.errorMessage || "—"}</CpTableCell>
                        <CpTableCell>{new Date(row.createdAt).toLocaleString("ar-YE")}</CpTableCell>
                      </tr>
                    ))}
                  </tbody>
                </CpTable>
              )}

              <strong>تسليم قناة Push</strong>
              {deliveryAudit.state.pushDeliveries.length === 0 ? (
                <CpStatePanel role="status" title="لا توجد عمليات Push" description="لم تنشأ عمليات تسليم Push بعد." />
              ) : (
                <CpTable aria-label="تسليم قناة Push">
                  <thead>
                    <tr>
                      <CpTableHeaderCell>الموضوع</CpTableHeaderCell>
                      <CpTableHeaderCell>الممثل</CpTableHeaderCell>
                      <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                      <CpTableHeaderCell>المحاولات</CpTableHeaderCell>
                      <CpTableHeaderCell>معرّف المزود</CpTableHeaderCell>
                      <CpTableHeaderCell>آخر خطأ</CpTableHeaderCell>
                      <CpTableHeaderCell>آخر تحديث</CpTableHeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryAudit.state.pushDeliveries.map((row: DshPushDeliveryAudit) => (
                      <tr key={row.id}>
                        <CpTableCell>{row.topic}</CpTableCell>
                        <CpTableCell>{row.actorType} · {row.actorId}</CpTableCell>
                        <CpTableCell>
                          <CpBadge tone={pushStatusTone(row.status)}>{pushStatusLabel(row.status)}</CpBadge>
                        </CpTableCell>
                        <CpTableCell>{String(row.attemptCount)}</CpTableCell>
                        <CpTableCell>{row.providerMessageId || "—"}</CpTableCell>
                        <CpTableCell>{row.lastError || "—"}</CpTableCell>
                        <CpTableCell>{new Date(row.updatedAt).toLocaleString("ar-YE")}</CpTableCell>
                      </tr>
                    ))}
                  </tbody>
                </CpTable>
              )}
            </>
          )}
        </section>
      </div>
    </DataTablePageFrame>
  );
}
