"use client";

import React from "react";
import { colorRoles, radius, spacing } from "@bthwani/ui-kit";
import { WebStyleSheet } from "@bthwani/ui-kit/web";
import {
  CpButton,
  CpEmptyTableMessage,
  CpSelect,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { useControlPanelSession } from "../../../shared/session/control-panel-session";
import {
  useHomeDiscoveryAdminController,
  type DshHomeAdminContentInput,
  type DshHomeAdminKind,
} from "../../../shared/home-discovery";

const KIND_META = {
  banners: {
    title: "إدارة بنرات الصفحة الرئيسية",
    singular: "بنر",
    imageLabel: "رابط صورة البنر",
  },
  promos: {
    title: "إدارة عروض الصفحة الرئيسية",
    singular: "عرض",
    imageLabel: "رابط صورة العرض",
  },
} as const;

const PUBLICATION_LABELS: Record<string, string> = {
  draft: "مسودة",
  published: "منشور",
  paused: "موقوف",
  archived: "مؤرشف",
};

export function MarketingHomeDiscoveryPanel({ kind }: { readonly kind: DshHomeAdminKind }) {
  const { state } = useControlPanelSession();
  const controller = useHomeDiscoveryAdminController(kind, state.kind);
  const meta = KIND_META[kind];

  if (controller.state.kind === "loading") {
    return <CpStatePanel role="status" title="جاري تحميل المحتوى..." />;
  }
  if (controller.state.kind === "permission_denied") {
    return (
      <CpStatePanel
        role="alert"
        title="الوصول غير مسموح"
        description="تحتاج إلى صلاحية قراءة التسويق لعرض محتوى الصفحة الرئيسية."
      />
    );
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
    <section dir="rtl" style={controller.editorOpen ? styles.workspaceOpen : styles.workspaceClosed}>
      <div style={styles.listPane}>
        <header style={styles.header}>
          <div>
            <h3 style={styles.title}>{meta.title}</h3>
            <p style={styles.description}>
              المحتوى المنشور فقط، وفي نافذته الزمنية، يظهر فعليًا في تطبيق العميل.
            </p>
          </div>
          <div style={styles.actions}>
            <CpButton onClick={() => controller.select(null)}>إضافة {meta.singular}</CpButton>
            <CpButton onClick={controller.retry}>تحديث</CpButton>
          </div>
        </header>

        {controller.actionState.kind === "success" ? (
          <p role="status" style={styles.successMessage}>{controller.actionState.message}</p>
        ) : null}
        {controller.actionState.kind === "error" ? (
          <p role="alert" style={styles.errorMessage}>{controller.actionState.message}</p>
        ) : null}

        {controller.state.kind === "empty" ? (
          <CpEmptyTableMessage>لا يوجد محتوى من هذا النوع. أضف أول عنصر كمسودة.</CpEmptyTableMessage>
        ) : (
          <CpTable aria-label={meta.title}>
            <thead>
              <tr>
                <CpTableHeaderCell>العنوان</CpTableHeaderCell>
                <CpTableHeaderCell>النشر</CpTableHeaderCell>
                <CpTableHeaderCell>النافذة</CpTableHeaderCell>
                <CpTableHeaderCell>الترتيب</CpTableHeaderCell>
                <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
                <CpTableHeaderCell>التحكم</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <CpTableCell>{item.title}</CpTableCell>
                  <CpTableCell>{PUBLICATION_LABELS[item.publicationStatus] ?? item.publicationStatus}</CpTableCell>
                  <CpTableCell>{formatPublicationWindow(item.publishFrom, item.publishUntil)}</CpTableCell>
                  <CpTableCell>{item.sortOrder}</CpTableCell>
                  <CpTableCell>
                    {item.actionType === "none" ? "بدون انتقال" : `${item.actionType}: ${item.actionTarget}`}
                  </CpTableCell>
                  <CpTableCell>
                    <div style={styles.rowActions}>
                      <CpButton onClick={() => controller.select(item)}>تعديل</CpButton>
                      <CpButton
                        disabled={controller.actionState.kind === "submitting"}
                        onClick={() => {
                          if (globalThis.confirm?.(`حذف ${meta.singular} «${item.title}» نهائيًا؟`)) {
                            void controller.remove(item.id);
                          }
                        }}
                      >
                        حذف
                      </CpButton>
                    </div>
                  </CpTableCell>
                </tr>
              ))}
            </tbody>
          </CpTable>
        )}
      </div>

      {controller.editorOpen ? (
        <aside style={styles.editorPane} aria-label={`محرر ${meta.singular}`}>
          <HomeDiscoveryEditor
            kind={kind}
            draft={controller.draft}
            setDraft={controller.setDraft}
            editing={controller.selected !== null}
            submitting={controller.actionState.kind === "submitting"}
            onSave={() => void controller.save(controller.draft)}
            onCancel={controller.closeEditor}
          />
        </aside>
      ) : null}
    </section>
  );
}

