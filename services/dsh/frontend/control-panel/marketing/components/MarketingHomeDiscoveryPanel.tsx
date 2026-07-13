"use client";
import { colorRoles, alpha } from '@bthwani/ui-kit';
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
import { useControlPanelSession } from "../../../shared/session/control-panel-session";
import {
  useHomeDiscoveryAdminController,
  type DshHomeAdminContentInput,
  type DshHomeAdminKind,
} from "../../../shared/home-discovery";

const KIND_META = {
  banners: { title: "إدارة بنرات الصفحة الرئيسية", singular: "بنر", imageLabel: "رابط صورة البنر" },
  promos: { title: "إدارة عروض الصفحة الرئيسية", singular: "عرض", imageLabel: "رابط صورة العرض" },
} as const;

export function MarketingHomeDiscoveryPanel({ kind }: { readonly kind: DshHomeAdminKind }) {
  const { state } = useControlPanelSession();
  const controller = useHomeDiscoveryAdminController(kind, state.kind);
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

function computeQuality(draft: DshHomeAdminContentInput): number {
  let score = 0;
  if (draft.title?.trim()) {
    score += 20;
    if (draft.title.trim().length >= 5) score += 15;
  }
  if (draft.subtitle?.trim()) {
    score += 15;
    if (draft.subtitle.trim().length >= 10) score += 15;
  }
  if (draft.imageUrl?.trim()) {
    score += 25;
  }
  if (draft.actionType === "none" || draft.actionTarget?.trim()) {
    score += 10;
  }
  return score;
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

  const quality = computeQuality(draft);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
        {editing ? `تعديل ${meta.singular}` : `إضافة ${meta.singular}`}
      </h4>

      {/* Visual Live Preview */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, opacity: 0.65 }}>المعاينة التفاعلية (app-client):</span>
        {kind === "banners" ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/9",
              borderRadius: "0.75rem",
              background: draft.imageUrl?.trim()
                ? `url(${draft.imageUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${colorRoles.brandStructure} 0%, color-mix(in srgb, ${colorRoles.brandStructure} 80%, black) 100%)`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "1rem",
              boxShadow: `0 4px 12px ${alpha(colorRoles.shadowBase, 0.15)}`,
              overflow: "hidden",
              border: `1px solid color-mix(in srgb, currentColor 10%, transparent)`,
            }}
          >
            {/* Overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(to top, ${alpha(colorRoles.mediaScrimStrong, 0.9)} 0%, ${alpha(colorRoles.mediaScrimStrong, 0.4)} 60%, transparent 100%)`,
                zIndex: 1,
              }}
            />
            {/* Content */}
            <div style={{ position: "relative", zIndex: 2, color: colorRoles.textInverse, display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "right" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: colorRoles.brandAction, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {draft.actionType !== "none" ? `انتقال إلى ${draft.actionType === "store" ? "المتجر" : draft.actionType === "category" ? "التصنيف" : "رابط"}` : "عرض ترويجي"}
              </span>
              <strong style={{ fontSize: "1.05rem", fontWeight: 800, textShadow: `0 1px 2px ${alpha(colorRoles.shadowBase, 0.5)}` }}>
                {draft.title || "عنوان البنر الجديد"}
              </strong>
              {draft.subtitle && (
                <span style={{ fontSize: "0.78rem", opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {draft.subtitle}
                </span>
              )}
            </div>
            {/* Simulated dots */}
            <div style={{ position: "absolute", bottom: "0.75rem", left: "1rem", display: "flex", gap: "4px", zIndex: 2 }}>
              <div style={{ width: "12px", height: "4px", borderRadius: "2px", background: colorRoles.brandAction }} />
              <div style={{ width: "4px", height: "4px", borderRadius: "2px", background: alpha(colorRoles.textInverse, 0.4) }} />
              <div style={{ width: "4px", height: "4px", borderRadius: "2px", background: alpha(colorRoles.textInverse, 0.4) }} />
            </div>
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/9",
              borderRadius: "0.75rem",
              background: draft.imageUrl?.trim()
                ? `url(${draft.imageUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${colorRoles.brandStructure} 0%, color-mix(in srgb, ${colorRoles.brandStructure} 80%, black) 100%)`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "1rem",
              boxShadow: `0 4px 12px ${alpha(colorRoles.shadowBase, 0.15)}`,
              overflow: "hidden",
              border: `1px solid color-mix(in srgb, currentColor 10%, transparent)`,
            }}
          >
            {/* Overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(to top, ${alpha(colorRoles.mediaScrimStrong, 0.9)} 0%, ${alpha(colorRoles.mediaScrimStrong, 0.3)} 70%, transparent 100%)`,
                zIndex: 1,
              }}
            />
            {/* Badge */}
            <div
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "0.75rem",
                background: colorRoles.brandAction,
                color: colorRoles.textInverse,
                padding: "0.25rem 0.625rem",
                borderRadius: "0.5rem",
                fontSize: "0.7rem",
                fontWeight: 800,
                zIndex: 2,
                boxShadow: `0 2px 4px ${alpha(colorRoles.shadowBase, 0.2)}`,
              }}
            >
              {draft.badgeLabel || "شارة العرض"}
            </div>
            {/* Content */}
            <div style={{ position: "relative", zIndex: 2, color: colorRoles.textInverse, display: "flex", flexDirection: "column", gap: "0.25rem", textAlign: "right" }}>
              <strong style={{ fontSize: "1.05rem", fontWeight: 800, textShadow: `0 1px 2px ${alpha(colorRoles.shadowBase, 0.5)}` }}>
                {draft.title || "عنوان العرض الترويجي"}
              </strong>
              {draft.subtitle && (
                <span style={{ fontSize: "0.78rem", opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {draft.subtitle}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quality complete meter */}
      <div style={{ padding: "0.75rem", background: colorRoles.surfaceInset, borderRadius: "0.5rem", border: `1px solid color-mix(in srgb, currentColor 8%, transparent)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
          <span>جودة محتوى العنصر:</span>
          <span style={{ color: quality >= 70 ? colorRoles.success : colorRoles.brandAction }}>{quality}%</span>
        </div>
        <div style={{ height: "6px", width: "100%", background: "color-mix(in srgb, currentColor 12%, transparent)", borderRadius: "3px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${quality}%`,
              background: quality >= 70 ? colorRoles.success : colorRoles.brandAction,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.688rem", opacity: 0.65 }}>
          {quality < 70 ? "⚠️ يُنصح بإكمال الحقول والوصف للحصول على جودة مقبولة." : "✅ جودة المحتوى ممتازة وجاهز للنشر."}
        </p>
      </div>

      <CpTextInput value={draft.title} onChange={(v) => update("title", v)} placeholder="العنوان" aria-label="العنوان" />
      <CpTextInput value={draft.subtitle} onChange={(v) => update("subtitle", v)} placeholder="الوصف المختصر" aria-label="الوصف المختصر" />
      {kind === "promos" && (
        <CpTextInput value={draft.badgeLabel} onChange={(v) => update("badgeLabel", v)} placeholder="شارة العرض" aria-label="شارة العرض" />
      )}
      <CpTextInput value={draft.imageUrl} onChange={(v) => update("imageUrl", v)} placeholder={meta.imageLabel} aria-label={meta.imageLabel} />
      <CpSelect
        value={draft.actionType}
        onChange={(v) => update("actionType", v as DshHomeAdminContentInput["actionType"])}
        options={[
          { value: "none", label: "بدون انتقال" },
          { value: "store", label: "متجر" },
          { value: "category", label: "تصنيف مركزي" },
          { value: "external", label: "رابط خارجي" },
        ]}
        aria-label="نوع الإجراء"
      />
      <CpTextInput value={draft.actionTarget} onChange={(v) => update("actionTarget", v)} placeholder="معرف المتجر أو الفئة المركزية" aria-label="هدف الإجراء" />
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
          disabled={submitting || draft.title.trim().length < 2 || draft.imageUrl.trim().length === 0}
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
