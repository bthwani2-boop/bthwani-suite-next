"use client";

import { useState } from "react";
import { CpButton, CpEmptyTableMessage, CpPageHeader, CpSelect, CpStatePanel, CpTable, CpTableCell, CpTableHeaderCell, CpTextInput, DataTablePageFrame } from "@bthwani/ui-kit/web";
import { useIdentitySession, devBypassLogin } from "@bthwani/app-shell";
import {
  useHomeDiscoveryAdminController,
  type DshHomeAdminContentInput,
  type DshHomeAdminKind,
} from "../../../shared/home-discovery";

const KIND_META = {
  banners: { title: "إدارة بنرات الصفحة الرئيسية", singular: "بنر", imageLabel: "رابط صورة البنر" },
  promos: { title: "إدارة عروض الصفحة الرئيسية", singular: "عرض", imageLabel: "رابط صورة العرض" },
  categories: { title: "إدارة تصنيفات الصفحة الرئيسية", singular: "تصنيف", imageLabel: "رابط الأيقونة (اختياري)" },
} as const;

export function HomeDiscoveryAdminScreen({ kind }: { readonly kind: DshHomeAdminKind }) {
  const identity = useIdentitySession();
  const controller = useHomeDiscoveryAdminController(kind, identity.state.kind);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const meta = KIND_META[kind];

  if (identity.state.kind !== "authenticated") {
    return (
      <section dir="rtl" style={{ maxWidth: "32rem", margin: "4rem auto", display: "grid", gap: "1rem", padding: "1.5rem" }}>
        <h1>{meta.title}</h1>
        <p>سجّل الدخول بحساب operator لإدارة محتوى الواجهة.</p>
        <CpTextInput value={username} onChange={setUsername} placeholder="اسم المستخدم" aria-label="اسم المستخدم" />
        <CpTextInput value={password} onChange={setPassword} placeholder="كلمة المرور" type="password" aria-label="كلمة المرور" />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton
            disabled={username.trim().length === 0 || password.length < 4 || identity.state.kind === "authenticating"}
            onClick={() => void identity.login(username.trim(), password)}
            style={{ flex: 1 }}
          >
            {identity.state.kind === "authenticating" ? "جاري التحقق…" : "تسجيل الدخول"}
          </CpButton>
          <CpButton
            onClick={() => devBypassLogin("operator")}
            style={{ flex: 1 }}
          >
            تجاوز تسجيل الدخول (مطور)
          </CpButton>
        </div>
        {identity.state.kind === "error" && <p role="alert">{identity.state.message}</p>}
      </section>
    );
  }

  const items = controller.state.kind === "success" ? controller.state.items : [];
  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title={meta.title}>
          <p>تحكم مباشر بالمحتوى الذي يستهلكه تطبيق العميل عبر DSH-002.</p>
        </CpPageHeader>
      }
      stateView={
        controller.state.kind === "loading" ? <CpStatePanel role="status" title="جاري تحميل المحتوى" /> :
        controller.state.kind === "permission_denied" ? <CpStatePanel role="alert" title="غير مصرح" description="يتطلب هذا المسار دور operator." /> :
        controller.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل المحتوى" description={controller.state.message}><CpButton onClick={controller.retry}>إعادة المحاولة</CpButton></CpStatePanel> :
        undefined
      }
      toolbar={
        <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 1rem" }}>
          <CpButton onClick={() => controller.select(null)}>إضافة {meta.singular}</CpButton>
          <CpButton onClick={controller.retry}>تحديث</CpButton>
        </div>
      }
      sidePanel={
        <HomeDiscoveryEditor
          kind={kind}
          draft={controller.draft}
          setDraft={controller.setDraft}
          editing={controller.selected !== null}
          submitting={controller.actionState.kind === "submitting"}
          onSave={() => void controller.save(controller.draft)}
          onCancel={() => controller.select(null)}
        />
      }
    >
      <>
        {controller.actionState.kind === "success" && <p role="status">{controller.actionState.message}</p>}
        {controller.actionState.kind === "error" && <p role="alert">{controller.actionState.message}</p>}
        {controller.state.kind === "empty" ? (
          <CpEmptyTableMessage>لا يوجد محتوى من هذا النوع. أضف أول عنصر.</CpEmptyTableMessage>
        ) : controller.state.kind === "success" ? (
          <CpTable aria-label={meta.title}>
            <thead><tr>
              {["العنوان", "الحالة", "الترتيب", "الإجراء", "التحكم"].map((label) => <CpTableHeaderCell key={label}>{label}</CpTableHeaderCell>)}
            </tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell>{item.title}</CpTableCell>
                  <CpTableCell>{item.isActive ? "نشط" : "موقوف"}</CpTableCell>
                  <CpTableCell>{item.sortOrder}</CpTableCell>
                  <CpTableCell>{item.actionType === "none" ? "بدون انتقال" : `${item.actionType}: ${item.actionTarget}`}</CpTableCell>
                  <CpTableCell>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <CpButton onClick={() => controller.select(item)}>تعديل</CpButton>
                      <CpButton onClick={() => void controller.remove(item.id)}>حذف</CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        ) : null}
      </>
    </DataTablePageFrame>
  );
}