function formatPublicationWindow(from?: string, until?: string): string {
  if (!from && !until) return "دون تقييد زمني";
  if (from && until) return `${from} — ${until}`;
  if (from) return `من ${from}`;
  return `حتى ${until}`;
}

function computeQuality(draft: DshHomeAdminContentInput): number {
  let score = 0;
  if (draft.title.trim().length >= 2) score += 25;
  if ((draft.subtitle ?? "").trim().length >= 5) score += 15;
  if (draft.imageUrl.trim().length > 0) score += 25;
  if (draft.actionType === "none" || draft.actionTarget.trim().length > 0) score += 15;
  if (draft.publicationStatus) score += 10;
  if (draft.publishFrom || draft.publishUntil) score += 10;
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
  const update = <K extends keyof DshHomeAdminContentInput>(key: K, value: DshHomeAdminContentInput[K]) => {
    setDraft({ ...draft, [key]: value });
  };
  const quality = computeQuality(draft);
  const needsTarget = draft.actionType !== "none";
  const canSubmit =
    draft.title.trim().length >= 2 &&
    draft.imageUrl.trim().length > 0 &&
    (!needsTarget || draft.actionTarget.trim().length > 0) &&
    !submitting;

  return (
    <div style={styles.editor}>
      <div>
        <h4 style={styles.editorTitle}>{editing ? `تعديل ${meta.singular}` : `إضافة ${meta.singular}`}</h4>
        <p style={styles.editorHint}>الحفظ يحترم حالة النشر والجدولة ورقم النسخة الحالي.</p>
      </div>

      <div style={styles.preview}>
        {draft.imageUrl.trim() ? (
          <img src={draft.imageUrl} alt="" style={styles.previewImage} />
        ) : (
          <div style={styles.previewPlaceholder}>لا توجد صورة للمعاينة</div>
        )}
        <div style={styles.previewCopy}>
          <strong>{draft.title || `عنوان ${meta.singular}`}</strong>
          <span>{draft.subtitle || "الوصف المختصر"}</span>
        </div>
      </div>

      <div style={styles.qualityBox}>
        <div style={styles.qualityHeader}>
          <span>اكتمال المحتوى</span>
          <strong>{quality}%</strong>
        </div>
        <progress max={100} value={quality} style={styles.progress} aria-label="اكتمال المحتوى" />
      </div>

      <CpTextInput value={draft.title} onChange={(value) => update("title", value)} placeholder="العنوان" aria-label="العنوان" />
      <CpTextInput value={draft.subtitle ?? ""} onChange={(value) => update("subtitle", value)} placeholder="الوصف المختصر" aria-label="الوصف المختصر" />
      {kind === "promos" ? (
        <CpTextInput value={draft.badgeLabel ?? ""} onChange={(value) => update("badgeLabel", value)} placeholder="شارة العرض" aria-label="شارة العرض" />
      ) : null}
      <CpTextInput value={draft.imageUrl} onChange={(value) => update("imageUrl", value)} placeholder={meta.imageLabel} aria-label={meta.imageLabel} />

      <CpSelect
        value={draft.actionType}
        onChange={(value) => {
          const actionType = value as DshHomeAdminContentInput["actionType"];
          setDraft({ ...draft, actionType, ...(actionType === "none" ? { actionTarget: "" } : {}) });
        }}
        options={[
          { value: "none", label: "بدون انتقال" },
          { value: "store", label: "متجر" },
          { value: "category", label: "فئة مركزية" },
          { value: "external", label: "رابط خارجي آمن" },
        ]}
        aria-label="نوع الإجراء"
      />
      {needsTarget ? (
        <CpTextInput
          value={draft.actionTarget}
          onChange={(value) => update("actionTarget", value)}
          placeholder={draft.actionType === "external" ? "https://example.com" : "معرف الهدف"}
          aria-label="هدف الإجراء"
        />
      ) : null}

      <CpTextInput
        value={String(draft.sortOrder)}
        onChange={(value) => update("sortOrder", Math.max(0, Number.parseInt(value, 10) || 0))}
        placeholder="الترتيب"
        aria-label="الترتيب"
      />
      <CpSelect
        value={draft.publicationStatus ?? "draft"}
        onChange={(value) => {
          const publicationStatus = value as NonNullable<DshHomeAdminContentInput["publicationStatus"]>;
          setDraft({ ...draft, publicationStatus, isActive: publicationStatus === "published" });
        }}
        options={[
          { value: "draft", label: "مسودة" },
          { value: "published", label: "منشور" },
          { value: "paused", label: "موقوف" },
          { value: "archived", label: "مؤرشف" },
        ]}
        aria-label="حالة النشر"
      />
      <CpTextInput
        value={draft.publishFrom ?? ""}
        onChange={(value) => update("publishFrom", value.trim() ? value : undefined)}
        placeholder="بداية النشر RFC3339 — مثال 2026-07-22T08:00:00Z"
        aria-label="بداية النشر"
      />
      <CpTextInput
        value={draft.publishUntil ?? ""}
        onChange={(value) => update("publishUntil", value.trim() ? value : undefined)}
        placeholder="نهاية النشر RFC3339"
        aria-label="نهاية النشر"
      />

      <div style={styles.editorActions}>
        <CpButton disabled={!canSubmit} onClick={onSave}>
          {submitting ? "جاري الحفظ…" : draft.publicationStatus === "published" ? "حفظ ونشر" : "حفظ"}
        </CpButton>
        <CpButton onClick={onCancel}>إلغاء</CpButton>
      </div>
    </div>
  );
}

