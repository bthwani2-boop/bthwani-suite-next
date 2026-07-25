"use client";
import { useState, useEffect, useCallback } from "react";
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
import { fetchReels } from "../../shared/catalog";
import type { Reel } from "../../shared/catalog/central-catalog.types";

interface ReelsReviewPanelProps {
  readonly onReviewReel: (
    reelId: string,
    decision: "approved" | "rejected" | "archived",
    note: string,
  ) => Promise<void>;
}

const reviewRowStyle = { display: "flex", gap: "0.5rem", alignItems: "center" };

const STATUS_OPTIONS = ["all", "pending_review", "approved", "rejected", "archived"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_TAB_LABELS: Record<StatusFilter, string> = {
  all: "الكل",
  pending_review: "بانتظار المراجعة",
  approved: "معتمدة",
  rejected: "مرفوضة",
  archived: "مؤرشفة",
};

const REEL_STATUS_TONE: Record<Reel["status"], CpBadgeTone> = {
  pending_review: "warning",
  approved: "success",
  rejected: "danger",
  archived: "neutral",
};

export function ReelsReviewPanel({ onReviewReel }: ReelsReviewPanelProps) {
  const [reels, setReels] = useState<readonly Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_review");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReels(statusFilter === "all" ? {} : { status: statusFilter });
      setReels(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReview = async (reelId: string, decision: "approved" | "rejected" | "archived") => {
    setActionLoading(reelId);
    try {
      await onReviewReel(reelId, decision, reviewNotes[reelId] ?? "");
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h3>مراجعة الريلز (مقاطع الفيديو)</h3>
      <CpMutedInline>
        مقاطع فيديو MP4 مقدمة من الشركاء — تحتاج إلى موافقة المشغل قبل الظهور على الشاشة الرئيسية.
      </CpMutedInline>

      <CpFilterBar label="تصفية الريلز">
        <CpTabs
          items={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_TAB_LABELS[s] }))}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          aria-label="تصفية حالة الريلز"
        />
        <CpButton onClick={() => void load()} aria-label="تحديث قائمة الريلز">تحديث</CpButton>
      </CpFilterBar>

      {error && <CpStatePanel role="alert" title="خطأ" description={error} />}

      {loading ? (
        <CpStatePanel role="status" title="جاري تحميل الريلز..." />
      ) : reels.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد ريلز" description="لا توجد ريلز بهذه الحالة حالياً." />
      ) : (
        <div>
          <CpTable aria-label="جدول مراجعة الريلز">
            <thead>
              <tr dir="rtl">
                <CpTableHeaderCell>المعرف</CpTableHeaderCell>
                <CpTableHeaderCell>العنوان</CpTableHeaderCell>
                <CpTableHeaderCell>الهدف</CpTableHeaderCell>
                <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                <CpTableHeaderCell>مقدم من</CpTableHeaderCell>
                <CpTableHeaderCell>إجراءات المراجعة</CpTableHeaderCell>
              </tr>
            </thead>
            <tbody dir="rtl">
              {reels.map((reel) => {
                const note = reviewNotes[reel.id] ?? "";
                const busy = actionLoading === reel.id;
                return (
                  <tr key={reel.id}>
                    <CpTableCell><code>{reel.id.slice(0, 8)}...</code></CpTableCell>
                    <CpTableCell>{reel.titleAr || reel.titleEn || "—"}</CpTableCell>
                    <CpTableCell>
                      <code>{reel.targetType}</code>
                      <br />
                      <small>{reel.targetId}</small>
                    </CpTableCell>
                    <CpTableCell>
                      <CpBadge tone={REEL_STATUS_TONE[reel.status]}>{STATUS_TAB_LABELS[reel.status]}</CpBadge>
                    </CpTableCell>
                    <CpTableCell>
                      {reel.submittedBy}
                      <br />
                      <small>{reel.submittedByRole}</small>
                    </CpTableCell>
                    <CpTableCell>
                      <div style={reviewRowStyle}>
                        <CpTextInput
                          value={note}
                          onChange={(val) => setReviewNotes((curr) => ({ ...curr, [reel.id]: val }))}
                          placeholder="ملاحظة..."
                          aria-label={`ملاحظة مراجعة الريل ${reel.id}`}
                        />
                        <CpButton
                          disabled={busy || reel.status !== "pending_review"}
                          onClick={() => void handleReview(reel.id, "approved")}
                        >
                          {busy ? "..." : "موافقة"}
                        </CpButton>
                        <CpButton
                          disabled={busy || reel.status !== "pending_review"}
                          onClick={() => void handleReview(reel.id, "rejected")}
                        >
                          {busy ? "..." : "رفض"}
                        </CpButton>
                        <CpButton
                          disabled={busy || reel.status === "archived"}
                          onClick={() => void handleReview(reel.id, "archived")}
                        >
                          {busy ? "..." : "أرشفة"}
                        </CpButton>
                      </div>
                    </CpTableCell>
                  </tr>
                );
              })}
            </tbody>
          </CpTable>
        </div>
      )}
    </div>
  );
}
