"use client";
import { useState, useEffect, useCallback } from "react";
import { CpButton, CpStatePanel, CpTable, CpTableCell, CpTableHeaderCell, CpTextInput } from "@bthwani/control-panel/components";
import { fetchReels } from "../../shared/catalog/central-catalog.api";
import type { Reel } from "../../shared/catalog/central-catalog.types";

interface ReelsReviewPanelProps {
  readonly onReviewReel: (
    reelId: string,
    decision: "approved" | "rejected" | "archived",
    note: string,
  ) => Promise<void>;
}

const panelStyle = { padding: "1rem" };
const tableWrapStyle = { overflowX: "auto" as const };
const filterBarStyle = { display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" as const };
const reviewRowStyle = { display: "flex", gap: "0.5rem", alignItems: "center" };
const videoPreviewStyle = { width: 120, height: 80, borderRadius: 6, objectFit: "cover" as const };

const STATUS_OPTIONS = ["all", "pending_review", "approved", "rejected", "archived"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

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
    <div style={panelStyle}>
      <h3>🎬 مراجعة الريلز (مقاطع الفيديو)</h3>
      <p style={{ opacity: 0.65, fontSize: "0.875rem" }}>
        مقاطع فيديو MP4 مقدمة من الشركاء — تحتاج إلى موافقة المشغل قبل الظهور على الشاشة الرئيسية.
      </p>

      <div style={filterBarStyle}>
        {STATUS_OPTIONS.map((s) => (
          <CpButton
            key={s}
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
          >
            {s === "all" ? "الكل" : s === "pending_review" ? "بانتظار المراجعة" : s === "approved" ? "معتمدة" : s === "rejected" ? "مرفوضة" : "مؤرشفة"}
          </CpButton>
        ))}
        <CpButton onClick={() => void load()} aria-label="تحديث قائمة الريلز">🔄 تحديث</CpButton>
      </div>

      {error && <CpStatePanel role="alert" title="خطأ" description={error} />}

      {loading ? (
        <CpStatePanel role="status" title="جاري تحميل الريلز..." />
      ) : reels.length === 0 ? (
        <CpStatePanel role="status" title="لا توجد ريلز" description="لا توجد ريلز بهذه الحالة حالياً." />
      ) : (
        <div style={tableWrapStyle}>
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
                      <code>{reel.status}</code>
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
