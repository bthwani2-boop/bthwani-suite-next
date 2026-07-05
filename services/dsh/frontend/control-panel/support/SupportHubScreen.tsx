import React from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Box,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import {
  useOperatorTicketController,
  useSupportIncidentController,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_SCOPE_LABELS,
  type DshIncidentSeverity,
  type DshIncidentScope,
} from "../../shared/support";

export function SupportHubScreen() {
  const identity = useIdentitySession();
  const { listState: ticketList, actionState: ticketAction, reload: reloadTickets, operatorUpdateTicket, resetAction: resetTicketAction } =
    useOperatorTicketController(identity.state.kind);
  const { listState: incidentList, actionState: incidentAction, reload: reloadIncidents, raiseIncident, resolveIncident } =
    useSupportIncidentController(identity.state.kind);

  const [activeTab, setActiveTab] = React.useState<"tickets" | "incidents">("tickets");
  const [showIncidentForm, setShowIncidentForm] = React.useState(false);
  const [incidentTitle, setIncidentTitle] = React.useState("");
  const [incidentDesc, setIncidentDesc] = React.useState("");
  const [incidentSeverity, setIncidentSeverity] = React.useState<DshIncidentSeverity>("medium");
  const [incidentScope, setIncidentScope] = React.useState<DshIncidentScope>("unknown");

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

  const SEVERITIES: DshIncidentSeverity[] = ["low", "medium", "high", "critical"];
  const SCOPES: DshIncidentScope[] = ["delivery", "stores", "payments", "platform", "unknown"];

  function handleCreateIncident() {
    void raiseIncident({ title: incidentTitle.trim(), description: incidentDesc.trim(), severity: incidentSeverity, affectedScope: incidentScope }).then(() => {
      setShowIncidentForm(false);
      setIncidentTitle("");
      setIncidentDesc("");
    });
  }

  return (
    <ScrollScreen>
      <Header title="مركز الدعم والحوادث" subtitle="إدارة تذاكر الدعم والحوادث التشغيلية" />

      <Card>
        <Box style={styles.tabs}>
          <Button label="التذاكر" tone={activeTab === "tickets" ? "primary" : "ghost"} onPress={() => setActiveTab("tickets")} />
          <Button label="الحوادث" tone={activeTab === "incidents" ? "primary" : "ghost"} onPress={() => setActiveTab("incidents")} />
        </Box>
      </Card>

      {activeTab === "tickets" && (
        <>
          {ticketAction.kind === "error" && (
            <Card><Box style={styles.notice}><Text tone="danger">{ticketAction.message}</Text><Button label="إغلاق" tone="ghost" onPress={resetTicketAction} /></Box></Card>
          )}
          {ticketList.kind === "loading" && <StateView title="جاري تحميل التذاكر…" />}
          {ticketList.kind === "empty" && <StateView title="لا توجد تذاكر" description="لا توجد تذاكر بالفلتر الحالي." />}
          {ticketList.kind === "error" && <StateView title="تعذر التحميل" description={ticketList.message} actionLabel="إعادة المحاولة" onActionPress={() => void reloadTickets()} />}
          {ticketList.kind === "success" &&
            ticketList.tickets.map((t) => (
              <Card key={t.id}>
                <Box style={styles.ticketRow}>
                  <Box style={styles.ticketInfo}>
                    <Text role="titleSm">{t.subject}</Text>
                    <Text role="caption" tone="muted">{t.reporterRole} · {t.createdAt}</Text>
                  </Box>
                  <Box style={styles.badgeGroup}>
                    <Badge label={TICKET_PRIORITY_LABELS[t.priority]} tone={t.priority === "urgent" ? "danger" : t.priority === "high" ? "warning" : "neutral"} />
                    <Badge label={TICKET_STATUS_LABELS[t.status]} tone={t.status === "resolved" || t.status === "closed" ? "success" : "info"} />
                  </Box>
                </Box>
                {t.status !== "resolved" && t.status !== "closed" && (
                  <Box style={styles.ticketActions}>
                    <Button label="حل" tone="success" disabled={ticketAction.kind === "submitting"} onPress={() => void operatorUpdateTicket(t.id, { status: "resolved" })} />
                    <Button label="قيد المراجعة" tone="secondary" disabled={ticketAction.kind === "submitting"} onPress={() => void operatorUpdateTicket(t.id, { status: "in_review" })} />
                  </Box>
                )}
              </Card>
            ))}
        </>
      )}

      {activeTab === "incidents" && (
        <>
          <Card>
            <Box style={styles.incidentHeader}>
              <Text role="titleSm">الحوادث التشغيلية</Text>
              <Button label="حادثة جديدة" tone="danger" onPress={() => setShowIncidentForm(!showIncidentForm)} />
            </Box>
          </Card>

          {showIncidentForm && (
            <Card>
              <Box style={styles.form}>
                <Text role="titleSm">الخطورة</Text>
                <Box style={styles.chips}>{SEVERITIES.map((s) => (<Button key={s} label={INCIDENT_SEVERITY_LABELS[s]} tone={incidentSeverity === s ? "primary" : "ghost"} onPress={() => setIncidentSeverity(s)} />))}</Box>
                <Text role="titleSm">النطاق المتأثر</Text>
                <Box style={styles.chips}>{SCOPES.map((sc) => (<Button key={sc} label={INCIDENT_SCOPE_LABELS[sc]} tone={incidentScope === sc ? "primary" : "ghost"} onPress={() => setIncidentScope(sc)} />))}</Box>
                <TextField label="عنوان الحادثة" value={incidentTitle} onChangeText={setIncidentTitle} placeholder="وصف مختصر" />
                <TextField label="التفاصيل" value={incidentDesc} onChangeText={setIncidentDesc} placeholder="ما الذي حدث؟" multiline />
                {incidentAction.kind === "error" && <Text tone="danger">{incidentAction.message}</Text>}
                <Box style={styles.formActions}>
                  <Button label={incidentAction.kind === "submitting" ? "جاري…" : "رفع الحادثة"} tone="danger" disabled={incidentTitle.trim().length < 3 || incidentAction.kind === "submitting"} onPress={handleCreateIncident} />
                  <Button label="إلغاء" tone="ghost" onPress={() => setShowIncidentForm(false)} />
                </Box>
              </Box>
            </Card>
          )}

          {incidentList.kind === "loading" && <StateView title="جاري تحميل الحوادث…" />}
          {incidentList.kind === "empty" && <StateView title="لا توجد حوادث" description="لا توجد حوادث مفتوحة حالياً." />}
          {incidentList.kind === "success" &&
            incidentList.incidents.map((i) => (
              <Card key={i.id}>
                <Box style={styles.ticketRow}>
                  <Box style={styles.ticketInfo}>
                    <Text role="titleSm">{i.title}</Text>
                    <Text role="caption" tone="muted">{INCIDENT_SCOPE_LABELS[i.affectedScope]} · {i.createdAt}</Text>
                  </Box>
                  <Box style={styles.badgeGroup}>
                    <Badge label={INCIDENT_SEVERITY_LABELS[i.severity]} tone={i.severity === "critical" ? "danger" : i.severity === "high" ? "warning" : "neutral"} />
                    <Badge label={INCIDENT_STATUS_LABELS[i.status]} tone={i.status === "resolved" ? "success" : i.status === "monitoring" ? "info" : "warning"} />
                  </Box>
                </Box>
                {i.status !== "resolved" && (
                  <Box style={styles.ticketActions}>
                    <Button label="تم الحل" tone="success" disabled={incidentAction.kind === "submitting"} onPress={() => void resolveIncident(i.id, { status: "resolved" })} />
                    <Button label="قيد المراقبة" tone="secondary" disabled={incidentAction.kind === "submitting"} onPress={() => void resolveIncident(i.id, { status: "monitoring" })} />
                  </Box>
                )}
              </Card>
            ))}
        </>
      )}
    </ScrollScreen>
  );
}

const styles = {
  tabs: { flexDirection: "row-reverse", gap: spacing[2], padding: spacing[3] },
  notice: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  ticketRow: { flexDirection: "row-reverse", justifyContent: "space-between", padding: spacing[3] },
  ticketInfo: { flex: 1, gap: spacing[1] },
  badgeGroup: { flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" },
  ticketActions: { flexDirection: "row-reverse", gap: spacing[2], paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  incidentHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  form: { padding: spacing[4], gap: spacing[3] },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  formActions: { flexDirection: "row-reverse", gap: spacing[2] },
} as const;