const styles = WebStyleSheet.create({
  workspaceOpen: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(20rem, 24rem)",
    gap: spacing[6],
    padding: spacing[4],
    alignItems: "start",
  },
  workspaceClosed: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    padding: spacing[4],
  },
  listPane: { minWidth: 0 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  title: { margin: 0, fontSize: "1.1rem", fontWeight: 800, color: colorRoles.textPrimary },
  description: { margin: `${spacing[1]}px 0 0`, fontSize: "0.82rem", color: colorRoles.textSecondary },
  actions: { display: "flex", gap: spacing[2], flexWrap: "wrap" },
  rowActions: { display: "flex", gap: spacing[2], flexWrap: "wrap" },
  successMessage: { color: colorRoles.success, fontSize: "0.85rem", margin: `0 0 ${spacing[4]}px` },
  errorMessage: { color: colorRoles.brandAction, fontSize: "0.85rem", margin: `0 0 ${spacing[4]}px` },
  editorPane: {
    position: "sticky",
    top: spacing[4],
    backgroundColor: colorRoles.surfaceBase,
    border: `1px solid ${colorRoles.borderSubtle}`,
    borderRadius: radius.lg,
    padding: spacing[5],
    maxHeight: "calc(100vh - 8rem)",
    overflowY: "auto",
  },
  editor: { display: "grid", gap: spacing[3] },
  editorTitle: { margin: 0, fontSize: "1rem", fontWeight: 800, color: colorRoles.textPrimary },
  editorHint: { margin: `${spacing[1]}px 0 0`, fontSize: "0.75rem", color: colorRoles.textSecondary },
  preview: {
    position: "relative",
    minHeight: 180,
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colorRoles.surfaceInset,
    border: `1px solid ${colorRoles.borderSubtle}`,
  },
  previewImage: { width: "100%", height: 180, objectFit: "cover", display: "block" },
  previewPlaceholder: {
    height: 180,
    display: "grid",
    placeItems: "center",
    color: colorRoles.textMuted,
    fontSize: "0.8rem",
  },
  previewCopy: {
    position: "absolute",
    right: spacing[3],
    left: spacing[3],
    bottom: spacing[3],
    display: "grid",
    gap: spacing[1],
    padding: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
    color: colorRoles.textPrimary,
  },
  qualityBox: { padding: spacing[3], backgroundColor: colorRoles.surfaceInset, borderRadius: radius.md },
  qualityHeader: { display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: spacing[1] },
  progress: { width: "100%" },
  editorActions: { display: "flex", gap: spacing[2], marginTop: spacing[1], flexWrap: "wrap" },
});
