"use client";

import { useState, useMemo } from "react";
import {
  CpButton,
  CpFilterBar,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpSearchInput,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
  CpSelectableTableRow,
  CpTextInput,
  CpDetailPanel,
  CpDescriptionList,
  CpDescriptionRow,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import { useIdentitySession, devBypassLogin } from "@bthwani/core-identity";
import {
  useOperatorTicketController,
  useSupportIncidentController,
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
  type SupportTicketTone,
} from "../../shared/support";

// ─── Inline badge ─────────────────────────────────────────────────────────────

function StatusBadge({ label, tone }: { label: string; tone: SupportTicketTone }) {
  const toneColors: Record<SupportTicketTone, { bg: string; color: string }> = {
    warning: { bg: "#FFF3CD", color: "#92400E" },
    success: { bg: "#D1FAE5", color: "#065F46" },
    danger:  { bg: "#FEE2E2", color: "#991B1B" },
    neutral: { bg: "#F1F5F9", color: "#475569" },
    info:    { bg: "#DBEAFE", color: "#1E40AF" },
  };
  const { bg, color } = toneColors[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function MainTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.625rem 1rem",
        background: active ? "#FF500D" : "transparent",
        color: active ? "#FFF" : "currentColor",
        border: active ? "none" : "1px solid color-mix(in srgb, currentColor 20%, transparent)",
        borderRadius: "0.5rem",
        fontWeight: active ? 700 : 500,
        fontSize: "0.813rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.25rem 0.75rem",
        background: active ? "#FF500D" : "transparent",
        color: active ? "#FFF" : "currentColor",
        border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
        borderRadius: "999px",
        fontSize: "0.775rem",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function SupportDashboardScreen() {
  const identity = useIdentitySession();

  const ticketCtrl = useOperatorTicketController(identity.state.kind);
  const incidentCtrl = useSupportIncidentController(identity.state.kind);

  const [mainTab, setMainTab] = useState<SupportMainTabId>("queues");
  const [queueFilter, setQueueFilter] = useState<SupportQueueFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>(undefined);
  const [replyBody, setReplyBody] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // ── KPI metrics ────────────────────────────────────────────────────────────
  const tickets = ticketCtrl.listState.kind === "success" ? ticketCtrl.listState.tickets : [];
  const incidents = incidentCtrl.listState.kind === "success" ? incidentCtrl.listState.incidents : [];

  const metrics = useMemo(
    () => buildSupportKpiMetrics(tickets, incidents),
    [tickets, incidents],
  );

  // ── Filtered tickets ───────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    const byFilter = filterTicketsByQueueFilter(tickets, queueFilter);
    return filterTicketsBySearch(byFilter, searchQuery).map(buildSupportTicketViewModel);
  }, [tickets, queueFilter, searchQuery]);

  const filteredIncidents = useMemo(
    () => incidents.map(buildSupportIncidentViewModel),
    [incidents],
  );

  const breadcrumb = buildSupportBreadcrumb(mainTab, queueFilter, filteredTickets.length);
  const selectedTicket = filteredTickets.find((t) => t.id === selectedTicketId);

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (identity.state.kind !== "authenticated") {
    return (
      <section
        dir="rtl"
        style={{
          maxWidth: "32rem",
          margin: "4rem auto",
          display: "grid",
          gap: "1rem",
          padding: "1.5rem",
          border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
          borderRadius: "1rem",
          background: "Canvas",
        }}
      >
        <div>
          <h2 style={{ margin: 0, textAlign: "right" }}>دعم DSH</h2>
          <p style={{ opacity: 0.7, textAlign: "right" }}>
            يتطلب حساب operator مصرح به.
          </p>
        </div>
        <CpTextInput value={username} onChange={setUsername} placeholder="اسم المستخدم" aria-label="اسم المستخدم" />
        <CpTextInput value={password} onChange={setPassword} placeholder="كلمة المرور" type="password" aria-label="كلمة المرور" />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <CpButton
            disabled={username.trim().length === 0 || password.length < 4 || identity.state.kind === "authenticating"}
            onClick={() => void identity.login(username.trim(), password)}
            style={{ flex: 1 }}
          >
            {identity.state.kind === "authenticating" ? "جاري التحقق…" : "تسجيل الدخول"}
          </CpButton>
          <CpButton onClick={() => devBypassLogin("operator")} style={{ flex: 1 }}>
            تجاوز (مطور)
          </CpButton>
        </div>
        {identity.state.kind === "error" && (
          <p role="alert" style={{ color: "#DC2626", textAlign: "right" }}>{identity.state.message}</p>
        )}
      </section>
    );
  }

  const isLoadingTickets = ticketCtrl.listState.kind === "loading";
  const isLoadingIncidents = incidentCtrl.listState.kind === "loading";
  const isLoading = isLoadingTickets || isLoadingIncidents;

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="دعم DSH">
          <p style={{ margin: "0 0 0.75rem", opacity: 0.65, fontSize: "0.875rem" }}>
            صفوف دعم، نزاعات، تصعيد، وخطر الالتزام
          </p>

          {/* ── KPI Strip ─────────────────────────────────────────────── */}
          <CpKpiStrip>
            <CpKpiCard label="صفوف مقترحة"  value={metrics.suggestedQueues} />
            <CpKpiCard label="نزاعات"        value={metrics.disputes}        />
            <CpKpiCard label="خطر الالتزام" value={metrics.complianceRisk}  />
          </CpKpiStrip>
        </CpPageHeader>
      }
      stateView={
        isLoading ? <CpStatePanel role="status" title="جاري تحميل صفوف الدعم…" /> : undefined
      }
    >
      {/* ── Main Tabs ──────────────────────────────────────────────────────── */}
      <CpFilterBar label="تبويبات الدعم الرئيسية">
        {SUPPORT_MAIN_TABS.map((t) => (
          <MainTabButton
            key={t.id}
            active={mainTab === t.id}
            onClick={() => setMainTab(t.id)}
          >
            {t.label}
          </MainTabButton>
        ))}
      </CpFilterBar>

      {/* ── Queue Sub-filters ────────────────────────────────────────────────── */}
      {mainTab === "queues" && (
        <CpFilterBar label="فلاتر الصفوف">
          {SUPPORT_QUEUE_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={queueFilter === f.id}
              onClick={() => setQueueFilter(f.id)}
            >
              {f.label}
            </FilterChip>
          ))}
        </CpFilterBar>
      )}

      {/* ── Ownership Block ──────────────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          padding: "0.75rem 1rem",
          background: "color-mix(in srgb, currentColor 4%, transparent)",
          borderRadius: "0.75rem",
          marginBottom: "0.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        <div>
          <strong style={{ fontSize: "0.875rem" }}>ملكية قسم الدعم</strong>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.7, lineHeight: 1.5 }}>
            {SUPPORT_OWNERSHIP.policyNote}
          </p>
          <code style={{ fontSize: "0.7rem", opacity: 0.55, fontFamily: "monospace", wordBreak: "break-all" }}>
            {SUPPORT_OWNERSHIP.ownerPath}
          </code>
        </div>
        <div>
          <strong style={{ fontSize: "0.875rem" }}>الصف المحدد</strong>
          {selectedTicket ? (
            <CpDescriptionList>
              <CpDescriptionRow label="الموضوع">{selectedTicket.subject}</CpDescriptionRow>
              <CpDescriptionRow label="التصنيف">{selectedTicket.category}</CpDescriptionRow>
              <CpDescriptionRow label="الحالة">
                <StatusBadge label={selectedTicket.statusLabel} tone={selectedTicket.statusTone} />
              </CpDescriptionRow>
            </CpDescriptionList>
          ) : (
            <p style={{ fontSize: "0.75rem", opacity: 0.55, margin: "0.25rem 0 0" }}>
              التصنيف: دعم · السياسة: — · السند: غير محدد
            </p>
          )}
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────────── */}
      <CpFilterBar label="بحث وأدوات">
        <CpSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="بحث بالموضوع أو المتجر أو الرقم…"
          wide
          aria-label="بحث في صفوف الدعم"
        />
        <CpButton
          onClick={() => { void ticketCtrl.reload(); void incidentCtrl.reload(); }}
          style={{ whiteSpace: "nowrap" }}
        >
          تحديث
        </CpButton>
      </CpFilterBar>

      {/* ── Breadcrumb ─────────────────────────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{ padding: "0.25rem 1rem", fontSize: "0.75rem", opacity: 0.55 }}
        aria-label="مسار التنقل"
      >
        {breadcrumb}
      </div>

      {/* ─────────────────────── QUEUES TAB ────────────────────────────────── */}
      {mainTab === "queues" && (
        <>
          {ticketCtrl.listState.kind === "error" && (
            <CpStatePanel
              role="alert"
              title="تعذر تحميل التذاكر"
              description={ticketCtrl.listState.message}
            />
          )}

          {ticketCtrl.listState.kind === "empty" && (
            <CpStatePanel
              role="status"
              title="صفوف الدعم"
              description="لا توجد عناصر في هذا الفلتر، اختر فلتراً آخر أو تحقق لاحقًا."
            />
          )}

          {ticketCtrl.listState.kind === "success" && (
            <div style={{ display: "grid", gridTemplateColumns: selectedTicket ? "1fr 24rem" : "1fr", gap: "1rem" }}>
              {/* Table */}
              <CpTable aria-label="جدول تذاكر الدعم">
                <thead>
                  <tr dir="rtl">
                    <CpTableHeaderCell>الموضوع</CpTableHeaderCell>
                    <CpTableHeaderCell>التصنيف</CpTableHeaderCell>
                    <CpTableHeaderCell>الأولوية</CpTableHeaderCell>
                    <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                    <CpTableHeaderCell>المتجر</CpTableHeaderCell>
                    <CpTableHeaderCell>المُسند إليه</CpTableHeaderCell>
                  </tr>
                </thead>
                <tbody dir="rtl">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "2rem", textAlign: "center", opacity: 0.5, fontSize: "0.875rem" }}>
                        لا توجد تذاكر مطابقة للفلتر.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((vm) => (
                      <CpSelectableTableRow
                        key={vm.id}
                        selected={selectedTicketId === vm.id}
                        onClick={() => setSelectedTicketId((prev) => prev === vm.id ? undefined : vm.id)}
                      >
                        <CpTableCell>
                          <span style={{ fontWeight: vm.isUrgent ? 700 : 400, fontSize: "0.875rem" }}>{vm.subject}</span>
                        </CpTableCell>
                        <CpTableCell style={{ fontSize: "0.813rem", opacity: 0.7 }}>{vm.category}</CpTableCell>
                        <CpTableCell><StatusBadge label={vm.priorityLabel} tone={vm.priorityTone} /></CpTableCell>
                        <CpTableCell><StatusBadge label={vm.statusLabel} tone={vm.statusTone} /></CpTableCell>
                        <CpTableCell style={{ fontSize: "0.813rem", opacity: 0.7 }}>{vm.storeId}</CpTableCell>
                        <CpTableCell style={{ fontSize: "0.813rem", opacity: 0.7 }}>{vm.assignedTo}</CpTableCell>
                      </CpSelectableTableRow>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", opacity: 0.5, borderTop: "1px solid color-mix(in srgb, currentColor 10%, transparent)", direction: "rtl" }}>
                      السابق | صفحة 1 من 1 | التالي &nbsp;·&nbsp; {filteredTickets.length} سجل
                    </td>
                  </tr>
                </tfoot>
              </CpTable>

              {/* Detail Panel */}
              {selectedTicket && (
                <CpDetailPanel
                  title={`تفاصيل: ${selectedTicket.id.slice(0, 8)}…`}
                  onClose={() => setSelectedTicketId(undefined)}
                >
                  <CpDescriptionList>
                    <CpDescriptionRow label="الموضوع">{selectedTicket.subject}</CpDescriptionRow>
                    <CpDescriptionRow label="التصنيف">{selectedTicket.category}</CpDescriptionRow>
                    <CpDescriptionRow label="الأولوية">
                      <StatusBadge label={selectedTicket.priorityLabel} tone={selectedTicket.priorityTone} />
                    </CpDescriptionRow>
                    <CpDescriptionRow label="الحالة">
                      <StatusBadge label={selectedTicket.statusLabel} tone={selectedTicket.statusTone} />
                    </CpDescriptionRow>
                    <CpDescriptionRow label="المُسند إليه">{selectedTicket.assignedTo}</CpDescriptionRow>
                    <CpDescriptionRow label="المالك">{SUPPORT_OWNERSHIP.owner}</CpDescriptionRow>
                  </CpDescriptionList>

                  <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <CpTextInput
                      value={replyBody}
                      onChange={setReplyBody}
                      placeholder="الرد على التذكرة…"
                      aria-label="رد التذكرة"
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <CpButton
                        disabled={replyBody.trim().length < 3 || ticketCtrl.actionState.kind === "submitting"}
                        onClick={() => {
                          void ticketCtrl.operatorUpdateTicket(selectedTicket.id, { status: "in_review" });
                          setReplyBody("");
                        }}
                        style={{ flex: 1 }}
                      >
                        فتح التذكرة
                      </CpButton>
                      <CpButton
                        disabled={ticketCtrl.actionState.kind === "submitting"}
                        onClick={() => void ticketCtrl.operatorUpdateTicket(selectedTicket.id, { status: "resolved" })}
                        style={{
                          flex: 1,
                          background: "#D1FAE5",
                          color: "#065F46",
                          border: "1px solid #6EE7B7",
                          borderRadius: "0.5rem",
                        }}
                      >
                        فتح الإجابة عند الطلب
                      </CpButton>
                    </div>
                    {ticketCtrl.actionState.kind === "error" && (
                      <p role="alert" style={{ color: "#DC2626", fontSize: "0.8rem" }}>
                        {ticketCtrl.actionState.message}
                      </p>
                    )}
                  </div>
                </CpDetailPanel>
              )}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────── ESCALATION TAB ────────────────────────────── */}
      {mainTab === "escalation" && (
        <>
          {incidentCtrl.listState.kind === "error" && (
            <CpStatePanel role="alert" title="تعذر تحميل الحوادث" description={incidentCtrl.listState.message} />
          )}
          {incidentCtrl.listState.kind === "success" && (
            <CpTable aria-label="جدول الحوادث">
              <thead>
                <tr dir="rtl">
                  <CpTableHeaderCell>العنوان</CpTableHeaderCell>
                  <CpTableHeaderCell>الخطورة</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>النطاق المتأثر</CpTableHeaderCell>
                  <CpTableHeaderCell>رافع البلاغ</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody dir="rtl">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "2rem", textAlign: "center", opacity: 0.5, fontSize: "0.875rem" }}>
                      لا توجد حوادث.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((vm) => (
                    <CpSelectableTableRow key={vm.id} selected={false} onClick={() => {}}>
                      <CpTableCell>
                        <span style={{ fontWeight: vm.isCritical ? 700 : 400, fontSize: "0.875rem" }}>{vm.title}</span>
                      </CpTableCell>
                      <CpTableCell><StatusBadge label={vm.severityLabel} tone={vm.severityTone} /></CpTableCell>
                      <CpTableCell style={{ fontSize: "0.813rem", opacity: 0.7 }}>{vm.statusLabel}</CpTableCell>
                      <CpTableCell style={{ fontSize: "0.813rem", opacity: 0.7 }}>{vm.affectedScopeLabel}</CpTableCell>
                      <CpTableCell style={{ fontSize: "0.813rem", opacity: 0.7 }}>{vm.raisedBy}</CpTableCell>
                    </CpSelectableTableRow>
                  ))
                )}
              </tbody>
            </CpTable>
          )}
        </>
      )}

      {/* ── Other Tabs placeholder ─────────────────────────────────────────── */}
      {mainTab !== "queues" && mainTab !== "escalation" && (
        <CpStatePanel
          role="status"
          title={SUPPORT_MAIN_TABS.find((t) => t.id === mainTab)?.label ?? ""}
          description="هذا القسم قيد التطوير ضمن المنظومة."
        />
      )}

      {/* ── Status Footer (ownership bar) ────────────────────────────────────── */}
      <div
        dir="rtl"
        style={{
          display: "flex",
          gap: "1.5rem",
          padding: "0.5rem 1rem",
          fontSize: "0.75rem",
          opacity: 0.6,
          borderTop: "1px solid color-mix(in srgb, currentColor 10%, transparent)",
          marginTop: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span>المالك: <strong>{SUPPORT_OWNERSHIP.owner}</strong></span>
        <span>رقلتق: 1/2</span>
        <span>الخدمات المشتركة: —</span>
        <span style={{ marginInlineStart: "auto", color: "#065F46", fontWeight: 600 }}>جاهز</span>
      </div>
    </DataTablePageFrame>
  );
}
