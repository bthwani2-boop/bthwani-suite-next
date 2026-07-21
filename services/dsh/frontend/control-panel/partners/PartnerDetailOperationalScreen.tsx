"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { neutralScale, statusScale } from "@bthwani/ui-kit";
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
  usePartnerAuditController,
  usePartnerDetailController,
  usePartnerDocumentsController,
  usePartnerReadinessController,
  usePartnerStoresController,
  usePartnerVisitsController,
} from "../../shared/partner";
import type { DshPartnerActivationStatus } from "../../shared/partner";

type Tab = "overview" | "documents" | "visits" | "stores" | "readiness" | "audit";
type DocumentDecision = "rejected" | "needs_resubmit";

const TABS: readonly Tab[] = ["overview", "documents", "visits", "stores", "readiness", "audit"];
const TAB_LABELS: Record<Tab, string> = {
  overview: "نظرة عامة",
  documents: "الوثائق",
  visits: "الزيارات الميدانية",
  stores: "المتاجر",
  readiness: "الجاهزية",
  audit: "سجل التدقيق",
};
const REASON_REQUIRED = new Set<string>(["ops_rejected", "partner_deactivated", "client_hidden"]);

function card(title: string, children: ReactNode): ReactNode {
  return (
    <section style={{ border: `1px solid ${neutralScale[200]}`, borderRadius: 12, padding: 20, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 14 }}>{title}</h2>
      {children}
    </section>
  );
}

function mutationMessage(message: string): string {
  if (message === "invalid_transition") return "الانتقال غير مسموح من الحالة الحالية.";
  if (message === "version_conflict") return "تغيرت بيانات الشريك. أعد التحميل ثم راجع القرار من جديد.";
  return message;
}

function statusStyle(tone: string): CSSProperties {
  const color = tone === "success"
    ? statusScale.success
    : tone === "danger"
      ? statusScale.danger
      : tone === "warning"
        ? statusScale.warning
        : statusScale.info;
  return { color, border: `1px solid ${color}`, borderRadius: 999, padding: "4px 10px", fontWeight: 700 };
}

export type PartnerDetailOperationalScreenProps = {
  readonly partnerId: string;
  readonly onBack?: () => void;
};

