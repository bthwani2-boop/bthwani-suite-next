"use client";

import { useMemo, useState } from "react";
import {
  CpBadge,
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpMutedInline,
  CpPageHeader,
  CpSearchInput,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpSelectableTableRow,
  CpTabs,
  CpTextInput,
  CpDetailPanel,
  CpDescriptionList,
  CpDescriptionRow,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  useOperatorTicketController,
  useSupportIncidentController,
  useTicketDetailController,
  SUPPORT_MAIN_TABS,
  SUPPORT_QUEUE_FILTERS,
  SUPPORT_OWNERSHIP,
  buildSupportKpiMetrics,
  buildSupportTicketViewModel,
  buildSupportIncidentViewModel,
  buildSupportBreadcrumb,
  filterTicketsByQueueFilter,
  filterTicketsBySearch,
  type SupportMainTabId,
  type SupportQueueFilterId,
  type DshSupportTicketEvent,
} from "../../shared/support";
import {
  ClientProfileWorkspace,
  CallReceptionWorkspace,
  ComplianceRiskWorkspace,
  MessagesWorkspace,
} from "./SupportWorkspaces";

function formatEvent(event: DshSupportTicketEvent): string {
  const labels: Record<DshSupportTicketEvent["eventType"], string> = {
    created: "إنشاء التذكرة",
    message_added: "إضافة رسالة",
    status_changed: "تغيير الحالة",
    escalated: "تصعيد",
    closed: "إغلاق",
  };
  const date = new Date(event.createdAt);
  const timestamp = Number.isNaN(date.getTime()) ? event.createdAt : date.toLocaleString("ar");
  return `${labels[event.eventType]} · ${event.actorRole} · ${timestamp}`;
}

