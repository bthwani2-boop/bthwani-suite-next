"use client";

import { useState } from "react";
import { statusScale, neutralScale } from "@bthwani/ui-kit";
import {
  CpButton,
  CpDescriptionList,
  CpDescriptionRow,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpTextInput,
} from "@bthwani/control-panel/components";
import { DetailPageFrame } from "@bthwani/control-panel/shell";
import {
  usePartnerDetailController,
  usePartnerDocumentsController,
  usePartnerReadinessController,
  usePartnerAuditController,
  usePartnerStoresController,
  usePartnerVisitsController,
} from "../../shared/partner";

type Tab = "overview" | "documents" | "visits" | "stores" | "readiness" | "audit";

const TAB_LABELS: Record<Tab, string> = {
  overview: "نظرة عامة",
  documents: "الوثائق",
  visits: "الزيارات الميدانية",
  stores: "المتاجر",
  readiness: "الجاهزية",
  audit: "سجل التدقيق",
};

const TABS: Tab[] = ["overview", "documents", "visits", "stores", "readiness", "audit"];

const TONE_COLOR: Record<string, string> = {
  success: statusScale.success,
  danger: statusScale.danger,
  warning: statusScale.warning,
  info: statusScale.info,
};

function statusBadgeStyle(tone: string): React.CSSProperties {
  const color = TONE_COLOR[tone] ?? neutralScale[500];
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.2rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: 600,
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
    whiteSpace: "nowrap",
  };
}

