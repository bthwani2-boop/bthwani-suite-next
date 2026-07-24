"use client";

import { useState, type ReactNode } from "react";
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
import { useControlPanelSession } from "@dsh-shared/session/control-panel-session";
import {
  useGovernedPartnerStoresController,
  usePartnerAuditController,
  usePartnerDetailController,
  usePartnerDocumentsController,
  usePartnerReadinessController,
  usePartnerVisitsController,
  type DshPartnerActivationStatus,
  type DshPartnerReadiness,
} from "../../shared/partner";
import { OperatorDeliveryPricingPanel } from "./stores/OperatorDeliveryPricingPanel";

type Tab = "overview" | "documents" | "visits" | "stores" | "readiness" | "audit";
type DocumentDecision = "rejected" | "needs_resubmit";

type StoreReadiness = Readonly<{
  storeId: string;
  displayName: string;
  canPublishToClient: boolean;
  isClientVisible: boolean;
  blockedReasonCodes: readonly string[];
  blockedReasonMessage?: string;
}>;

type AggregatedReadiness = DshPartnerReadiness & Readonly<{
  storeSummary?: Readonly<{
    totalStores: number;
    readyStores: number;
    blockedStores: number;
    clientVisibleStores: number;
  }>;
  stores?: readonly StoreReadiness[];
  generatedAt?: string;
}>;

const TABS: readonly Tab[] = ["overview", "documents", "visits", "stores", "readiness", "audit"];
const TAB_LABELS: Record<Tab, string> = {
  overview: "نظرة عامة",
  documents: "الوثائق",
  visits: "الزيارات الميدانية",
  stores: "المتاجر والفروع",
  readiness: "الجاهزية متعددة الفروع",
  audit: "سجل التدقيق",
};
const REASON_REQUIRED = new Set<string>(["ops_rejected", "partner_deactivated", "client_hidden"]);

function section(title: string, content: ReactNode): ReactNode {
  return (
    <section style={{ border: `1px solid ${neutralScale[200]}`, borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 14 }}>{title}</h2>
      {content}
    </section>
  );
}

export type PartnerDetailUnifiedScreenProps = {
  readonly partnerId: string;
  readonly onBack?: () => void;
};