export function SupportDashboardScreen() {
  const ticketCtrl = useOperatorTicketController("authenticated");
  const incidentCtrl = useSupportIncidentController("authenticated");
  const [mainTab, setMainTab] = useState<SupportMainTabId>("queues");
  const [queueFilter, setQueueFilter] = useState<SupportQueueFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [replyBody, setReplyBody] = useState("");
  const [internalReply, setInternalReply] = useState(false);

  const detailCtrl = useTicketDetailController(selectedTicketId ?? "", "authenticated", "operator");
  const tickets = ticketCtrl.listState.kind === "success" ? ticketCtrl.listState.tickets : [];
  const incidents = incidentCtrl.listState.kind === "success" ? incidentCtrl.listState.incidents : [];
  const metrics = useMemo(() => buildSupportKpiMetrics(tickets, incidents), [tickets, incidents]);
  const filteredTickets = useMemo(() => {
    const byFilter = filterTicketsByQueueFilter(tickets, queueFilter);
    return filterTicketsBySearch(byFilter, searchQuery).map(buildSupportTicketViewModel);
  }, [queueFilter, searchQuery, tickets]);
  const filteredIncidents = useMemo(() => incidents.map(buildSupportIncidentViewModel), [incidents]);
  const selectedTicketRaw = tickets.find((ticket) => ticket.id === selectedTicketId);
  const selectedTicket = selectedTicketRaw ? buildSupportTicketViewModel(selectedTicketRaw) : undefined;
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId);
  const breadcrumb = buildSupportBreadcrumb(mainTab, queueFilter, filteredTickets.length);
  const isLoading = ticketCtrl.listState.kind === "loading" || incidentCtrl.listState.kind === "loading";
  const hasRuntimeError = ticketCtrl.listState.kind === "error" || incidentCtrl.listState.kind === "error";

  const sendReply = async () => {
    if (!selectedTicketRaw || replyBody.trim().length < 1) return;
    const sent = await detailCtrl.sendMessage({ body: replyBody.trim(), isInternal: internalReply });
    if (!sent) return;
    setReplyBody("");
    const targetStatus = selectedTicketRaw.status === "open" ? "in_review" : selectedTicketRaw.status;
    if (targetStatus !== selectedTicketRaw.status) {
      await ticketCtrl.operatorUpdateTicket(selectedTicketRaw.id, {
        expectedStatus: selectedTicketRaw.status,
        status: targetStatus,
      });
    }
  };

  const resolveSelectedTicket = async () => {
    if (!selectedTicketRaw) return;
    await ticketCtrl.operatorUpdateTicket(selectedTicketRaw.id, {
      expectedStatus: selectedTicketRaw.status,
      status: "resolved",
    });
    await detailCtrl.reloadDetail();
    await detailCtrl.reloadEvents();
  };

  const resolveSelectedIncident = async () => {
    if (!selectedIncident) return;
    await incidentCtrl.resolveIncident(selectedIncident.id, { status: "resolved" });
  };

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="دعم DSH">
          <CpMutedInline tight>
            تذاكر العميل والشريك، المحادثات، الحوادث، وسجل التدقيق من Runtime الفعلي.
          </CpMutedInline>
          <CpKpiStrip>
            <CpKpiCard label="صفوف مقترحة" value={metrics.suggestedQueues} />
            <CpKpiCard label="نزاعات" value={metrics.disputes} />
            <CpKpiCard label="خطر الالتزام" value={metrics.complianceRisk} />
          </CpKpiStrip>
        </CpPageHeader>
      }
      stateView={isLoading ? <CpStatePanel role="status" title="جاري تحميل دعم DSH…" /> : undefined}
    >
      <CpTabs
        items={SUPPORT_MAIN_TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
        value={mainTab}
        onChange={(value) => setMainTab(value as SupportMainTabId)}
        aria-label="تبويبات الدعم الرئيسية"
      />

      {mainTab === "queues" ? (
        <CpTabs
          items={SUPPORT_QUEUE_FILTERS.map((filter) => ({ value: filter.id, label: filter.label }))}
          value={queueFilter}
          onChange={(value) => setQueueFilter(value as SupportQueueFilterId)}
          aria-label="فلاتر الصفوف"
        />
      ) : null}

      <CpFilterBar label="بحث وأدوات">
        <CpSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث بالموضوع أو المتجر أو الرقم…"
          wide
          aria-label="بحث في صفوف الدعم"
        />
        <CpButton onClick={() => { void ticketCtrl.reload(); void incidentCtrl.reload(); }}>
          تحديث
        </CpButton>
      </CpFilterBar>

      <div dir="rtl" style={{ padding: "0.25rem 1rem" }}>
        <CpMutedInline tight>{breadcrumb}</CpMutedInline>
      </div>

      {mainTab === "queues" ? (
        <>
          {ticketCtrl.listState.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل التذاكر" description={ticketCtrl.listState.message} />
          ) : null}
          {ticketCtrl.listState.kind === "empty" ? (
            <CpStatePanel role="status" title="صفوف الدعم" description="لا توجد تذاكر في هذا الفلتر." />
          ) : null}
          {ticketCtrl.listState.kind === "success" ? (
            <div style={{ display: "grid", gridTemplateColumns: selectedTicket ? "1fr 28rem" : "1fr", gap: "1rem" }}>
              <CpTable aria-label="جدول تذاكر الدعم">
                <thead>
                  <tr dir="rtl">
                    <CpTableHeaderCell>الموضوع</CpTableHeaderCell>
                    <CpTableHeaderCell>الجهة</CpTableHeaderCell>
                    <CpTableHeaderCell>التصنيف</CpTableHeaderCell>
                    <CpTableHeaderCell>الأولوية</CpTableHeaderCell>
                    <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                    <CpTableHeaderCell>المتجر</CpTableHeaderCell>
                  </tr>
                </thead>
                <tbody dir="rtl">
                  {filteredTickets.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>لا توجد نتائج.</td></tr>
                  ) : filteredTickets.map((ticket) => {
                    const raw = tickets.find((item) => item.id === ticket.id);
                    return (
                      <CpSelectableTableRow
                        key={ticket.id}
                        selected={selectedTicketId === ticket.id}
                        onClick={() => setSelectedTicketId((current) => current === ticket.id ? undefined : ticket.id)}
                      >
                        <CpTableCell>{ticket.subject}</CpTableCell>
                        <CpTableCell>{raw?.reporterRole ?? "—"}</CpTableCell>
                        <CpTableCell>{ticket.category}</CpTableCell>
                        <CpTableCell><CpBadge tone={ticket.priorityTone}>{ticket.priorityLabel}</CpBadge></CpTableCell>
                        <CpTableCell><CpBadge tone={ticket.statusTone}>{ticket.statusLabel}</CpBadge></CpTableCell>
                        <CpTableCell>{ticket.storeId || "—"}</CpTableCell>
                      </CpSelectableTableRow>
                    );
                  })}
                </tbody>
              </CpTable>

              {selectedTicket && selectedTicketRaw ? (
                <CpDetailPanel title={`تفاصيل: ${selectedTicket.id.slice(0, 8)}…`} onClose={() => setSelectedTicketId(undefined)}>
                  <CpDescriptionList>
                    <CpDescriptionRow label="الموضوع">{selectedTicket.subject}</CpDescriptionRow>
                    <CpDescriptionRow label="الجهة">{selectedTicketRaw.reporterRole}</CpDescriptionRow>
                    <CpDescriptionRow label="الحالة"><CpBadge tone={selectedTicket.statusTone}>{selectedTicket.statusLabel}</CpBadge></CpDescriptionRow>
                    <CpDescriptionRow label="الطلب">{selectedTicketRaw.orderId || "—"}</CpDescriptionRow>
                    <CpDescriptionRow label="المُسند إليه">{selectedTicket.assignedTo || "غير مسند"}</CpDescriptionRow>
                  </CpDescriptionList>

                  <section style={{ marginTop: "1rem" }}>
                    <strong>المحادثة</strong>
                    {detailCtrl.messageListState.kind === "loading" ? <p>جارٍ التحميل…</p> : null}
                    {detailCtrl.messageListState.kind === "error" ? <p role="alert">{detailCtrl.messageListState.message}</p> : null}
                    {detailCtrl.messageListState.kind === "success" ? (
                      <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {detailCtrl.messageListState.messages.length === 0 ? <p style={{ opacity: 0.6 }}>لا توجد رسائل.</p> : null}
                        {detailCtrl.messageListState.messages.map((message) => (
                          <div key={message.id} style={{ padding: "0.6rem", border: "1px solid color-mix(in srgb, currentColor 12%, transparent)", borderRadius: "0.5rem" }}>
                            <div>{message.body}</div>
                            <small style={{ opacity: 0.6 }}>{message.senderRole}{message.isInternal ? " · داخلي" : ""}</small>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <section style={{ marginTop: "1rem" }}>
                    <strong>سجل التدقيق</strong>
                    {detailCtrl.eventState.kind === "loading" ? <p>جارٍ التحميل…</p> : null}
                    {detailCtrl.eventState.kind === "error" ? <p role="alert">{detailCtrl.eventState.message}</p> : null}
                    {detailCtrl.eventState.kind === "success" ? (
                      <ul>
                        {detailCtrl.eventState.events.map((event) => <li key={event.id}>{formatEvent(event)}</li>)}
                      </ul>
                    ) : null}
                  </section>

                  <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
                    <CpTextInput value={replyBody} onChange={setReplyBody} placeholder="الرد على التذكرة…" aria-label="رد التذكرة" />
                    <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input type="checkbox" checked={internalReply} onChange={(event) => setInternalReply(event.target.checked)} />
                      ملاحظة داخلية لا تظهر لصاحب التذكرة
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <CpButton
                        disabled={replyBody.trim().length < 1 || detailCtrl.messageActionState.kind === "submitting"}
                        onClick={() => void sendReply()}
                        style={{ flex: 1 }}
                      >
                        إرسال الرد
                      </CpButton>
                      <CpButton
                        disabled={selectedTicketRaw.status === "resolved" || selectedTicketRaw.status === "closed" || ticketCtrl.actionState.kind === "submitting"}
                        onClick={() => void resolveSelectedTicket()}
                        style={{ flex: 1 }}
                      >
                        حل التذكرة
                      </CpButton>
                    </div>
                    {detailCtrl.messageActionState.kind === "error" ? <p role="alert">{detailCtrl.messageActionState.message}</p> : null}
                    {ticketCtrl.actionState.kind === "error" ? <p role="alert">{ticketCtrl.actionState.message}</p> : null}
                  </div>
                </CpDetailPanel>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {mainTab === "escalation" ? (
        <>
          {incidentCtrl.listState.kind === "error" ? (
            <CpStatePanel role="alert" title="تعذر تحميل الحوادث" description={incidentCtrl.listState.message} />
          ) : null}
          {incidentCtrl.listState.kind === "success" ? (
            <div style={{ display: "grid", gridTemplateColumns: selectedIncident ? "1fr 24rem" : "1fr", gap: "1rem" }}>
              <CpTable aria-label="جدول الحوادث">
                <thead><tr dir="rtl"><CpTableHeaderCell>العنوان</CpTableHeaderCell><CpTableHeaderCell>الخطورة</CpTableHeaderCell><CpTableHeaderCell>الحالة</CpTableHeaderCell><CpTableHeaderCell>النطاق</CpTableHeaderCell></tr></thead>
                <tbody dir="rtl">
                  {filteredIncidents.map((incident) => (
                    <CpSelectableTableRow key={incident.id} selected={selectedIncidentId === incident.id} onClick={() => setSelectedIncidentId(incident.id)}>
                      <CpTableCell>{incident.title}</CpTableCell>
                      <CpTableCell><CpBadge tone={incident.severityTone}>{incident.severityLabel}</CpBadge></CpTableCell>
                      <CpTableCell>{incident.statusLabel}</CpTableCell>
                      <CpTableCell>{incident.affectedScopeLabel}</CpTableCell>
                    </CpSelectableTableRow>
                  ))}
                </tbody>
              </CpTable>
              {selectedIncident ? (
                <CpDetailPanel title={selectedIncident.title} onClose={() => setSelectedIncidentId(undefined)}>
                  <p>{selectedIncident.description}</p>
                  <CpButton disabled={selectedIncident.status === "resolved" || incidentCtrl.actionState.kind === "submitting"} onClick={() => void resolveSelectedIncident()}>
                    تعليم الحادث كمحلول
                  </CpButton>
                  {incidentCtrl.actionState.kind === "error" ? <p role="alert">{incidentCtrl.actionState.message}</p> : null}
                </CpDetailPanel>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {mainTab === "client-profile" ? <ClientProfileWorkspace /> : null}
      {mainTab === "call-reception" ? <CallReceptionWorkspace /> : null}
      {mainTab === "compliance-risk" ? <ComplianceRiskWorkspace /> : null}
      {mainTab === "messages" ? <MessagesWorkspace /> : null}

      <div
        dir="rtl"
        style={{
          display: "flex",
          gap: "1.5rem",
          padding: "0.5rem 1rem",
          fontSize: "0.75rem",
          opacity: 0.7,
          borderTop: "1px solid color-mix(in srgb, currentColor 10%, transparent)",
          marginTop: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span>المالك: <strong>{SUPPORT_OWNERSHIP.owner}</strong></span>
        <span>المصدر: DSH Runtime</span>
        <span style={{ marginInlineStart: "auto", fontWeight: 600 }}>
          {hasRuntimeError ? "توجد أخطاء تحميل" : isLoading ? "جارٍ التحقق" : "تم تحميل الحالة الحالية"}
        </span>
      </div>
    </DataTablePageFrame>
  );
}