function sectionCard(children: React.ReactNode, title: string): React.ReactNode {
  return (
    <section
      style={{
        border: `1px solid ${neutralScale[200]}`,
        borderRadius: "0.75rem",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: neutralScale[700] }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

type Props = {
  readonly partnerId: string;
  readonly onBack?: () => void;
};

export function PartnerDetailScreen({ partnerId, onBack }: Props) {
  const authKind = "authenticated" as const;
  const detail = usePartnerDetailController(partnerId, authKind);
  const docs = usePartnerDocumentsController(partnerId, authKind);
  const readiness = usePartnerReadinessController(partnerId, authKind);
  const audit = usePartnerAuditController(partnerId, authKind);
  const stores = usePartnerStoresController(partnerId, authKind);
  const visits = usePartnerVisitsController(partnerId, authKind);

  const [tab, setTab] = useState<Tab>("overview");
  const [transitionReason, setTransitionReason] = useState("");
  const [showTransitionInput, setShowTransitionInput] = useState<string | null>(null);

  if (detail.detailState.kind === "loading" || detail.detailState.kind === "idle") {
    return (
      <DetailPageFrame
        stateView={<CpStatePanel role="status" title="جاري تحميل بيانات الشريك…" />}
      >
        {null}
      </DetailPageFrame>
    );
  }
  if (detail.detailState.kind === "not_found") {
    return (
      <DetailPageFrame
        stateView={<CpStatePanel role="status" title="الشريك غير موجود." />}
      >
        {null}
      </DetailPageFrame>
    );
  }
  if (detail.detailState.kind === "error") {
    return (
      <DetailPageFrame
        stateView={
          <CpStatePanel role="alert" title="تعذر تحميل بيانات الشريك" code={detail.detailState.message}>
            <CpRetryButton onClick={detail.reload ?? (() => window.location.reload())}>
              إعادة المحاولة
            </CpRetryButton>
          </CpStatePanel>
        }
      >
        {null}
      </DetailPageFrame>
    );
  }
  if (detail.detailState.kind !== "success") return null;

  const vm = detail.detailViewModel!;
  const partner = detail.detailState.partner;

  const handleTransition = async (toStatus: string) => {
    await detail.transition({
      toStatus: toStatus as import("../../shared/partner").DshPartnerActivationStatus,
      ...(transitionReason ? { reason: transitionReason } : {}),
    });
    setShowTransitionInput(null);
    setTransitionReason("");
  };

  const transitionButtonColor = (status: string): React.CSSProperties => {
    if (status === "partner_active" || status === "ops_approved") {
      return { background: statusScale.success, color: neutralScale[0], borderColor: statusScale.success };
    }
    if (status === "ops_rejected" || status === "partner_deactivated") {
      return { background: statusScale.danger, color: neutralScale[0], borderColor: statusScale.danger };
    }
    return {};
  };

  return (
    <DetailPageFrame
      header={
        <CpPageHeader title={vm.displayName}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {onBack && (
              <CpButton onClick={onBack} aria-label="رجوع">
                ← رجوع
              </CpButton>
            )}
            <span style={statusBadgeStyle(vm.statusTone)}>{vm.statusLabel}</span>
          </div>
        </CpPageHeader>
      }
    >
      {/* ── Context banners ── */}
      {vm.nextAction ? (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: statusScale.infoSoft,
            borderRadius: "0.5rem",
            margin: "0 1rem 0.75rem",
            fontSize: "0.875rem",
            borderInlineStart: `3px solid ${statusScale.info}`,
          }}
        >
          <strong>الإجراء التالي: </strong>
          {vm.nextAction}
        </div>
      ) : null}
      {vm.blockedReason ? (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            background: statusScale.warningSoft,
            borderRadius: "0.5rem",
            margin: "0 1rem 0.75rem",
            fontSize: "0.875rem",
            color: statusScale.warningStrong,
            borderInlineStart: `3px solid ${statusScale.warning}`,
          }}
        >
          <strong>سبب التعطل: </strong>
          {vm.blockedReason}
        </div>
      ) : null}

      {/* ── Tabs ── */}
      <div
        role="tablist"
        aria-label="أقسام تفاصيل الشريك"
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `2px solid ${neutralScale[200]}`,
          margin: "0 1rem 1.5rem",
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t ? "true" : "false"}
            onClick={() => setTab(t)}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? statusScale.info : neutralScale[600],
              borderBottom: tab === t ? `2px solid ${statusScale.info}` : "2px solid transparent",
              marginBottom: "-2px",
              fontSize: "0.875rem",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: "0 1rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Overview */}
        {tab === "overview" && (
          <>
            {sectionCard(
              <CpDescriptionList>
                <CpDescriptionRow label="الاسم القانوني">{vm.legalNameAr}</CpDescriptionRow>
                <CpDescriptionRow label="الاسم الإنجليزي">{vm.legalNameEn || "—"}</CpDescriptionRow>
                <CpDescriptionRow label="نوع الهوية">{vm.legalIdentityType}</CpDescriptionRow>
                <CpDescriptionRow label="رقم الهوية">{vm.legalIdentityNumber}</CpDescriptionRow>
                <CpDescriptionRow label="المالك">{vm.ownerName}</CpDescriptionRow>
                <CpDescriptionRow label="الهاتف">{vm.primaryPhone}</CpDescriptionRow>
                <CpDescriptionRow label="الفئة">{vm.category}</CpDescriptionRow>
              </CpDescriptionList>,
              "بيانات الشريك"
            )}

            {vm.bankAccount.hasBankAccount &&
              sectionCard(
                <>
                  <CpDescriptionList>
                    <CpDescriptionRow label="اسم صاحب الحساب">{vm.bankAccount.beneficiaryName}</CpDescriptionRow>
                    <CpDescriptionRow label="البنك">{vm.bankAccount.bankName}</CpDescriptionRow>
                    <CpDescriptionRow label="الفرع">{vm.bankAccount.bankBranch}</CpDescriptionRow>
                    <CpDescriptionRow label="رقم الحساب">{vm.bankAccount.maskedAccountNumber}</CpDescriptionRow>
                    <CpDescriptionRow label="الآيبان (IBAN)">{vm.bankAccount.maskedIban}</CpDescriptionRow>
                    <CpDescriptionRow label="طريقة التسوية المفضلة">{vm.bankAccount.settlementPreferenceLabel}</CpDescriptionRow>
                    <CpDescriptionRow label="صاحب الحساب هو المالك">
                      {vm.bankAccount.bankAccountHolderMatchesOwner ? "نعم" : "لا"}
                    </CpDescriptionRow>
                    <CpDescriptionRow label="ملاحظات">{vm.bankAccount.bankNotes}</CpDescriptionRow>
                  </CpDescriptionList>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: neutralScale[500] }}>
                    بيانات مصرّح بها للمراجعة فقط — رقم الحساب والآيبان معروضان جزئيًا للحماية. هذه البيانات وصفية
                    ولا تُنشئ أي حركة مالية في WLT.
                  </p>
                </>,
                "بيانات الحساب البنكي"
              )}

            {sectionCard(
              <>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {vm.allowedNextStatuses.map((status) => (
                    <CpButton
                      key={status}
                      onClick={() => setShowTransitionInput(status)}
                      style={transitionButtonColor(status)}
                    >
                      {status}
                    </CpButton>
                  ))}
                </div>
                {showTransitionInput ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem" }}>
                    <div style={{ flex: 1 }}>
                      <CpTextInput
                        value={transitionReason}
                        onChange={setTransitionReason}
                        placeholder="سبب / ملاحظة (إلزامي للرفض والإيقاف)"
                        aria-label="سبب الانتقال"
                      />
                    </div>
                    <CpButton
                      onClick={() => void handleTransition(showTransitionInput)}
                      disabled={detail.mutationState.kind === "loading"}
                    >
                      {detail.mutationState.kind === "loading" ? "جاري…" : `تأكيد: ${showTransitionInput}`}
                    </CpButton>
                    <CpButton
                      onClick={() => {
                        setShowTransitionInput(null);
                        setTransitionReason("");
                      }}
                    >
                      إلغاء
                    </CpButton>
                  </div>
                ) : null}
                {detail.mutationState.kind === "error" ? (
                  <p
                    role="alert"
                    style={{ color: statusScale.danger, margin: "0.25rem 0 0", fontSize: "0.85rem" }}
                  >
                    {detail.mutationState.message === "invalid_transition"
                      ? "الانتقال غير مسموح من الحالة الحالية."
                      : detail.mutationState.message === "version_conflict"
                      ? "تعارض في الإصدار — أعد تحميل الصفحة وحاول مجدداً."
                      : detail.mutationState.message}
                  </p>
                ) : null}
              </>,
              "إجراءات دورة الحياة"
            )}
          </>
        )}

        {/* Documents */}
        {tab === "documents" && (
          docs.state.kind === "loading" ? (
            <CpStatePanel role="status" title="جاري تحميل الوثائق…" />
          ) : docs.state.kind === "empty" ? (
            <CpStatePanel role="status" title="لا توجد وثائق مرفوعة بعد." />
          ) : docs.state.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل الوثائق" code={docs.state.message} />
          ) : docs.state.kind === "success" ? (
            <CpTable aria-label="وثائق الشريك">
              <thead>
                <tr>
                  <CpTableHeaderCell>نوع الوثيقة</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {docs.state.documents.map((doc) => (
                  <tr key={doc.id}>
                    <CpTableCell>{doc.documentType}</CpTableCell>
                    <CpTableCell>{doc.documentStatus}</CpTableCell>
                    <CpTableCell>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <CpButton
                          onClick={() => docs.review(doc.id, { decision: "approved" })}
                          disabled={doc.documentStatus === "approved"}
                        >
                          اعتماد
                        </CpButton>
                        <CpButton
                          onClick={() => docs.review(doc.id, { decision: "rejected" })}
                          disabled={doc.documentStatus === "rejected"}
                        >
                          رفض
                        </CpButton>
                      </div>
                    </CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          ) : null
        )}

        {/* Field Visits */}
        {tab === "visits" && (
          visits.state.kind === "loading" ? (
            <CpStatePanel role="status" title="جاري تحميل الزيارات الميدانية…" />
          ) : visits.state.kind === "empty" ? (
            <CpStatePanel role="status" title="لا توجد زيارات ميدانية مسجلة بعد." />
          ) : visits.state.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل الزيارات الميدانية" code={visits.state.message} />
          ) : visits.state.kind === "success" ? (
            <CpTable aria-label="زيارات الشريك الميدانية">
              <thead>
                <tr>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>ملاحظات</CpTableHeaderCell>
                  <CpTableHeaderCell>الموقع</CpTableHeaderCell>
                  <CpTableHeaderCell>تاريخ الرفع</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {visits.state.visits.map((v) => (
                  <tr key={v.id}>
                    <CpTableCell>{v.visitStatus}</CpTableCell>
                    <CpTableCell>{v.visitNotes || "—"}</CpTableCell>
                    <CpTableCell>
                      {v.locationLatitude !== null ? `${v.locationLatitude}, ${v.locationLongitude}` : "—"}
                    </CpTableCell>
                    <CpTableCell>{v.submittedAt ? new Date(v.submittedAt).toLocaleString("ar-SA") : "—"}</CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          ) : null
        )}

        {/* Stores */}
        {tab === "stores" && (
          stores.state.kind === "loading" ? (
            <CpStatePanel role="status" title="جاري تحميل المتاجر…" />
          ) : stores.state.kind === "empty" ? (
            <CpStatePanel role="status" title="لا توجد متاجر مرتبطة بهذا الشريك بعد." />
          ) : stores.state.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل المتاجر" code={stores.state.message} />
          ) : stores.state.kind === "success" ? (
            <CpTable aria-label="متاجر الشريك">
              <thead>
                <tr>
                  <CpTableHeaderCell>اسم المتجر</CpTableHeaderCell>
                  <CpTableHeaderCell>المدينة</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>ظاهر للعميل</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {stores.state.stores.map((s) => (
                  <tr key={s.id}>
                    <CpTableCell>{s.displayName}</CpTableCell>
                    <CpTableCell>{s.cityCode}</CpTableCell>
                    <CpTableCell>{s.status}</CpTableCell>
                    <CpTableCell>
                      {s.isVisible ? (
                        <span style={{ color: statusScale.success, fontWeight: 600 }}>ظاهر</span>
                      ) : (
                        <span style={{ color: neutralScale[400] }}>مخفي</span>
                      )}
                    </CpTableCell>
                  </tr>
                ))}
              </tbody>
            </CpTable>
          ) : null
        )}

        {/* Readiness */}
        {tab === "readiness" && (
          readiness.state.kind === "loading" ? (
            <CpStatePanel role="status" title="جاري تحميل الجاهزية…" />
          ) : readiness.state.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل الجاهزية" code={readiness.state.message} />
          ) : readiness.viewModel ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {readiness.viewModel.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "0.875rem 1rem",
                    borderRadius: "0.625rem",
                    border: `1px solid ${item.satisfied ? statusScale.success : statusScale.warning}`,
                    background: item.satisfied ? statusScale.successSoft : statusScale.warningSoft,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{item.label}</span>
                    {!item.satisfied && item.blockedReason ? (
                      <span style={{ fontSize: "0.8rem", color: statusScale.dangerStrong }}>
                        {item.blockedReason}
                      </span>
                    ) : null}
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      color: item.satisfied ? statusScale.successStrong : statusScale.dangerStrong,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.satisfied ? "مستوفى" : "غير مستوفى"}
                  </span>
                </div>
              ))}
              {readiness.viewModel.allGatesPassed ? (
                <div
                  style={{
                    padding: "0.875rem 1rem",
                    background: statusScale.successSoft,
                    borderRadius: "0.625rem",
                    border: `1px solid ${statusScale.success}`,
                    color: statusScale.successStrong,
                    fontWeight: 700,
                    fontSize: "0.875rem",
                  }}
                >
                  جميع شروط الظهور مستوفاة
                </div>
              ) : null}
            </div>
          ) : null
        )}

        {/* Audit */}
        {tab === "audit" && (
          audit.state.kind === "loading" ? (
            <CpStatePanel role="status" title="جاري تحميل سجل التدقيق…" />
          ) : audit.state.kind === "empty" ? (
            <CpStatePanel role="status" title="لا توجد أحداث مسجلة بعد." />
          ) : audit.state.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل سجل التدقيق" code={audit.state.message} />
          ) : audit.state.kind === "success" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {audit.state.events.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: "0.875rem 1rem",
                    border: `1px solid ${neutralScale[200]}`,
                    borderRadius: "0.625rem",
                    fontSize: "0.8rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <span>
                      <strong>{ev.fromStatus}</strong>
                      <span style={{ color: neutralScale[400], margin: "0 0.25rem" }}>→</span>
                      <strong>{ev.toStatus}</strong>
                    </span>
                    <span style={{ color: neutralScale[500] }}>
                      {new Date(ev.createdAt).toLocaleString("ar-SA")}
                    </span>
                  </div>
                  <div style={{ color: neutralScale[500] }}>
                    {ev.actorSurface}
                    {ev.actorId ? ` • ${ev.actorId}` : ""}
                    {ev.reason ? ` • ${ev.reason}` : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : null
        )}

      </div>
    </DetailPageFrame>
  );
}
