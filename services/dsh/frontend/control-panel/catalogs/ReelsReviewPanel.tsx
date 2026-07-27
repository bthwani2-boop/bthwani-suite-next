"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CpBadgeTone } from "@bthwani/control-panel/components";
import {
  CpBadge,
  CpButton,
  CpFilterBar,
  CpMutedInline,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTabs,
  CpTextInput,
} from "@bthwani/control-panel/components";
import {
  fetchOperatorReelMediaBlob,
  fetchOperatorReels,
  reviewGovernedReel,
  type GovernedReel,
} from "../../shared/catalog";

interface ReelsReviewPanelProps {
  readonly onReviewReel?: (
    reelId: string,
    decision: "approved" | "rejected" | "archived",
    note: string,
  ) => Promise<void>;
}

type ReelDraft = {
  readonly titleAr: string;
  readonly titleEn: string;
  readonly subtitleAr: string;
  readonly subtitleEn: string;
  readonly highlightAr: string;
  readonly highlightEn: string;
  readonly ctaLabelAr: string;
  readonly ctaLabelEn: string;
  readonly targetId: string;
  readonly sortOrder: string;
  readonly reviewNote: string;
};

const STATUS_OPTIONS = ["all", "pending_review", "approved", "rejected", "archived"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_TAB_LABELS: Record<StatusFilter, string> = {
  all: "الكل",
  pending_review: "بانتظار المراجعة",
  approved: "معتمدة",
  rejected: "مرفوضة",
  archived: "مؤرشفة",
};

const REEL_STATUS_TONE: Record<GovernedReel["status"], CpBadgeTone> = {
  pending_review: "warning",
  approved: "success",
  rejected: "danger",
  archived: "neutral",
};

function draftFromReel(reel: GovernedReel): ReelDraft {
  return {
    titleAr: reel.titleAr,
    titleEn: reel.titleEn,
    subtitleAr: reel.subtitleAr,
    subtitleEn: reel.subtitleEn,
    highlightAr: reel.highlightAr,
    highlightEn: reel.highlightEn,
    ctaLabelAr: reel.ctaLabelAr,
    ctaLabelEn: reel.ctaLabelEn,
    targetId: reel.targetId,
    sortOrder: String(reel.sortOrder),
    reviewNote: reel.reviewNote,
  };
}

export function ReelsReviewPanel(_props: ReelsReviewPanelProps) {
  const [reels, setReels] = useState<readonly GovernedReel[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_review");
  const [drafts, setDrafts] = useState<Record<string, ReelDraft>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewPosterUrl, setPreviewPosterUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedReel = useMemo(
    () => reels.find((item) => item.id === selectedReelId) ?? null,
    [reels, selectedReelId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOperatorReels(
        statusFilter === "all" ? { limit: 100 } : { status: statusFilter, limit: 100 },
      );
      setReels(result);
      setDrafts((current) => {
        const next = { ...current };
        for (const reel of result) next[reel.id] ??= draftFromReel(reel);
        return next;
      });
      if (selectedReelId && !result.some((item) => item.id === selectedReelId)) {
        setSelectedReelId(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [selectedReelId, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    let videoUrl: string | null = null;
    let posterUrl: string | null = null;
    setPreviewVideoUrl(null);
    setPreviewPosterUrl(null);
    if (!selectedReel) return undefined;

    setPreviewLoading(true);
    setError(null);
    void Promise.all([
      fetchOperatorReelMediaBlob(selectedReel.id, "video"),
      selectedReel.posterAssetId
        ? fetchOperatorReelMediaBlob(selectedReel.id, "poster").catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([videoBlob, posterBlob]) => {
        if (!active) return;
        videoUrl = URL.createObjectURL(videoBlob);
        posterUrl = posterBlob ? URL.createObjectURL(posterBlob) : null;
        setPreviewVideoUrl(videoUrl);
        setPreviewPosterUrl(posterUrl);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [selectedReel]);

  const updateDraft = (reelId: string, patch: Partial<ReelDraft>) => {
    setDrafts((current) => ({
      ...current,
      [reelId]: { ...(current[reelId] ?? draftFromReel(reels.find((item) => item.id === reelId)!)), ...patch },
    }));
  };

  const handleReview = async (
    reel: GovernedReel,
    decision: "approved" | "rejected" | "archived",
  ) => {
    const draft = drafts[reel.id] ?? draftFromReel(reel);
    if (decision === "approved" && !draft.titleAr.trim() && !draft.titleEn.trim()) {
      setError("يجب تثبيت عنوان عربي أو إنجليزي قبل الاعتماد.");
      return;
    }
    if (decision === "rejected" && !draft.reviewNote.trim()) {
      setError("سبب الرفض مطلوب ليتمكن الشريك من التصحيح.");
      return;
    }
    const sortOrder = Number.parseInt(draft.sortOrder, 10);
    if (!Number.isFinite(sortOrder)) {
      setError("ترتيب الريل يجب أن يكون رقمًا صحيحًا.");
      return;
    }

    setActionLoading(reel.id);
    setError(null);
    try {
      await reviewGovernedReel(reel.id, {
        decision,
        reviewNote: draft.reviewNote.trim(),
        titleAr: draft.titleAr.trim(),
        titleEn: draft.titleEn.trim(),
        subtitleAr: draft.subtitleAr.trim(),
        subtitleEn: draft.subtitleEn.trim(),
        highlightAr: draft.highlightAr.trim(),
        highlightEn: draft.highlightEn.trim(),
        ctaLabelAr: draft.ctaLabelAr.trim(),
        ctaLabelEn: draft.ctaLabelEn.trim(),
        targetType: reel.targetType,
        targetId: draft.targetId.trim(),
        sortOrder,
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div dir="rtl" style={styles.root}>
      <div>
        <h3>مراجعة الريلز (مقاطع الفيديو)</h3>
        <CpMutedInline>
          معاينة محمية وتحرير النسخ والترتيب والهدف قبل اعتماد الفيديو والبوستر وظهورهما في تطبيق العميل.
        </CpMutedInline>
      </div>

      <CpFilterBar label="تصفية الريلز">
        <CpTabs
          items={STATUS_OPTIONS.map((status) => ({ value: status, label: STATUS_TAB_LABELS[status] }))}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          aria-label="تصفية حالة الريلز"
        />
        <CpButton onClick={() => void load()} aria-label="تحديث قائمة الريلز">تحديث</CpButton>
      </CpFilterBar>

      {error ? <CpStatePanel role="alert" title="تعذر إكمال العملية" description={error} /> : null}

      {selectedReel ? (
        <section style={styles.reviewWorkspace} aria-label={`مراجعة الريل ${selectedReel.id}`}>
          <div style={styles.previewColumn}>
            {previewLoading ? <CpStatePanel role="status" title="جارٍ تحميل المعاينة المحمية…" /> : null}
            {previewVideoUrl ? (
              <video
                src={previewVideoUrl}
                poster={previewPosterUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                style={styles.video}
              />
            ) : null}
            <CpMutedInline tight>الأصل: {selectedReel.assetId}</CpMutedInline>
            {selectedReel.posterAssetId ? <CpMutedInline tight>البوستر: {selectedReel.posterAssetId}</CpMutedInline> : null}
          </div>
          <div style={styles.editorColumn}>
            {(() => {
              const draft = drafts[selectedReel.id] ?? draftFromReel(selectedReel);
              const busy = actionLoading === selectedReel.id;
              return (
                <>
                  <CpTextInput value={draft.titleAr} onChange={(value) => updateDraft(selectedReel.id, { titleAr: value })} placeholder="العنوان العربي" aria-label="العنوان العربي" />
                  <CpTextInput value={draft.titleEn} onChange={(value) => updateDraft(selectedReel.id, { titleEn: value })} placeholder="العنوان الإنجليزي" aria-label="العنوان الإنجليزي" />
                  <CpTextInput value={draft.subtitleAr} onChange={(value) => updateDraft(selectedReel.id, { subtitleAr: value })} placeholder="الوصف العربي" aria-label="الوصف العربي" />
                  <CpTextInput value={draft.highlightAr} onChange={(value) => updateDraft(selectedReel.id, { highlightAr: value })} placeholder="سطر الإبراز" aria-label="سطر الإبراز" />
                  <CpTextInput value={draft.ctaLabelAr} onChange={(value) => updateDraft(selectedReel.id, { ctaLabelAr: value })} placeholder="نص CTA العربي" aria-label="نص CTA العربي" />
                  <CpTextInput value={draft.targetId} onChange={(value) => updateDraft(selectedReel.id, { targetId: value })} placeholder="معرف الهدف" aria-label="معرف هدف الريل" />
                  <CpTextInput value={draft.sortOrder} onChange={(value) => updateDraft(selectedReel.id, { sortOrder: value })} placeholder="الترتيب" aria-label="ترتيب الريل" />
                  <CpTextInput value={draft.reviewNote} onChange={(value) => updateDraft(selectedReel.id, { reviewNote: value })} placeholder="ملاحظة المراجعة أو سبب الرفض" aria-label="ملاحظة المراجعة" />
                  <div style={styles.actions}>
                    <CpButton disabled={busy || selectedReel.status !== "pending_review"} onClick={() => void handleReview(selectedReel, "approved")}>اعتماد ونشر مؤهل</CpButton>
                    <CpButton disabled={busy || selectedReel.status !== "pending_review"} onClick={() => void handleReview(selectedReel, "rejected")}>رفض مع السبب</CpButton>
                    <CpButton disabled={busy || selectedReel.status !== "approved"} onClick={() => void handleReview(selectedReel, "archived")}>أرشفة</CpButton>
                    <CpButton disabled={busy} onClick={() => setSelectedReelId(null)}>إغلاق المعاينة</CpButton>
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      ) : null}

      {loading ? (
        <CpStatePanel role="status" title="جاري تحميل الريلز…" />
      ) : reels.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد ريلز" description="لا توجد ريلز بهذه الحالة حاليًا." />
      ) : (
        <CpTable aria-label="جدول مراجعة الريلز">
          <thead>
            <tr>
              <CpTableHeaderCell>العنوان</CpTableHeaderCell>
              <CpTableHeaderCell>المتجر/الهدف</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>تاريخ الإرسال</CpTableHeaderCell>
              <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {reels.map((reel) => (
              <tr key={reel.id}>
                <CpTableCell>{reel.titleAr || reel.titleEn || "—"}</CpTableCell>
                <CpTableCell><code>{reel.sourceStoreId ?? reel.targetId}</code></CpTableCell>
                <CpTableCell><CpBadge tone={REEL_STATUS_TONE[reel.status]}>{STATUS_TAB_LABELS[reel.status]}</CpBadge></CpTableCell>
                <CpTableCell>{new Date(reel.createdAt).toLocaleString("ar")}</CpTableCell>
                <CpTableCell><CpButton onClick={() => setSelectedReelId(reel.id)}>فتح المراجعة</CpButton></CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: "grid", gap: "1rem" },
  reviewWorkspace: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 0.8fr) minmax(320px, 1.2fr)",
    gap: "1rem",
    padding: "1rem",
    border: "1px solid color-mix(in srgb, currentColor 16%, transparent)",
    borderRadius: "0.75rem",
  },
  previewColumn: { display: "grid", gap: "0.5rem", alignContent: "start" },
  editorColumn: { display: "grid", gap: "0.65rem", alignContent: "start" },
  video: { width: "100%", maxHeight: "70vh", aspectRatio: "9 / 16", objectFit: "contain", background: "black", borderRadius: "1rem" },
  actions: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
};