export function PartnerDetailOperationalScreen({ partnerId, onBack }: PartnerDetailOperationalScreenProps) {
  const authKind = "authenticated" as const;
  const detail = usePartnerDetailController(partnerId, authKind);
  const docs = usePartnerDocumentsController(partnerId, authKind);
  const visits = usePartnerVisitsController(partnerId, authKind);
  const stores = usePartnerStoresController(partnerId, authKind);
  const readiness = usePartnerReadinessController(partnerId, authKind);
  const audit = usePartnerAuditController(partnerId, authKind);

  const [tab, setTab] = useState<Tab>("overview");
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [documentDecision, setDocumentDecision] = useState<{
    readonly documentId: string;
    readonly decision: DocumentDecision;
  } | null>(null);
  const [documentReason, setDocumentReason] = useState("");
  const [storeIdToLink, setStoreIdToLink] = useState("");

  if (detail.detailState.kind === "idle" || detail.detailState.kind === "loading") {
    return <DetailPageFrame stateView={<CpStatePanel role="status" title="جاري تحميل بيانات الشريك…" />}>{null}</DetailPageFrame>;
  }
  if (detail.detailState.kind === "not_found") {
    return <DetailPageFrame stateView={<CpStatePanel role="status" title="الشريك غير موجود." />}>{null}</DetailPageFrame>;
  }
  if (detail.detailState.kind === "forbidden") {
    return <DetailPageFrame stateView={<CpStatePanel role="alert" title="غير مصرح لك بعرض هذا الشريك." />}>{null}</DetailPageFrame>;
  }
  if (detail.detailState.kind === "error") {
    return (
      <DetailPageFrame stateView={(
        <CpStatePanel role="alert" title="تعذر تحميل بيانات الشريك" code={detail.detailState.message}>
          <CpRetryButton onClick={() => void detail.reload()}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      )}>{null}</DetailPageFrame>
    );
  }
  if (detail.detailState.kind !== "success" || !detail.detailViewModel) return null;

  const partner = detail.detailState.partner;
  const vm = detail.detailViewModel;

  const confirmTransition = async () => {
    if (!transitionTarget) return;
    const reason = transitionReason.trim();
    if (REASON_REQUIRED.has(transitionTarget) && !reason) return;
    const succeeded = await detail.transition({
      toStatus: transitionTarget as DshPartnerActivationStatus,
      ...(reason ? { reason } : {}),
    }, partner.version);
    if (succeeded) {
      setTransitionTarget(null);
      setTransitionReason("");
    }
  };

  const confirmDocumentDecision = async () => {
    if (!documentDecision || !documentReason.trim()) return;
    const succeeded = await docs.review(documentDecision.documentId, {
      decision: documentDecision.decision,
      reason: documentReason.trim(),
    });
    if (succeeded) {
      setDocumentDecision(null);
      setDocumentReason("");
    }
  };

  const confirmStoreLink = async () => {
    const storeId = storeIdToLink.trim();
    if (!storeId) return;
    const succeeded = await stores.linkStore(storeId);
    if (succeeded) setStoreIdToLink("");
  };

  return (
    <DetailPageFrame
      header={(
        <CpPageHeader title={vm.displayName}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {onBack ? <CpButton onClick={onBack}>← رجوع</CpButton> : null}
            <span style={statusStyle(vm.statusTone)}>{vm.statusLabel}</span>
          </div>
        </CpPageHeader>
      )}
    >
      <div role="tablist" aria-label="أقسام تفاصيل الشريك" style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${neutralScale[200]}` }}>
        {TABS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={tab === candidate}
            onClick={() => setTab(candidate)}
            style={{ padding: "12px 16px", border: 0, borderBottom: tab === candidate ? `3px solid ${statusScale.info}` : "3px solid transparent", background: "transparent", cursor: "pointer", fontWeight: tab === candidate ? 700 : 400, whiteSpace: "nowrap" }}
          >
            {TAB_LABELS[candidate]}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 16, padding: 16 }}>
        {vm.nextAction ? <CpStatePanel role="status" title={`الإجراء التالي: ${vm.nextAction}`} /> : null}
        {vm.blockedReason ? <CpStatePanel role="alert" title="سبب التعطل" code={vm.blockedReason} /> : null}

        {tab === "overview" ? (
          <>
            {card("بيانات الشريك", (
              <CpDescriptionList>
                <CpDescriptionRow label="الاسم القانوني">{vm.legalNameAr}</CpDescriptionRow>
                <CpDescriptionRow label="الاسم الإنجليزي">{vm.legalNameEn || "—"}</CpDescriptionRow>
                <CpDescriptionRow label="نوع الهوية">{vm.legalIdentityType}</CpDescriptionRow>
                <CpDescriptionRow label="رقم الهوية">{vm.legalIdentityNumber}</CpDescriptionRow>
                <CpDescriptionRow label="المالك">{vm.ownerName}</CpDescriptionRow>
                <CpDescriptionRow label="الهاتف">{vm.primaryPhone}</CpDescriptionRow>
                <CpDescriptionRow label="الفئة">{vm.category}</CpDescriptionRow>
                <CpDescriptionRow label="الإصدار التشغيلي">{partner.version}</CpDescriptionRow>
              </CpDescriptionList>
            ))}

            {card("إجراءات دورة الحياة", (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {vm.allowedNextStatuses.map((status) => (
                    <CpButton key={status} onClick={() => { setTransitionTarget(status); setTransitionReason(""); }}>
                      {status}
                    </CpButton>
                  ))}
                </div>
                {transitionTarget ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <CpTextInput
                      value={transitionReason}
                      onChange={setTransitionReason}
                      placeholder={REASON_REQUIRED.has(transitionTarget) ? "السبب إلزامي لهذا القرار" : "سبب أو ملاحظة تشغيلية"}
                      aria-label="سبب انتقال حالة الشريك"
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <CpButton
                        onClick={() => void confirmTransition()}
                        disabled={detail.mutationState.kind === "loading" || (REASON_REQUIRED.has(transitionTarget) && !transitionReason.trim())}
                      >
                        {detail.mutationState.kind === "loading" ? "جاري الحفظ…" : "تأكيد القرار"}
                      </CpButton>
                      <CpButton onClick={() => { setTransitionTarget(null); setTransitionReason(""); }}>إلغاء</CpButton>
                    </div>
                  </div>
                ) : null}
                {detail.mutationState.kind === "error" ? (
                  <p role="alert" style={{ color: statusScale.danger, margin: 0 }}>{mutationMessage(detail.mutationState.message)}</p>
                ) : null}
              </>
            ))}
          </>
        ) : null}

        {tab === "documents" ? (
          docs.state.kind === "loading" || docs.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل الوثائق…" />
            : docs.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد وثائق مرفوعة بعد."><CpRetryButton onClick={() => void docs.load()}>تحديث</CpRetryButton></CpStatePanel>
              : docs.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل الوثائق" code={docs.state.message}><CpRetryButton onClick={() => void docs.load()}>إعادة المحاولة</CpRetryButton></CpStatePanel>
                : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <CpTable aria-label="وثائق الشريك">
                      <thead><tr><CpTableHeaderCell>نوع الوثيقة</CpTableHeaderCell><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>الإجراءات</CpTableHeaderCell></tr></thead>
                      <tbody>
                        {docs.state.documents.map((doc) => (
                          <tr key={doc.id}>
                            <CpTableCell>{doc.documentType}</CpTableCell>
                            <CpTableCell>{doc.documentStatus}</CpTableCell>
                            <CpTableCell>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <CpButton disabled={docs.actionState.kind === "loading" || doc.documentStatus === "approved"} onClick={() => void docs.review(doc.id, { decision: "approved" })}>اعتماد</CpButton>
                                <CpButton disabled={docs.actionState.kind === "loading"} onClick={() => { setDocumentDecision({ documentId: doc.id, decision: "rejected" }); setDocumentReason(""); }}>رفض</CpButton>
                                <CpButton disabled={docs.actionState.kind === "loading"} onClick={() => { setDocumentDecision({ documentId: doc.id, decision: "needs_resubmit" }); setDocumentReason(""); }}>طلب إعادة الرفع</CpButton>
                              </div>
                            </CpTableCell>
                          </tr>
                        ))}
                      </tbody>
                    </CpTable>
                    {documentDecision ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <CpTextInput value={documentReason} onChange={setDocumentReason} placeholder="سبب القرار ومتطلبات المعالجة" aria-label="سبب قرار الوثيقة" />
                        <div style={{ display: "flex", gap: 8 }}>
                          <CpButton disabled={!documentReason.trim() || docs.actionState.kind === "loading"} onClick={() => void confirmDocumentDecision()}>تأكيد القرار</CpButton>
                          <CpButton onClick={() => { setDocumentDecision(null); setDocumentReason(""); }}>إلغاء</CpButton>
                        </div>
                      </div>
                    ) : null}
                    {docs.actionState.kind === "error" ? <p role="alert" style={{ color: statusScale.danger, margin: 0 }}>{docs.actionState.message}</p> : null}
                  </div>
                )
        ) : null}

        {tab === "visits" ? (
          visits.state.kind === "loading" || visits.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل الزيارات الميدانية…" />
            : visits.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد زيارات ميدانية مسجلة بعد." />
              : visits.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل الزيارات الميدانية" code={visits.state.message}><CpRetryButton onClick={() => void visits.reload()}>إعادة المحاولة</CpRetryButton></CpStatePanel>
                : (
                  <CpTable aria-label="زيارات الشريك الميدانية"><thead><tr><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>الملاحظات</CpTableHeaderCell><CpTableHeaderCell>الموقع</CpTableHeaderCell><CpTableHeaderCell>التاريخ</CpTableHeaderCell></tr></thead><tbody>
                    {visits.state.visits.map((visit) => <tr key={visit.id}><CpTableCell>{visit.visitStatus}</CpTableCell><CpTableCell>{visit.visitNotes || "—"}</CpTableCell><CpTableCell>{visit.locationLatitude === null ? "—" : `${visit.locationLatitude}, ${visit.locationLongitude}`}</CpTableCell><CpTableCell>{visit.submittedAt ? new Date(visit.submittedAt).toLocaleString("ar-SA") : "—"}</CpTableCell></tr>)}
                  </tbody></CpTable>
                )
        ) : null}

        {tab === "stores" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={{ display: "grid", gap: 8, border: `1px solid ${neutralScale[200]}`, borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>ربط متجر غير مملوك</h3>
              <CpTextInput
                value={storeIdToLink}
                onChange={setStoreIdToLink}
                placeholder="معرف المتجر"
                aria-label="معرف المتجر المراد ربطه"
              />
              <CpButton
                disabled={!storeIdToLink.trim() || stores.actionState.kind === "loading"}
                onClick={() => void confirmStoreLink()}
              >
                {stores.actionState.kind === "loading" ? "جارٍ الربط…" : "ربط المتجر بالشريك"}
              </CpButton>
              {stores.actionState.kind === "error" ? (
                <p role="alert" style={{ color: statusScale.danger, margin: 0 }}>{stores.actionState.message}</p>
              ) : null}
            </section>
            {stores.state.kind === "loading" || stores.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل المتاجر…" />
              : stores.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد متاجر مرتبطة بهذا الشريك بعد." />
                : stores.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل المتاجر" code={stores.state.message}><CpRetryButton onClick={() => void stores.reload()}>إعادة المحاولة</CpRetryButton></CpStatePanel>
                  : (
                    <CpTable aria-label="متاجر الشريك"><thead><tr><CpTableHeaderCell>المتجر</CpTableHeaderCell><CpTableHeaderCell>المدينة</CpTableHeaderCell><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>ظهور العميل</CpTableHeaderCell></tr></thead><tbody>
                      {stores.state.stores.map((store) => <tr key={store.id}><CpTableCell>{store.displayName}</CpTableCell><CpTableCell>{store.cityCode}</CpTableCell><CpTableCell>{store.status}</CpTableCell><CpTableCell>{store.isVisible ? "ظاهر" : "مخفي"}</CpTableCell></tr>)}
                    </tbody></CpTable>
                  )}
          </div>
        ) : null}

        {tab === "readiness" ? (
          readiness.state.kind === "loading" || readiness.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل الجاهزية…" />
            : readiness.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل الجاهزية" code={readiness.state.message}><CpRetryButton onClick={() => void readiness.reload()}>إعادة المحاولة</CpRetryButton></CpStatePanel>
              : readiness.viewModel ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {readiness.viewModel.items.map((item) => <CpStatePanel key={item.id} role="status" title={`${item.satisfied ? "مستوفى" : "غير مستوفى"}: ${item.label}`} code={item.blockedReason || undefined} />)}
                  {readiness.viewModel.allGatesPassed ? <CpStatePanel role="status" title="جميع بوابات الجاهزية مستوفاة." /> : null}
                </div>
              ) : null
        ) : null}

        {tab === "audit" ? (
          audit.state.kind === "loading" || audit.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل سجل التدقيق…" />
            : audit.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد أحداث مسجلة بعد." />
              : audit.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل سجل التدقيق" code={audit.state.message}><CpRetryButton onClick={() => void audit.reload()}>إعادة المحاولة</CpRetryButton></CpStatePanel>
                : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {audit.state.events.map((event) => card(`${event.fromStatus} ← ${event.toStatus}`, <p style={{ margin: 0 }}>{event.actorSurface}{event.actorId ? ` • ${event.actorId}` : ""}{event.reason ? ` • ${event.reason}` : ""} • {new Date(event.createdAt).toLocaleString("ar-SA")}</p>))}
                  </div>
                )
        ) : null}
      </div>
    </DetailPageFrame>
  );
}
