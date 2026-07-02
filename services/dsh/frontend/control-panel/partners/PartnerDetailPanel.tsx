"use client";
import { colorRoles } from '@bthwani/ui-kit';
import { useState } from "react";
import type {
  DshPartner,
  DshPartnerDocument,
  DshPartnerFieldVisit,
  DshPartnerReadiness,
  DshPartnerAuditEvent,
  DshPartnerActivationStatus,
  DshPartnerMutationState,
} from "../../shared/partner";
import {
  getDshPartnerActivationStatusLabel,
  formatDshPartnerAuditEventLabel,
  getDshPartnerDecisionCommands,
  buildPartnerReadinessViewModel,
  DOCUMENT_TYPE_LABELS,
  type DshPartnerDecisionCommandId,
} from "../../shared/partner";

type Props = {
  partner: DshPartner;
  documents: DshPartnerDocument[];
  visits: DshPartnerFieldVisit[];
  auditEvents: DshPartnerAuditEvent[];
  readiness: DshPartnerReadiness | null;
  actionState: DshPartnerMutationState;
  onTransition: (toStatus: DshPartnerActivationStatus, reason: string) => void;
  onReviewDocument: (docId: string, decision: "approved" | "rejected" | "needs_resubmit", reason: string) => void;
  onLoadReadiness: () => void;
};