export function PartnerDetailUnifiedScreen({ partnerId, onBack }: PartnerDetailUnifiedScreenProps) {
  const { state: sessionState } = useControlPanelSession();
  const authKind = sessionState.kind;
  const detail = usePartnerDetailController(partnerId, authKind);
  const documents = usePartnerDocumentsController(partnerId, authKind);
  const visits = usePartnerVisitsController(partnerId, authKind);
  const stores = useGovernedPartnerStoresController(partnerId, authKind);
  const readiness = usePartnerReadinessController(partnerId, authKind);
  const audit = usePartnerAuditController(partnerId, authKind);

  const [tab, setTab] = useState<Tab>("overview");
  const [transitionTarget, setTransitionTarget] = useState<DshPartnerActivationStatus | null>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [documentDecision, setDocumentDecision] = useState<{ id: string; decision: DocumentDecision } | null>(null);
  const [documentReason, setDocumentReason] = useState("");
  const [storeId, setStoreId] = useState("");
  const [storeReason, setStoreReason] = useState("");
  const [storeVersion, setStoreVersion] = useState("");
  const [pricingStoreId, setPricingStoreId] = useState<string | null>(null);

  if (sessionState.kind !== "authenticated") {
    return (
      <DetailPageFrame stateView={(
        <CpStatePanel
          role={sessionState.kind === "restoring" || sessionState.kind === "authenticating" ? "status" : "alert"}
          title={sessionState.kind === "restoring" || sessionState.kind === "authenticating" ? "جاري استعادة الجلسة…" : "جلسة مصادق عليها مطلوبة"}
          description="لا يتم تحميل ملف الشريك أو إجراء أي قرار قبل التحقق من جلسة المشغل والمستأجر."
        />
      )}>{null}</DetailPageFrame>
    );
  }

  if (detail.detailState.kind === "idle" || detail.detailState.kind === "loading") {
    return <DetailPageFrame stateView={<CpStatePanel role="status" title="جاري تحميل ملف الشريك…" />}>{null}</DetailPageFrame>;
  }
  if (detail.detailState.kind === "not_found") {
    return <DetailPageFrame stateView={<CpStatePanel role="status" title="الشريك غير موجود ضمن المستأجر الحالي." />}>{null}</DetailPageFrame>;
  }
  if (detail.detailState.kind === "forbidden") {
    return <DetailPageFrame stateView={<CpStatePanel role="alert" title="غير مصرح لك بعرض هذا الشريك." />}>{null}</DetailPageFrame>;
  }
  if (detail.detailState.kind === "error") {
    return (
      <DetailPageFrame stateView={(
        <CpStatePanel role="alert" title="تعذر تحميل ملف الشريك" code={detail.detailState.message}>
          <CpRetryButton onClick={() => void detail.reload()}>إعادة المحاولة</CpRetryButton>
        </CpStatePanel>
      )}>{null}</DetailPageFrame>
    );
  }
  if (detail.detailState.kind !== "success" || detail.detailViewModel === null) return null;

  const partner = detail.detailState.partner;
  const viewModel = detail.detailViewModel;
  const aggregate = readiness.state.kind === "success"
    ? readiness.state.readiness as AggregatedReadiness
    : null;

  async function confirmTransition() {
    if (!transitionTarget) return;
    const reason = transitionReason.trim();
    if (REASON_REQUIRED.has(transitionTarget) && !reason) return;
    const succeeded = await detail.transition({
      toStatus: transitionTarget,
      ...(reason ? { reason } : {}),
    }, partner.version);
    if (succeeded) {
      setTransitionTarget(null);
      setTransitionReason("");
      void readiness.reload();
    }
  }

  async function confirmDocumentReview() {
    if (!documentDecision || documentReason.trim().length < 5) return;
    const succeeded = await documents.review(documentDecision.id, {
      decision: documentDecision.decision,
      reason: documentReason.trim(),
    });
    if (succeeded) {
      setDocumentDecision(null);
      setDocumentReason("");
      void readiness.reload();
    }
  }

  async function confirmStoreOwnership() {
    const id = storeId.trim();
    if (!id) return;
    const parsedVersion = storeVersion.trim() ? Number(storeVersion.trim()) : undefined;
    const succeeded = await stores.linkOrTransfer({
      storeId: id,
      ...(storeReason.trim() ? { reason: storeReason.trim() } : {}),
      ...(parsedVersion !== undefined && Number.isInteger(parsedVersion) && parsedVersion > 0
        ? { expectedStoreVersion: parsedVersion }
        : {}),
    });
    if (succeeded) {
      setStoreId("");
      setStoreReason("");
      setStoreVersion("");
      void readiness.reload();
      void audit.reload();
    }
  }

  return (
    <DetailPageFrame
      header={(
        <CpPageHeader title={viewModel.displayName}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {onBack ? <CpButton onClick={onBack}>← رجوع</CpButton> : null}
            <span style={{ border: `1px solid ${statusScale.info}`, borderRadius: 999, padding: "4px 10px", fontWeight: 700 }}>
              {viewModel.statusLabel}
            </span>
          </div>
        </CpPageHeader>
      )}
    >
      <div role="tablist" aria-label="أقسام ملف الشريك" style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${neutralScale[200]}` }}>
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
        {tab === "overview" ? (
          <>
            {section("الهوية القانونية", (
              <CpDescriptionList>
                <CpDescriptionRow label="الاسم القانوني">{viewModel.legalNameAr}</CpDescriptionRow>
                <CpDescriptionRow label="الاسم الظاهر">{viewModel.displayName}</CpDescriptionRow>
                <CpDescriptionRow label="نوع الهوية">{viewModel.legalIdentityType}</CpDescriptionRow>
                <CpDescriptionRow label="رقم الهوية">{viewModel.legalIdentityNumber}</CpDescriptionRow>
                <CpDescriptionRow label="المالك">{viewModel.ownerName}</CpDescriptionRow>
                <CpDescriptionRow label="الهاتف">{viewModel.primaryPhone}</CpDescriptionRow>
                <CpDescriptionRow label="الفئة">{viewModel.category}</CpDescriptionRow>
                <CpDescriptionRow label="الإصدار">{partner.version}</CpDescriptionRow>
              </CpDescriptionList>
            ))}
            {section("قرارات دورة الحياة", (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {viewModel.allowedNextStatuses.map((status) => (
                    <CpButton key={status} onClick={() => { setTransitionTarget(status); setTransitionReason(""); }}>{status}</CpButton>
                  ))}
                </div>
                {transitionTarget ? (
                  <>
                    <CpTextInput value={transitionReason} onChange={setTransitionReason} placeholder="سبب القرار أو الملاحظة التشغيلية" aria-label="سبب انتقال حالة الشريك" />
                    <div style={{ display: "flex", gap: 8 }}>
                      <CpButton disabled={detail.mutationState.kind === "loading" || (REASON_REQUIRED.has(transitionTarget) && !transitionReason.trim())} onClick={() => void confirmTransition()}>
                        {detail.mutationState.kind === "loading" ? "جاري الحفظ…" : "تأكيد القرار"}
                      </CpButton>
                      <CpButton onClick={() => setTransitionTarget(null)}>إلغاء</CpButton>
                    </div>
                  </>
                ) : null}
                {detail.mutationState.kind === "version_conflict" ? <CpStatePanel role="alert" title="تعارض الإصدار" code="أعد تحميل الملف قبل تكرار القرار." /> : null}
                {detail.mutationState.kind === "invalid_transition" ? <CpStatePanel role="alert" title="القرار محجوب" code={detail.mutationState.message} /> : null}
                {detail.mutationState.kind === "error" ? <CpStatePanel role="alert" title="تعذر تطبيق القرار" code={detail.mutationState.message} /> : null}
              </div>
            ))}
          </>
        ) : null}

        {tab === "documents" ? (
          documents.state.kind === "loading" || documents.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل الوثائق…" />
            : documents.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد وثائق مرفوعة." />
              : documents.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل الوثائق" code={documents.state.message} />
                : section("مراجعة الوثائق", (
                  <div style={{ display: "grid", gap: 12 }}>
                    <CpTable aria-label="وثائق الشريك">
                      <thead><tr><CpTableHeaderCell>النوع</CpTableHeaderCell><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>الإجراءات</CpTableHeaderCell></tr></thead>
                      <tbody>{documents.state.documents.map((document) => (
                        <tr key={document.id}>
                          <CpTableCell>{document.documentType}</CpTableCell>
                          <CpTableCell>{document.documentStatus}</CpTableCell>
                          <CpTableCell><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <CpButton disabled={document.documentStatus === "approved" || documents.actionState.kind === "loading"} onClick={() => void documents.review(document.id, { decision: "approved" }).then(() => readiness.reload())}>اعتماد</CpButton>
                            <CpButton onClick={() => { setDocumentDecision({ id: document.id, decision: "rejected" }); setDocumentReason(""); }}>رفض</CpButton>
                            <CpButton onClick={() => { setDocumentDecision({ id: document.id, decision: "needs_resubmit" }); setDocumentReason(""); }}>إعادة الرفع</CpButton>
                          </div></CpTableCell>
                        </tr>
                      ))}</tbody>
                    </CpTable>
                    {documentDecision ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <CpTextInput value={documentReason} onChange={setDocumentReason} placeholder="سبب القرار، خمسة أحرف على الأقل" aria-label="سبب قرار الوثيقة" />
                        <div style={{ display: "flex", gap: 8 }}>
                          <CpButton disabled={documentReason.trim().length < 5 || documents.actionState.kind === "loading"} onClick={() => void confirmDocumentReview()}>تأكيد</CpButton>
                          <CpButton onClick={() => setDocumentDecision(null)}>إلغاء</CpButton>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
        ) : null}

        {tab === "visits" ? (
          visits.state.kind === "loading" || visits.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل الزيارات…" />
            : visits.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد زيارات ميدانية." />
              : visits.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل الزيارات" code={visits.state.message} />
                : <CpTable aria-label="الزيارات الميدانية"><thead><tr><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>الفرع</CpTableHeaderCell><CpTableHeaderCell>الملاحظات</CpTableHeaderCell><CpTableHeaderCell>التاريخ</CpTableHeaderCell></tr></thead><tbody>{visits.state.visits.map((visit) => <tr key={visit.id}><CpTableCell>{visit.visitStatus}</CpTableCell><CpTableCell>{visit.storeId || "—"}</CpTableCell><CpTableCell>{visit.visitNotes || "—"}</CpTableCell><CpTableCell>{visit.submittedAt ? new Date(visit.submittedAt).toLocaleString("ar-SA") : "—"}</CpTableCell></tr>)}</tbody></CpTable>
        ) : null}

        {tab === "stores" ? (
          <div style={{ display: "grid", gap: 12 }}>
            {section("إسناد أو نقل ملكية متجر", (
              <div style={{ display: "grid", gap: 8 }}>
                <CpStatePanel role="status" title="النقل محكوم" code="المتجر المملوك يتطلب سببًا وإصدارًا حاليًا، ويُحجب تلقائيًا عن العميل حتى إعادة اعتماد جميع البوابات. العمليات المفتوحة تمنع النقل." />
                <CpTextInput value={storeId} onChange={setStoreId} placeholder="معرف المتجر" aria-label="معرف المتجر" />
                <CpTextInput value={storeReason} onChange={setStoreReason} placeholder="سبب الإسناد أو النقل" aria-label="سبب نقل ملكية المتجر" />
                <CpTextInput value={storeVersion} onChange={setStoreVersion} placeholder="إصدار المتجر الحالي عند النقل" aria-label="إصدار المتجر المتوقع" />
                <CpButton disabled={!storeId.trim() || stores.actionState.kind === "loading"} onClick={() => void confirmStoreOwnership()}>
                  {stores.actionState.kind === "loading" ? "جاري التنفيذ…" : "تنفيذ العملية المحكومة"}
                </CpButton>
                {stores.actionState.kind === "error" ? <CpStatePanel role="alert" title="تعذر تنفيذ ملكية المتجر" code={stores.actionState.message} /> : null}
              </div>
            ))}
            {stores.state.kind === "loading" || stores.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل الفروع…" />
              : stores.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد فروع مرتبطة." />
                : stores.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل الفروع" code={stores.state.message} />
                  : <><CpTable aria-label="فروع الشريك"><thead><tr><CpTableHeaderCell>الفرع</CpTableHeaderCell><CpTableHeaderCell>المدينة</CpTableHeaderCell><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>ظهور العميل</CpTableHeaderCell><CpTableHeaderCell>التسعير</CpTableHeaderCell></tr></thead><tbody>{stores.state.stores.map((store) => <tr key={store.id}><CpTableCell>{store.displayName}</CpTableCell><CpTableCell>{store.cityCode}</CpTableCell><CpTableCell>{store.status}</CpTableCell><CpTableCell>{store.isVisible ? "ظاهر" : "مخفي"}</CpTableCell><CpTableCell><CpButton onClick={() => setPricingStoreId((current) => current === store.id ? null : store.id)}>{pricingStoreId === store.id ? "إغلاق" : "إدارة التسعير"}</CpButton></CpTableCell></tr>)}</tbody></CpTable>{pricingStoreId ? <OperatorDeliveryPricingPanel storeId={pricingStoreId} /> : null}</>
            }
          </div>
        ) : null}

        {tab === "readiness" ? (
          readiness.state.kind === "loading" || readiness.state.kind === "idle" ? <CpStatePanel role="status" title="جاري حساب جاهزية الشريك وجميع الفروع…" />
            : readiness.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل الجاهزية" code={readiness.state.message}><CpRetryButton onClick={() => void readiness.reload()}>إعادة المحاولة</CpRetryButton></CpStatePanel>
              : aggregate ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {aggregate.storeSummary ? section("ملخص الفروع", <CpDescriptionList><CpDescriptionRow label="إجمالي الفروع">{aggregate.storeSummary.totalStores}</CpDescriptionRow><CpDescriptionRow label="جاهزة للنشر">{aggregate.storeSummary.readyStores}</CpDescriptionRow><CpDescriptionRow label="محجوبة">{aggregate.storeSummary.blockedStores}</CpDescriptionRow><CpDescriptionRow label="ظاهرة للعملاء">{aggregate.storeSummary.clientVisibleStores}</CpDescriptionRow></CpDescriptionList>) : null}
                  {section("جاهزية الشريك", <div style={{ display: "grid", gap: 8 }}>{aggregate.checklist.map((item) => <CpStatePanel key={item.id} role="status" title={`${item.satisfied ? "مستوفى" : "غير مستوفى"}: ${item.label}`} {...(item.blockedReason ? { code: item.blockedReason } : {})} />)}</div>)}
                  {aggregate.stores?.length ? section("جاهزية كل فرع", <CpTable aria-label="جاهزية الفروع"><thead><tr><CpTableHeaderCell>الفرع</CpTableHeaderCell><CpTableHeaderCell>النشر</CpTableHeaderCell><CpTableHeaderCell>الظهور</CpTableHeaderCell><CpTableHeaderCell>أسباب الحظر</CpTableHeaderCell></tr></thead><tbody>{aggregate.stores.map((store) => <tr key={store.storeId}><CpTableCell>{store.displayName}</CpTableCell><CpTableCell>{store.canPublishToClient ? "جاهز" : "محجوب"}</CpTableCell><CpTableCell>{store.isClientVisible ? "ظاهر" : "مخفي"}</CpTableCell><CpTableCell>{store.blockedReasonMessage || "—"}</CpTableCell></tr>)}</tbody></CpTable>) : null}
                </div>
              ) : null
        ) : null}

        {tab === "audit" ? (
          audit.state.kind === "loading" || audit.state.kind === "idle" ? <CpStatePanel role="status" title="جاري تحميل سجل التدقيق…" />
            : audit.state.kind === "empty" ? <CpStatePanel role="status" title="لا توجد أحداث." />
              : audit.state.kind === "error" ? <CpStatePanel role="alert" title="تعذر تحميل سجل التدقيق" code={audit.state.message} />
                : <div style={{ display: "grid", gap: 8 }}>{audit.state.events.map((event) => section(`${event.fromStatus || "حدث"} ← ${event.toStatus}`, <p style={{ margin: 0 }}>{event.actorSurface}{event.actorId ? ` • ${event.actorId}` : ""}{event.reason ? ` • ${event.reason}` : ""} • {new Date(event.createdAt).toLocaleString("ar-SA")}</p>))}</div>
        ) : null}
      </div>
    </DetailPageFrame>
  );
}
