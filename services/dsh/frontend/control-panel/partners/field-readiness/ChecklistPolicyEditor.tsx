"use client";

import { useEffect, useState } from "react";
import { Button, neutralScale } from "@bthwani/ui-kit";
import {
  CpBadge,
  CpMutedInline,
  CpStatePanel,
  CpTextInput } from "@bthwani/control-panel/components";
import {
  fetchChecklistPolicy,
  replaceChecklistPolicy,
  type DshChecklistPolicyItem } from "../../../shared/field-readiness";

const VERTICALS = [
  { id: "domain-restaurants", label: "المطاعم" },
  { id: "domain-groceries", label: "البقالات والمخابز" },
  { id: "domain-pharmacy", label: "الصيدليات" },
  { id: "default", label: "السياسة الافتراضية" },
] as const;

type EditorState = "loading" | "ready" | "saving" | "saved" | "error";

export function ChecklistPolicyEditor() {
  const [businessVerticalId, setBusinessVerticalId] = useState(VERTICALS[0].id as string);
  const [version, setVersion] = useState(0);
  const [items, setItems] = useState<DshChecklistPolicyItem[]>([]);
  const [state, setState] = useState<EditorState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setMessage("");
    void fetchChecklistPolicy(businessVerticalId)
      .then((policy) => {
        if (cancelled) return;
        setVersion(policy.version);
        setItems(policy.items.map((item) => ({ ...item })));
        setState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
        setMessage("تعذر تحميل سياسة قائمة التحقق.");
      });
    return () => { cancelled = true; };
  }, [businessVerticalId]);

  function updateItem(index: number, patch: Partial<DshChecklistPolicyItem>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    setState("ready");
  }

  function addItem() {
    const nextOrder = items.reduce((maximum, item) => Math.max(maximum, item.displayOrder), 0) + 10;
    setItems((current) => [...current, {
      checkType: "new_check",
      labelAr: "بند تحقق جديد",
      required: true,
      critical: false,
      evidenceRequired: true,
      displayOrder: nextOrder }]);
    setState("ready");
  }

  function save() {
    setState("saving");
    setMessage("");
    void replaceChecklistPolicy(businessVerticalId, version, items)
      .then((policy) => {
        setVersion(policy.version);
        setItems(policy.items.map((item) => ({ ...item })));
        setState("saved");
        setMessage("حُفظت السياسة. الزيارات الجديدة فقط ستستخدم هذا الإصدار.");
      })
      .catch(() => {
        setState("error");
        setMessage("لم تُحفظ السياسة؛ أعد تحميلها لتفادي الكتابة فوق إصدار أحدث.");
      });
  }

  return (
    <section style={{ border: `1px solid ${neutralScale[200]}`, borderRadius: 12, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <strong>سياسة قائمة التحقق حسب النشاط</strong>
          <CpMutedInline tight>يأخذ كل بدء زيارة لقطة ثابتة من السياسة؛ لا يحتاج تغيير البنود إلى إصدار تطبيق الميدان.</CpMutedInline>
        </div>
        <CpBadge tone={version === 0 ? "warning" : "info"}>{version === 0 ? "سياسة نظام موروثة" : `الإصدار ${version}`}</CpBadge>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: 360 }}>
        <span>النشاط التجاري</span>
        <select value={businessVerticalId} onChange={(event) => setBusinessVerticalId(event.target.value)}>
          {VERTICALS.map((vertical) => <option key={vertical.id} value={vertical.id}>{vertical.label}</option>)}
        </select>
      </label>

      {state === "loading" ? <CpStatePanel role="status" title="جاري تحميل السياسة" /> : null}
      {state !== "loading" ? items.map((item, index) => (
        <div key={`${item.checkType}-${index}`} style={{ borderTop: `1px solid ${neutralScale[200]}`, paddingTop: "0.75rem", display: "grid", gridTemplateColumns: "minmax(160px, 1fr) minmax(220px, 2fr) auto", gap: "0.75rem", alignItems: "end" }}>
          <CpTextInput aria-label={`رمز البند ${index + 1}`} value={item.checkType} onChange={(checkType) => updateItem(index, { checkType })} placeholder="check_type" />
          <CpTextInput aria-label={`اسم البند ${index + 1}`} value={item.labelAr} onChange={(labelAr) => updateItem(index, { labelAr })} placeholder="اسم البند بالعربية" />
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <label><input type="checkbox" checked={item.required} onChange={(event) => updateItem(index, { required: event.target.checked, critical: event.target.checked ? item.critical : false })} /> إلزامي</label>
            <label><input type="checkbox" checked={item.critical} disabled={!item.required} onChange={(event) => updateItem(index, { critical: event.target.checked })} /> حرج</label>
            <label><input type="checkbox" checked={item.evidenceRequired} onChange={(event) => updateItem(index, { evidenceRequired: event.target.checked })} /> يتطلب دليلاً</label>
            <Button variant="danger" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>حذف</Button>
          </div>
        </div>
      )) : null}

      {message ? <CpStatePanel role={state === "error" ? "alert" : "status"} title={message} /> : null}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button onClick={addItem}>إضافة بند</Button>
        <Button variant="brand" disabled={state === "loading" || state === "saving" || items.length === 0} onClick={save}>
          {state === "saving" ? "جاري الحفظ…" : "حفظ السياسة"}
        </Button>
      </div>
    </section>
  );
}
