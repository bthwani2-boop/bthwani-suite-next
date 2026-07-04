"use client";
import { colorRoles } from '@bthwani/ui-kit';
import React from "react";
import {
  CpButton,
  CpTextInput,
  CpSelect,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpEmptyTableMessage,
  CpStatePanel,
} from "@bthwani/control-panel/components";
import { useIdentitySession } from "@bthwani/core-identity";
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

export function MarketingHomeDiscoveryPanel({ kind }: { readonly kind: DshHomeAdminKind }) {
  const identity = useIdentitySession();
  const controller = useHomeDiscoveryAdminController(kind, identity.state.kind);
  const meta = KIND_META[kind];

  if (controller.state.kind === "loading") {
    return <CpStatePanel role="status" title="جاري تحميل المحتوى..." />;
  }
  if (controller.state.kind === "error") {
    return (
      <CpStatePanel role="alert" title="تعذر تحميل البيانات" description={controller.state.message}>
        <CpButton onClick={controller.retry}>إعادة المحاولة</CpButton>
      </CpStatePanel>
    );
  }

  const items = controller.state.kind === "success" ? controller.state.items : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: controller.selected !== null ? "1fr 22rem" : "1fr", gap: "1.5rem", padding: "1rem" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{meta.title}</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <CpButton onClick={() => controller.select(null)}>إضافة {meta.singular}</CpButton>
            <CpButton onClick={controller.retry}>تحديث</CpButton>
          </div>
        </div>

        {controller.actionState.kind === "success" && (
          <p role="status" style={{ color: `var(--status-success-strong, ${colorRoles.brandStructure})`, fontSize: "0.85rem", margin: "0 0 1rem" }}>
            {controller.actionState.message}
          </p>
        )}
        {controller.actionState.kind === "error" && (
          <p role="alert" style={{ color: colorRoles.brandAction, fontSize: "0.85rem", margin: "0 0 1rem" }}>
            {controller.actionState.message}
          </p>
        )}

        {controller.state.kind === "empty" ? (
          <CpEmptyTableMessage>لا يوجد محتوى من هذا النوع. أضف أول عنصر.</CpEmptyTableMessage>
        ) : (
          <CpTable aria-label={meta.title}>
            <thead>
              <tr>
                <CpTableHeaderCell>العنوان</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>الترتيب</CpTableHeaderCell>
                <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
                <CpTableHeaderCell>التحكم</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell>{item.title}</CpTableCell>
                  <CpTableCell>{item.isActive ? "نشط" : "موقوف"}</CpTableCell>
                  <CpTableCell>{item.sortOrder}</CpTableCell>
                  <CpTableCell>
                    {item.actionType === "none" ? "بدون انتقال" : `${item.actionType}: ${item.actionTarget}`}
                  </CpTableCell>
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
        )}
      </div>

      {controller.selected !== null && (
        <div style={{ background: colorRoles.surfaceBase, border: `1px solid ${colorRoles.surfaceBase}`, borderRadius: "0.75rem", padding: "1.25rem" }}>
          <HomeDiscoveryEditor
            kind={kind}
            draft={controller.draft}
            setDraft={controller.setDraft}
            editing={controller.selected !== null && controller.selected.id !== ""}
            submitting={controller.actionState.kind === "submitting"}
            onSave={() => void controller.save(controller.draft)}
            onCancel={() => controller.select(null)}
          />
        </div>
      )}
    </div>
  );
}

function HomeDiscoveryEditor({
  kind,
  draft,
  setDraft,
  editing,
  submitting,
  onSave,
  onCancel,
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
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
        {editing ? `تعديل ${meta.singular}` : `إضافة ${meta.singular}`}
      </h4>
      <CpTextInput value={draft.title} onChange={(v) => update("title", v)} placeholder="العنوان" aria-label="العنوان" />
      {kind !== "categories" && (
        <CpTextInput value={draft.subtitle} onChange={(v) => update("subtitle", v)} placeholder="الوصف المختصر" aria-label="الوصف المختصر" />
      )}
      {kind === "promos" && (
        <CpTextInput value={draft.badgeLabel} onChange={(v) => update("badgeLabel", v)} placeholder="شارة العرض" aria-label="شارة العرض" />
      )}
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
        options={[
          { value: "active", label: "نشط" },
          { value: "inactive", label: "موقوف" },
        ]}
        aria-label="حالة النشر"
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <CpButton
          disabled={submitting || draft.title.trim().length < 2 || (kind !== "categories" && draft.imageUrl.trim().length === 0)}
          onClick={onSave}
          style={{ background: colorRoles.brandAction, color: colorRoles.surfaceBase, border: "none", borderRadius: "0.375rem", padding: "0.35rem 0.75rem", fontSize: "0.813rem" }}
        >
          {submitting ? "جاري الحفظ…" : "حفظ ونشر"}
        </CpButton>
        <CpButton onClick={onCancel} style={{ borderRadius: "0.375rem", padding: "0.35rem 0.75rem", fontSize: "0.813rem" }}>
          إلغاء
        </CpButton>
      </div>
    </div>
  );
}