export function PartnerDetailPanel({
  partner,
  documents,
  visits,
  auditEvents,
  readiness,
  actionState,
  onTransition,
  onReviewDocument,
  onLoadReadiness,
}: Props) {
  const [activeTab, setActiveTab] = useState<"info" | "documents" | "visits" | "audit" | "readiness">("info");
  const [selectedDecisionId, setSelectedDecisionId] = useState<DshPartnerDecisionCommandId | null>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected" | "needs_resubmit">("approved");
  const [reviewReason, setReviewReason] = useState("");

  const decisions = getDshPartnerDecisionCommands(partner.activationStatus);
  const selectedDecision = decisions.find((decision) => decision.id === selectedDecisionId) ?? null;
  const reasonIsMissing = !!selectedDecision?.reasonRequired && transitionReason.trim().length < 3;
  const readinessBlocked = !!selectedDecision &&
    readiness !== null &&
    ((selectedDecision.id === "activate_partner" && !readiness.canActivatePartner) ||
     (selectedDecision.id === "show_store_to_client" && !readiness.canPublishStoreToClient));

  const handleTransition = () => {
    if (!selectedDecision || reasonIsMissing || readinessBlocked) return;
    onTransition(selectedDecision.targetStatus, transitionReason.trim());
    setSelectedDecisionId(null);
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
            {getDshPartnerActivationStatusLabel(partner.activationStatus)}
          </span>
        </div>
      </div>

      {/* Banners */}
      {actionState.kind === "error" && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "var(--status-danger-surface, rgba(220,38,38,0.06))", border: "1px solid var(--status-danger-border, rgba(220,38,38,0.2))", borderRadius: "0.5rem", color: "var(--status-danger, colorRoles.brandAction)", marginBottom: "1rem" }}>
          {actionState.message}
        </div>
      )}
      {actionState.kind === "success" && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "var(--status-success-surface, rgba(21,128,61,0.06))", border: "1px solid var(--status-success-border, rgba(21,128,61,0.2))", borderRadius: "0.5rem", color: "var(--status-success, rgb(21,128,61))", marginBottom: "1rem" }}>
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
                ["ملاحظات", partner.notes],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: `1px solid var(--dsh-content-bg)` }}>
                  <td style={{ padding: "0.625rem 0", color: "var(--dsh-text-muted)", fontSize: "0.875rem", width: "10rem" }}>{label}</td>
                  <td style={{ padding: "0.625rem 0", fontWeight: 500, color: "var(--dsh-text-primary)" }}>{value || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {decisions.length > 0 && (
            <div style={{ marginTop: "2rem", padding: "1rem", border: `1px solid var(--dsh-card-border)`, borderRadius: "0.5rem", background: "var(--dsh-card-bg)" }}>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem", color: "var(--dsh-text-primary)" }}>قرارات الشركاء</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {decisions.map((decision) => {
                  const selected = selectedDecisionId === decision.id;
                  return (
                    <button
                      key={decision.id}
                      type="button"
                      onClick={() => setSelectedDecisionId(selected ? null : decision.id)}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: selected ? "1px solid var(--dsh-sidebar-accent)" : "1px solid var(--dsh-card-border)",
                        backgroundColor: selected ? "rgba(59,123,255,0.08)" : "var(--dsh-card-bg)",
                        color: "var(--dsh-text-primary)",
                        textAlign: "right",
                        cursor: "pointer",
                        fontFamily: "var(--font-arabic)",
                      }}
                    >
                      <span style={{ display: "block", fontWeight: 700 }}>{decision.label}</span>
                      <span style={{ display: "block", fontSize: "0.8125rem", color: "var(--dsh-text-muted)", marginTop: "0.25rem" }}>
                        {decision.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", color: "var(--dsh-text-secondary)", marginBottom: "0.375rem" }}>
                  السبب {selectedDecision?.reasonRequired ? "(إلزامي)" : "(اختياري للتدقيق)"}
                </label>
                <input
                  type="text"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="أدخل سبب التغيير"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: `1px solid var(--dsh-card-border)`, fontSize: "0.875rem", fontFamily: "var(--font-arabic)" }}
                />
                {reasonIsMissing && (
                  <div style={{ color: "var(--status-danger, #b42318)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>
                    السبب مطلوب لهذا القرار.
                  </div>
                )}
                {readinessBlocked && (
                  <div style={{ color: "var(--status-danger, #b42318)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>
                    لا يمكن تنفيذ القرار قبل اكتمال الجاهزية: {readiness?.blockedReason ?? "بوابات الجاهزية غير مكتملة"}.
                  </div>
                )}
              </div>
              <button
                disabled={!selectedDecision || reasonIsMissing || readinessBlocked || actionState.kind === "loading"}
                onClick={handleTransition}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor: selectedDecision && !reasonIsMissing && !readinessBlocked ? "var(--dsh-sidebar-accent)" : "var(--dsh-text-muted)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: selectedDecision && !reasonIsMissing && !readinessBlocked ? "pointer" : "default",
                  fontWeight: 600,
                  fontFamily: "var(--font-arabic)",
                }}
              >
                {actionState.kind === "loading" ? "جاري التنفيذ…" : "تطبيق"}
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
            const typeLabel = DOCUMENT_TYPE_LABELS[doc.documentType as any] ?? doc.documentType;
            const statusLabel = doc.documentStatus === "approved"
              ? "معتمد"
              : doc.documentStatus === "rejected"
              ? "مرفوض"
              : doc.documentStatus === "needs_resubmit"
              ? "مرفوض - يتطلب إعادة الرفع"
              : doc.documentStatus === "under_review"
              ? "تحت المراجعة"
              : "معلق";
            const statusTone = doc.documentStatus === "approved"
              ? "success"
              : doc.documentStatus === "rejected"
              ? "danger"
              : doc.documentStatus === "needs_resubmit"
              ? "warning"
              : "neutral";
            const canReview = doc.documentStatus === "pending" || doc.documentStatus === "under_review";

            return (
              <div key={doc.id} style={{ padding: "1rem", border: `1px solid var(--dsh-card-border)`, borderRadius: "0.5rem", marginBottom: "0.75rem", background: "var(--dsh-card-bg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--dsh-text-primary)" }}>{typeLabel}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--dsh-text-muted)", marginTop: "0.25rem" }}>
                      {doc.mediaRef}
                    </div>
                    {doc.rejectionReason && (
                      <div style={{ color: "var(--status-danger, colorRoles.brandAction)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                        سبب الرفض: {doc.rejectionReason}
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: "0.25rem 0.625rem",
                    borderRadius: "1rem",
                    backgroundColor: statusTone === "success" ? "var(--status-success-surface, rgba(21,128,61,0.08))" : statusTone === "danger" ? "var(--status-danger-surface, rgba(220,38,38,0.08))" : "var(--status-warning-surface, rgba(194,65,12,0.08))",
                    color: statusTone === "success" ? "var(--status-success, rgb(21,128,61))" : statusTone === "danger" ? "var(--status-danger, colorRoles.brandAction)" : "var(--status-warning, rgb(194,65,12))",
                    fontSize: "0.8125rem",
                  }}>
                    {statusLabel}
                  </span>
                </div>
                {canReview && reviewDocId !== doc.id && (
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
                        style={{ padding: "0.375rem 0.75rem", backgroundColor: "var(--dsh-sidebar-accent)", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontFamily: "var(--font-arabic)" }}
                      >
                        تأكيد
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
          {!readiness && <p style={{ color: "var(--dsh-text-muted)" }}>جاري تحميل الجاهزية…</p>}
          {readiness && (() => {
            const vm = buildPartnerReadinessViewModel(readiness);
            return (
              <div>
                <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: vm.allGatesPassed ? "var(--status-success-surface, rgba(21,128,61,0.06))" : "var(--status-danger-surface, rgba(220,38,38,0.06))", borderRadius: "0.5rem", border: `1px solid ${vm.allGatesPassed ? "var(--status-success-border, rgba(21,128,61,0.2))" : "var(--status-danger-border, rgba(220,38,38,0.2))"}` }}>
                  <strong style={{ color: vm.allGatesPassed ? "var(--status-success, rgb(21,128,61))" : "var(--status-danger, colorRoles.brandAction)" }}>{vm.allGatesPassed ? "✓ جاهز للتفعيل" : "غير جاهز للتفعيل"}</strong>
                  {vm.blockerLabel && <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--status-danger, colorRoles.brandAction)" }}>{vm.blockerLabel}</p>}
                </div>
                {vm.items.map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0", borderBottom: `1px solid var(--dsh-content-bg)` }}>
                    <span style={{ color: item.satisfied ? "var(--status-success, rgb(21,128,61))" : "var(--status-danger, colorRoles.brandAction)", fontSize: "1.25rem" }}>{item.satisfied ? "✓" : "✗"}</span>
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
          {auditEvents.length === 0 && <p style={{ color: "var(--dsh-text-muted)" }}>لا توجد أحداث في السجل</p>}
          {auditEvents.map((evt) => (
            <div key={evt.id} style={{ padding: "0.75rem 1rem", borderBottom: `1px solid var(--dsh-content-bg)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 500, color: "var(--dsh-text-primary)" }}>
                  {formatDshPartnerAuditEventLabel(evt.fromStatus, evt.toStatus)}
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
