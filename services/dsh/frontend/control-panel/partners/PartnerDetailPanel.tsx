"use client";

import { useState } from "react";
import type {
  PartnerDetailState,
  PartnerActionState,
  PartnerDocumentActionState,
  PartnerReadinessState,
  DshPartnerActivationStatus,
} from "../../shared/partner";
import {
  getPartnerActivationStatusLabel,
  getPartnerStateMetadata,
  documentToViewModel,
  readinessToViewModel,
} from "../../shared/partner";

type Props = {
  detailState: PartnerDetailState;
  actionState: PartnerActionState;
  documentActionState: PartnerDocumentActionState;
  readinessState: PartnerReadinessState;
  onTransition: (toStatus: DshPartnerActivationStatus, reason: string) => void;
  onReviewDocument: (docId: string, decision: "approved" | "rejected" | "needs_resubmit", reason: string) => void;
  onLoadReadiness: () => void;
};

export function PartnerDetailPanel({
  detailState,
  actionState,
  documentActionState,
  readinessState,
  onTransition,
  onReviewDocument,
  onLoadReadiness,
}: Props) {
  const [activeTab, setActiveTab] = useState<"info" | "documents" | "visits" | "audit" | "readiness">("info");
  const [transitionTarget, setTransitionTarget] = useState<DshPartnerActivationStatus | "">("");
  const [transitionReason, setTransitionReason] = useState("");
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected" | "needs_resubmit">("approved");
  const [reviewReason, setReviewReason] = useState("");

  if (detailState.kind === "loading") {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--dsh-text-muted)" }}>جاري التحميل…</div>;
  }
  if (detailState.kind === "error") {
    return <div style={{ padding: "2rem", color: "#dc2626" }}>{detailState.message}</div>;
  }
  if (detailState.kind !== "success") return null;

  const { partner, documents, visits, audit } = detailState;
  const meta = getPartnerStateMetadata(partner.activationStatus);
  const allowedNext = meta.allowedNextStatuses;

  const handleTransition = () => {
    if (!transitionTarget) return;
    onTransition(transitionTarget, transitionReason);
    setTransitionTarget("");
    setTransitionReason("");
  };

  const handleDocReview = () => {
    if (!reviewDocId) return;
    onReviewDocument(reviewDocId, reviewDecision, reviewReason);
    setReviewDocId(null);
    setReviewReason("");
  };

  return (
    <div dir="rtl" style={{ padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--dsh-text-primary)" }}>{partner.displayName}</h2>
        <p style={{ color: "var(--dsh-text-muted)", margin: "0.25rem 0 0" }}>{partner.legalNameAr} — {partner.primaryPhone}</p>
        <div style={{ marginTop: "0.75rem" }}>
          <span style={{ padding: "0.25rem 0.75rem", borderRadius: "1rem", backgroundColor: "rgba(59,123,255,0.08)", color: "rgb(29,78,216)", fontSize: "0.875rem", fontWeight: 500 }}>
            {getPartnerActivationStatusLabel(partner.activationStatus)}
          </span>
        </div>
      </div>

      {/* Banners */}
      {actionState.kind === "error" && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "0.5rem", color: "#dc2626", marginBottom: "1rem" }}>
          {actionState.message}
        </div>
      )}
      {actionState.kind === "success" && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(21,128,61,0.06)", border: "1px solid rgba(21,128,61,0.2)", borderRadius: "0.5rem", color: "rgb(21,128,61)", marginBottom: "1rem" }}>
          تمت العملية بنجاح
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: `1px solid var(--dsh-card-border)`, marginBottom: "1.5rem" }}>
        {(["info", "documents", "visits", "readiness", "audit"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (tab === "readiness") onLoadReadiness(); }}
            style={{
              padding: "0.625rem 1rem",
              border: "none",
              borderBottom: activeTab === tab ? `2px solid var(--dsh-sidebar-accent)` : "2px solid transparent",
              backgroundColor: "transparent",
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "var(--dsh-text-primary)" : "var(--dsh-text-muted)",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontFamily: "var(--font-arabic)",
            }}
          >
            {{ info: "البيانات", documents: "الوثائق", visits: "الزيارات", readiness: "الجاهزية", audit: "السجل" }[tab]}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {activeTab === "info" && (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["المعرف", partner.id],
                ["الاسم بالعربية", partner.legalNameAr],
                ["الاسم التجاري", partner.displayName],
                ["نوع الهوية", partner.legalIdentityType],
                ["رقم الهوية", partner.legalIdentityNumber],
                ["رقم الجوال", partner.primaryPhone],
                ["البريد الإلكتروني", partner.email],
                ["النوع", partner.category],
                ["أُنشئ من", partner.createdBySurface],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: `1px solid var(--dsh-content-bg)` }}>
                  <td style={{ padding: "0.625rem 0", color: "var(--dsh-text-muted)", fontSize: "0.875rem", width: "10rem" }}>{label}</td>
                  <td style={{ padding: "0.625rem 0", fontWeight: 500, color: "var(--dsh-text-primary)" }}>{value || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {allowedNext.length > 0 && (
            <div style={{ marginTop: "2rem", padding: "1rem", border: `1px solid var(--dsh-card-border)`, borderRadius: "0.5rem", background: "var(--dsh-card-bg)" }}>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem", color: "var(--dsh-text-primary)" }}>تغيير الحالة</h3>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", color: "var(--dsh-text-secondary)", marginBottom: "0.375rem" }}>
                  الحالة الجديدة
                </label>
                <select
                  value={transitionTarget}
                  onChange={(e) => setTransitionTarget(e.target.value as DshPartnerActivationStatus)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: `1px solid var(--dsh-card-border)`, fontSize: "0.875rem", fontFamily: "var(--font-arabic)" }}
                >
                  <option value="">اختر الحالة</option>
                  {allowedNext.map((s) => (
                    <option key={s} value={s}>{getPartnerActivationStatusLabel(s)}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", color: "var(--dsh-text-secondary)", marginBottom: "0.375rem" }}>
                  السبب (مطلوب للتدقيق)
                </label>
                <input
                  type="text"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="أدخل سبب التغيير"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: `1px solid var(--dsh-card-border)`, fontSize: "0.875rem", fontFamily: "var(--font-arabic)" }}
                />
              </div>
              <button
                disabled={!transitionTarget || actionState.kind === "pending"}
                onClick={handleTransition}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor: transitionTarget ? "var(--dsh-sidebar-accent)" : "var(--dsh-text-muted)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: transitionTarget ? "pointer" : "default",
                  fontWeight: 600,
                  fontFamily: "var(--font-arabic)",
                }}
              >
                {actionState.kind === "pending" ? "جاري التنفيذ…" : "تطبيق"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents tab */}
      {activeTab === "documents" && (
        <div>
          {documents.length === 0 && (
            <p style={{ color: "var(--dsh-text-muted)" }}>لا توجد وثائق مرفوعة</p>
          )}
          {documents.map((doc) => {
            const vm = documentToViewModel(doc);
            return (
              <div key={doc.id} style={{ padding: "1rem", border: `1px solid var(--dsh-card-border)`, borderRadius: "0.5rem", marginBottom: "0.75rem", background: "var(--dsh-card-bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--dsh-text-primary)" }}>{vm.typeLabel}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--dsh-text-muted)", marginTop: "0.25rem" }}>
                      {doc.mediaRef}
                    </div>
                    {vm.rejectionReason && (
                      <div style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        سبب الرفض: {vm.rejectionReason}
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: "0.25rem 0.625rem",
                    borderRadius: "1rem",
                    backgroundColor: vm.statusTone === "success" ? "rgba(21,128,61,0.08)" : vm.statusTone === "danger" ? "rgba(220,38,38,0.08)" : "rgba(194,65,12,0.08)",
                    color: vm.statusTone === "success" ? "rgb(21,128,61)" : vm.statusTone === "danger" ? "#dc2626" : "rgb(194,65,12)",
                    fontSize: "0.8125rem",
                  }}>
                    {vm.statusLabel}
                  </span>
                </div>
                {vm.canReview && reviewDocId !== doc.id && (
                  <button
                    onClick={() => setReviewDocId(doc.id)}
                    style={{ marginTop: "0.75rem", padding: "0.375rem 0.75rem", borderRadius: "0.375rem", border: `1px solid var(--dsh-card-border)`, cursor: "pointer", fontSize: "0.875rem", fontFamily: "var(--font-arabic)" }}
                  >
                    مراجعة
                  </button>
                )}
                {reviewDocId === doc.id && (
                  <div style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "var(--dsh-content-bg)", borderRadius: "0.375rem" }}>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <select
                        value={reviewDecision}
                        onChange={(e) => setReviewDecision(e.target.value as "approved" | "rejected" | "needs_resubmit")}
                        style={{ marginLeft: "0.5rem", padding: "0.375rem", borderRadius: "0.25rem", border: `1px solid var(--dsh-card-border)`, fontFamily: "var(--font-arabic)" }}
                      >
                        <option value="approved">اعتماد</option>
                        <option value="rejected">رفض</option>
                        <option value="needs_resubmit">طلب إعادة رفع</option>
                      </select>
                      <input
                        type="text"
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        placeholder="السبب"
                        style={{ padding: "0.375rem", borderRadius: "0.25rem", border: `1px solid var(--dsh-card-border)`, width: "12rem", fontFamily: "var(--font-arabic)" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={handleDocReview}
                        disabled={documentActionState.kind === "pending"}
                        style={{ padding: "0.375rem 0.75rem", backgroundColor: "var(--dsh-sidebar-accent)", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontFamily: "var(--font-arabic)" }}
                      >
                        {documentActionState.kind === "pending" ? "جاري…" : "تأكيد"}
                      </button>
                      <button
                        onClick={() => setReviewDocId(null)}
                        style={{ padding: "0.375rem 0.75rem", border: `1px solid var(--dsh-card-border)`, borderRadius: "0.375rem", cursor: "pointer", fontFamily: "var(--font-arabic)" }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Visits tab */}
      {activeTab === "visits" && (
        <div>
          {visits.length === 0 && <p style={{ color: "var(--dsh-text-muted)" }}>لا توجد زيارات ميدانية</p>}
          {visits.map((v) => (
            <div key={v.id} style={{ padding: "1rem", border: `1px solid var(--dsh-card-border)`, borderRadius: "0.5rem", marginBottom: "0.75rem", background: "var(--dsh-card-bg)" }}>
              <div style={{ fontWeight: 600, color: "var(--dsh-text-primary)" }}>{v.visitStatus}</div>
              <div style={{ color: "var(--dsh-text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{v.visitNotes || "لا توجد ملاحظات"}</div>
              {v.locationLatitude && (
                <div style={{ fontSize: "0.8125rem", color: "var(--dsh-text-muted)", marginTop: "0.25rem" }}>
                  الموقع: {v.locationLatitude}, {v.locationLongitude}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Readiness tab */}
      {activeTab === "readiness" && (
        <div>
          {readinessState.kind === "loading" && <p style={{ color: "var(--dsh-text-muted)" }}>جاري التحميل…</p>}
          {readinessState.kind === "success" && (() => {
            const vm = readinessToViewModel(readinessState.readiness);
            return (
              <div>
                <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: vm.canActivate ? "rgba(21,128,61,0.06)" : "rgba(220,38,38,0.06)", borderRadius: "0.5rem", border: `1px solid ${vm.canActivate ? "rgba(21,128,61,0.2)" : "rgba(220,38,38,0.2)"}` }}>
                  <strong style={{ color: vm.canActivate ? "rgb(21,128,61)" : "#dc2626" }}>{vm.canActivate ? "✓ جاهز للتفعيل" : "غير جاهز للتفعيل"}</strong>
                  {vm.blockedReason && <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#dc2626" }}>{vm.blockedReason}</p>}
                </div>
                {vm.checklist.map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0", borderBottom: `1px solid var(--dsh-content-bg)` }}>
                    <span style={{ color: item.satisfied ? "rgb(21,128,61)" : "#dc2626", fontSize: "1.25rem" }}>{item.satisfied ? "✓" : "✗"}</span>
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--dsh-text-primary)" }}>{item.label}</div>
                      {!item.satisfied && <div style={{ fontSize: "0.8125rem", color: "var(--dsh-text-muted)" }}>{item.blockedReason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Audit tab */}
      {activeTab === "audit" && (
        <div>
          {audit.length === 0 && <p style={{ color: "var(--dsh-text-muted)" }}>لا توجد أحداث في السجل</p>}
          {audit.map((evt) => (
            <div key={evt.id} style={{ padding: "0.75rem 1rem", borderBottom: `1px solid var(--dsh-content-bg)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 500, color: "var(--dsh-text-primary)" }}>
                  {getPartnerActivationStatusLabel(evt.fromStatus as DshPartnerActivationStatus)} → {getPartnerActivationStatusLabel(evt.toStatus as DshPartnerActivationStatus)}
                </span>
                <span style={{ fontSize: "0.8125rem", color: "var(--dsh-text-muted)" }}>{new Date(evt.createdAt).toLocaleString("ar-SA")}</span>
              </div>
              {evt.reason && <div style={{ fontSize: "0.875rem", color: "var(--dsh-text-secondary)", marginTop: "0.25rem" }}>{evt.reason}</div>}
              <div style={{ fontSize: "0.8125rem", color: "var(--dsh-text-muted)", marginTop: "0.25rem" }}>{evt.actorSurface} — {evt.actorId}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
