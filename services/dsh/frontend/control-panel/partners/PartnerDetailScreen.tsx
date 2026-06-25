"use client";

import { useState } from "react";
import { statusScale, neutralScale } from "@bthwani/ui-kit";
import { CpButton, CpPageHeader } from "@bthwani/control-panel/components";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  usePartnerDetailController,
  usePartnerDocumentsController,
  usePartnerReadinessController,
  usePartnerAuditController,
  usePartnerStoresController,
} from "../../shared/partner";

type Tab = "overview" | "documents" | "stores" | "readiness" | "audit";

type Props = {
  readonly partnerId: string;
  readonly onBack?: () => void;
};

export function PartnerDetailScreen({ partnerId, onBack }: Props) {
  const identity = useIdentitySession();
  const authKind = identity.state.kind;
  const detail = usePartnerDetailController(partnerId, authKind);
  const docs = usePartnerDocumentsController(partnerId, authKind);
  const readiness = usePartnerReadinessController(partnerId, authKind);
  const audit = usePartnerAuditController(partnerId, authKind);
  const stores = usePartnerStoresController(partnerId, authKind);

  const [tab, setTab] = useState<Tab>("overview");
  const [transitionReason, setTransitionReason] = useState("");
  const [showTransitionInput, setShowTransitionInput] = useState<string | null>(null);

  if (identity.state.kind !== "authenticated") {
    return <div dir="rtl" style={{ padding: "2rem" }}>يجب تسجيل الدخول.</div>;
  }
  if (detail.detailState.kind === "loading" || detail.detailState.kind === "idle") {
    return <div dir="rtl" style={{ padding: "2rem" }}>جاري التحميل…</div>;
  }
  if (detail.detailState.kind === "not_found") {
    return <div dir="rtl" style={{ padding: "2rem" }}>الشريك غير موجود.</div>;
  }
  if (detail.detailState.kind === "error") {
    return <div dir="rtl" style={{ padding: "2rem", color: "red" }}>{detail.detailState.message}</div>;
  }
  if (detail.detailState.kind !== "success") return null;

  const vm = detail.detailViewModel!;
  const partner = detail.detailState.partner;

  const handleTransition = async (targetStatus: string) => {
    await detail.transition({
      targetStatus,
      reason: transitionReason,
      actorId: identity.state.kind === "authenticated" ? (identity.state as { subject?: string }).subject : undefined,
      actorSurface: "control-panel",
      version: partner.version,
    });
    setShowTransitionInput(null);
    setTransitionReason("");
  };

  const toneColor = (tone: string) => {
    if (tone === "success") return statusScale.success;
    if (tone === "danger") return statusScale.danger;
    if (tone === "warning") return statusScale.warning;
    if (tone === "info") return statusScale.info;
    return neutralScale[500];
  };

  return (
    <div dir="rtl" style={{ padding: "1.5rem", maxWidth: "64rem", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
        {onBack && <CpButton onClick={onBack}>← رجوع</CpButton>}
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{vm.displayName}</h1>
        <span style={{
          padding: "0.2rem 0.75rem",
          borderRadius: "9999px",
          fontSize: "0.8rem",
          fontWeight: 600,
          background: `${toneColor(vm.statusTone)}22`,
          color: toneColor(vm.statusTone),
        }}>
          {vm.statusLabel}
        </span>
      </div>

      {/* Next action banner */}
      {vm.nextAction && (
        <div style={{ padding: "0.75rem 1rem", background: "statusScale.infoSoft", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
          <strong>الإجراء التالي: </strong>{vm.nextAction}
        </div>
      )}
      {vm.blockedReason && (
        <div role="alert" style={{ padding: "0.75rem 1rem", background: "statusScale.warningSoft", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem", color: "statusScale.dangerStrong" }}>
          <strong>سبب التعطل: </strong>{vm.blockedReason}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid neutralScale[200]", marginBottom: "1.5rem" }}>
        {(["overview", "documents", "stores", "readiness", "audit"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: tab === t ? 700 : 400,
              borderBottom: tab === t ? "2px solid statusScale.info" : "2px solid transparent",
              marginBottom: "-2px",
              fontSize: "0.875rem",
            }}
          >
            {{ overview: "نظرة عامة", documents: "الوثائق", stores: "المتاجر", readiness: "الجاهزية", audit: "سجل التدقيق" }[t]}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <section style={{ border: "1px solid neutralScale[200]", borderRadius: "0.75rem", padding: "1rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>بيانات الشريك</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", margin: 0 }}>
              <dt style={{ fontWeight: 600, color: "neutralScale[500]", fontSize: "0.8rem" }}>الاسم القانوني</dt>
              <dd style={{ margin: 0 }}>{vm.legalNameAr}</dd>
              <dt style={{ fontWeight: 600, color: "neutralScale[500]", fontSize: "0.8rem" }}>الاسم الإنجليزي</dt>
              <dd style={{ margin: 0 }}>{vm.legalNameEn || "—"}</dd>
              <dt style={{ fontWeight: 600, color: "neutralScale[500]", fontSize: "0.8rem" }}>نوع الهوية</dt>
              <dd style={{ margin: 0 }}>{vm.legalIdentityType}</dd>
              <dt style={{ fontWeight: 600, color: "neutralScale[500]", fontSize: "0.8rem" }}>رقم الهوية</dt>
              <dd style={{ margin: 0 }}>{vm.legalIdentityNumber}</dd>
              <dt style={{ fontWeight: 600, color: "neutralScale[500]", fontSize: "0.8rem" }}>المالك</dt>
              <dd style={{ margin: 0 }}>{vm.ownerName}</dd>
              <dt style={{ fontWeight: 600, color: "neutralScale[500]", fontSize: "0.8rem" }}>الهاتف</dt>
              <dd style={{ margin: 0 }}>{vm.primaryPhone}</dd>
              <dt style={{ fontWeight: 600, color: "neutralScale[500]", fontSize: "0.8rem" }}>الفئة</dt>
              <dd style={{ margin: 0 }}>{vm.category}</dd>
            </dl>
          </section>

          {/* Transition actions */}
          <section style={{ border: "1px solid neutralScale[200]", borderRadius: "0.75rem", padding: "1rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>إجراءات دورة الحياة</h2>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {vm.allowedNextStatuses.map(status => (
                <CpButton
                  key={status}
                  onClick={() => setShowTransitionInput(status)}
                  style={{
                    background: status === "partner_active" || status === "ops_approved" ? "statusScale.success" :
                                status === "ops_rejected" || status === "partner_deactivated" ? "statusScale.danger" : undefined,
                    color: ["partner_active","ops_approved","ops_rejected","partner_deactivated"].includes(status) ? "white" : undefined,
                  }}
                >
                  → {status}
                </CpButton>
              ))}
            </div>
            {showTransitionInput && (
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <input
                  value={transitionReason}
                  onChange={e => setTransitionReason(e.target.value)}
                  placeholder="سبب / ملاحظة (إلزامي للرفض والإيقاف)"
                  style={{ flex: 1, padding: "0.5rem", border: "1px solid neutralScale[200]", borderRadius: "0.375rem" }}
                  dir="rtl"
                />
                <CpButton onClick={() => void handleTransition(showTransitionInput)}
                  disabled={detail.mutationState.kind === "loading"}>
                  {detail.mutationState.kind === "loading" ? "جاري…" : `تأكيد: ${showTransitionInput}`}
                </CpButton>
                <CpButton onClick={() => { setShowTransitionInput(null); setTransitionReason(""); }}>
                  إلغاء
                </CpButton>
              </div>
            )}
            {detail.mutationState.kind === "error" && detail.mutationState.message === "invalid_transition" && (
              <p role="alert" style={{ color: "statusScale.dangerStrong", marginTop: "0.5rem" }}>الانتقال غير مسموح من الحالة الحالية.</p>
            )}
            {detail.mutationState.kind === "error" && detail.mutationState.message === "version_conflict" && (
              <p role="alert" style={{ color: "statusScale.dangerStrong", marginTop: "0.5rem" }}>تعارض في الإصدار — أعد تحميل الصفحة وحاول مجدداً.</p>
            )}
            {detail.mutationState.kind === "error" && detail.mutationState.message !== "invalid_transition" && detail.mutationState.message !== "version_conflict" && (
              <p role="alert" style={{ color: "red", marginTop: "0.5rem" }}>{detail.mutationState.message}</p>
            )}
          </section>
        </div>
      )}

      {/* Documents */}
      {tab === "documents" && (
        <div>
          {docs.state.kind === "loading" && <p>جاري تحميل الوثائق…</p>}
          {docs.state.kind === "empty" && <p style={{ color: "neutralScale[500]" }}>لا توجد وثائق مرفوعة بعد.</p>}
          {docs.state.kind === "error" && <p style={{ color: "red" }}>{docs.state.message}</p>}
          {docs.state.kind === "success" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid neutralScale[200]" }}>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>نوع الوثيقة</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>الحالة</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>المراجع بواسطة</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {docs.state.documents.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: "1px solid neutralScale[200]" }}>
                    <td style={{ padding: "0.5rem" }}>{doc.docType}</td>
                    <td style={{ padding: "0.5rem" }}>{doc.status}</td>
                    <td style={{ padding: "0.5rem" }}>{doc.reviewedBy || "—"}</td>
                    <td style={{ padding: "0.5rem", display: "flex", gap: "0.4rem" }}>
                      <CpButton onClick={() => docs.review(doc.id, { status: "verified", reviewedBy: "operator" })}
                        disabled={doc.status === "verified"} style={{ fontSize: "0.75rem" }}>
                        اعتماد
                      </CpButton>
                      <CpButton onClick={() => docs.review(doc.id, { status: "rejected", reviewedBy: "operator" })}
                        disabled={doc.status === "rejected"} style={{ fontSize: "0.75rem" }}>
                        رفض
                      </CpButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Stores */}
      {tab === "stores" && (
        <div>
          {stores.state.kind === "loading" && <p>جاري تحميل المتاجر…</p>}
          {stores.state.kind === "empty" && <p style={{ color: "neutralScale[500]" }}>لا توجد متاجر مرتبطة بهذا الشريك بعد.</p>}
          {stores.state.kind === "error" && <p style={{ color: "red" }}>{stores.state.message}</p>}
          {stores.state.kind === "success" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid neutralScale[200]" }}>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>اسم المتجر</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>المدينة</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>الحالة</th>
                  <th style={{ padding: "0.5rem", textAlign: "right" }}>ظاهر للعميل</th>
                </tr>
              </thead>
              <tbody>
                {stores.state.stores.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid neutralScale[200]" }}>
                    <td style={{ padding: "0.5rem" }}>{s.displayName}</td>
                    <td style={{ padding: "0.5rem" }}>{s.cityCode}</td>
                    <td style={{ padding: "0.5rem" }}>{s.status}</td>
                    <td style={{ padding: "0.5rem" }}>{s.isVisible ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Readiness */}
      {tab === "readiness" && (
        <div>
          {readiness.state.kind === "loading" && <p>جاري تحميل الجاهزية…</p>}
          {readiness.state.kind === "error" && <p style={{ color: "red" }}>{readiness.state.message}</p>}
          {readiness.viewModel && (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {readiness.viewModel.items.map(item => (
                <div key={item.id} style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${item.satisfied ? "statusScale.success" : "statusScale.warning"}`,
                  background: item.satisfied ? "statusScale.successSoft" : "statusScale.warningSoft",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <span style={{ color: item.satisfied ? "statusScale.successStrong" : "statusScale.dangerStrong" }}>
                      {item.satisfied ? "✓ مستوفى" : "✗ غير مستوفى"}
                    </span>
                  </div>
                  {!item.satisfied && item.blockedReason && (
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "statusScale.dangerStrong" }}>{item.blockedReason}</p>
                  )}
                </div>
              ))}
              {readiness.viewModel.allGatesPassed && (
                <div style={{ padding: "0.75rem 1rem", background: "statusScale.successSoft", borderRadius: "0.5rem", color: "statusScale.successStrong", fontWeight: 700 }}>
                  ✓ جميع شروط الظهور مستوفاة
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audit */}
      {tab === "audit" && (
        <div>
          {audit.state.kind === "loading" && <p>جاري تحميل سجل التدقيق…</p>}
          {audit.state.kind === "empty" && <p style={{ color: "neutralScale[500]" }}>لا توجد أحداث مسجلة بعد.</p>}
          {audit.state.kind === "error" && <p style={{ color: "red" }}>{audit.state.message}</p>}
          {audit.state.kind === "success" && (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {audit.state.events.map(ev => (
                <div key={ev.id} style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid neutralScale[200]",
                  borderRadius: "0.5rem",
                  fontSize: "0.8rem",
                }}>
                  <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between" }}>
                    <span><strong>{ev.fromStatus}</strong> → <strong>{ev.toStatus}</strong></span>
                    <span style={{ color: "neutralScale[500]" }}>{new Date(ev.createdAt).toLocaleString("ar-SA")}</span>
                  </div>
                  <div style={{ color: "neutralScale[500]", marginTop: "0.25rem" }}>
                    {ev.actorSurface} {ev.actorId ? `• ${ev.actorId}` : ""}
                    {ev.reason ? ` • ${ev.reason}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