function HomeDiscoveryEditor({
  kind, draft, setDraft, editing, submitting, onSave, onCancel,
}: {
  readonly kind: DshHomeAdminKind;
  readonly draft: DshHomeAdminContentInput;
  readonly setDraft: (value: DshHomeAdminContentInput) => void;
  readonly editing: boolean;
  readonly submitting: boolean;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}) {
  const meta = KIND_META[kind];
  const update = <K extends keyof DshHomeAdminContentInput>(key: K, value: DshHomeAdminContentInput[K]) =>
    setDraft({ ...draft, [key]: value });
  return (
    <section dir="rtl" style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
      <h2>{editing ? `تعديل ${meta.singular}` : `إضافة ${meta.singular}`}</h2>
      <CpTextInput value={draft.title} onChange={(v) => update("title", v)} placeholder="العنوان" aria-label="العنوان" />
      {kind !== "categories" && <CpTextInput value={draft.subtitle} onChange={(v) => update("subtitle", v)} placeholder="الوصف المختصر" aria-label="الوصف المختصر" />}
      {kind === "promos" && <CpTextInput value={draft.badgeLabel} onChange={(v) => update("badgeLabel", v)} placeholder="شارة العرض" aria-label="شارة العرض" />}
      <CpTextInput value={draft.imageUrl} onChange={(v) => update("imageUrl", v)} placeholder={meta.imageLabel} aria-label={meta.imageLabel} />
      {kind !== "categories" && (
        <>
          <CpSelect
            value={draft.actionType}
            onChange={(v) => update("actionType", v as DshHomeAdminContentInput["actionType"])}
            options={[
              { value: "none", label: "بدون انتقال" },
              { value: "store", label: "متجر" },
              { value: "category", label: "تصنيف" },
              { value: "external", label: "رابط خارجي" },
            ]}
            aria-label="نوع الإجراء"
          />
          <CpTextInput value={draft.actionTarget} onChange={(v) => update("actionTarget", v)} placeholder="هدف الإجراء" aria-label="هدف الإجراء" />
        </>
      )}
      <CpTextInput value={String(draft.sortOrder)} onChange={(v) => update("sortOrder", Number.parseInt(v, 10) || 0)} placeholder="الترتيب" aria-label="الترتيب" />
      <CpSelect
        value={draft.isActive ? "active" : "inactive"}
        onChange={(v) => update("isActive", v === "active")}
        options={[{ value: "active", label: "نشط" }, { value: "inactive", label: "موقوف" }]}
        aria-label="حالة النشر"
      />
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <CpButton disabled={submitting || draft.title.trim().length < 2 || (kind !== "categories" && draft.imageUrl.trim().length === 0)} onClick={onSave}>
          {submitting ? "جاري الحفظ…" : "حفظ ونشر"}
        </CpButton>
        <CpButton onClick={onCancel}>إلغاء</CpButton>
      </div>
    </section>
  );
}
