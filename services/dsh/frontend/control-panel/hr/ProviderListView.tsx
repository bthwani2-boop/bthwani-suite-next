"use client";

import React, { useMemo, useState } from "react";
import { Box, Button, Card, ScrollScreen, Surface, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  PROVIDER_KIND_LABEL_AR,
  useCaptainListController,
  useEmployeeListController,
  useFieldAgentListController,
  useWorkforceReferenceData,
} from "../../shared/workforce";
import type { EngagementStatus, FieldAgent, ProviderKind } from "../../shared/workforce";
import { WorkforceErrorState } from "../../shared/workforce/WorkforceErrorState";

type TypeFilter = "all" | ProviderKind;

const STATUS_TABS: Array<{ label: string; value: EngagementStatus | undefined }> = [
  { label: "الكل", value: undefined },
  { label: "بانتظار التفعيل", value: "pending_activation" },
  { label: "نشط", value: "active" },
  { label: "موقوف", value: "suspended" },
];

const TYPE_TABS: Array<{ label: string; value: TypeFilter }> = [
  { label: "الكل", value: "all" },
  { label: "ميداني", value: "field" },
  { label: "كابتن", value: "captain" },
  { label: "موظف إداري", value: "employee" },
];

function statusTone(status: EngagementStatus): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "pending_activation":
      return "warning";
    case "suspended":
      return "danger";
    default:
      return "muted";
  }
}

export function ProviderListView(props: {
  readonly onCreate: () => void;
  readonly onOpen: (actorId: string, kind: ProviderKind) => void;
  readonly onReference: () => void;
  readonly onActivation: () => void;
}) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const fieldList = useFieldAgentListController();
  const captainList = useCaptainListController();
  const employeeList = useEmployeeListController();
  const reference = useWorkforceReferenceData();

  const status = fieldList.status;
  const setStatus = (value: EngagementStatus | undefined) => {
    fieldList.setStatus(value);
    captainList.setStatus(value);
    employeeList.setStatus(value);
  };
  const query = fieldList.query;
  const setQuery = (value: string) => {
    fieldList.setQuery(value);
    captainList.setQuery(value);
    employeeList.setQuery(value);
  };

  const combined = useMemo(() => {
    const field: FieldAgent[] = fieldList.state.kind === "ready" ? [...fieldList.state.fieldAgents] : [];
    const captains: FieldAgent[] = captainList.state.kind === "ready" ? [...captainList.state.captains] : [];
    const employees: FieldAgent[] = employeeList.state.kind === "ready" ? [...employeeList.state.employees] : [];
    const rows = typeFilter === "field"
      ? field
      : typeFilter === "captain"
        ? captains
        : typeFilter === "employee"
          ? employees
          : [...field, ...captains, ...employees];
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [fieldList.state, captainList.state, employeeList.state, typeFilter]);

  const loading = fieldList.state.kind === "loading" || captainList.state.kind === "loading" || employeeList.state.kind === "loading";
  const errorState = fieldList.state.kind === "error"
    ? fieldList.state
    : captainList.state.kind === "error"
      ? captainList.state
      : employeeList.state.kind === "error"
        ? employeeList.state
        : null;

  const counts = useMemo(() => {
    const rows = [
      ...(fieldList.state.kind === "ready" ? fieldList.state.fieldAgents : []),
      ...(captainList.state.kind === "ready" ? captainList.state.captains : []),
      ...(employeeList.state.kind === "ready" ? employeeList.state.employees : []),
    ];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.engagementStatus === "pending_activation").length,
      active: rows.filter((r) => r.engagementStatus === "active").length,
      suspended: rows.filter((r) => r.engagementStatus === "suspended").length,
    };
  }, [fieldList.state, captainList.state, employeeList.state]);

  const reload = () => {
    void fieldList.reload();
    void captainList.reload();
    void employeeList.reload();
  };

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>سجل Workforce الموحد</Text>
          <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
            <Button label="إضافة عضو" tone="primary" onPress={props.onCreate} />
            <Button label="تفعيل مقدمي الخدمة" tone="secondary" onPress={props.onActivation} />
            <Button label="المدن والورديات" tone="ghost" onPress={props.onReference} />
          </Box>
        </Box>

        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          إجمالي {counts.total} · بانتظار التفعيل {counts.pending} · نشط {counts.active} · موقوف {counts.suspended}
        </Text>

        <TextField
          label="بحث بالاسم أو الرقم الوظيفي"
          value={query}
          onChangeText={setQuery}
          placeholder="FLD-000123 أو CAP-000123 أو EMP-000123"
        />

        <Text role="bodySm" style={{ textAlign: "right" }}>النوع</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {TYPE_TABS.map((tab) => (
            <Button key={tab.value} label={tab.label} tone={typeFilter === tab.value ? "primary" : "ghost"} onPress={() => setTypeFilter(tab.value)} />
          ))}
        </Box>

        <Text role="bodySm" style={{ textAlign: "right" }}>الحالة</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => (
            <Button key={tab.label} label={tab.label} tone={status === tab.value ? "primary" : "ghost"} onPress={() => setStatus(tab.value)} />
          ))}
        </Box>
      </Card>

      {loading ? (
        <Surface tone="default" padding={4}>
          <Text role="bodySm" tone="muted" align="center">جارٍ تحميل سجل Workforce…</Text>
        </Surface>
      ) : null}
      {errorState?.kind === "error" ? (
        <WorkforceErrorState message={errorState.message} isSessionExpired={errorState.isSessionExpired} onRetry={reload} />
      ) : null}
      {!loading && !errorState && combined.length === 0 ? (
        <Surface tone="default" padding={4}>
          <Text role="bodySm" tone="muted" align="center">لا توجد نتائج مطابقة.</Text>
        </Surface>
      ) : null}
      {!loading && !errorState
        ? combined.map((member) => (
            <Card key={member.actorId} style={{ padding: spacing[3], gap: spacing[1] }}>
              <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Box style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text role="bodyStrong">{member.fullNameAr}</Text>
                  <Text role="caption" tone="muted">
                    {member.workforceCode} · {PROVIDER_KIND_LABEL_AR[member.workforceKind]} · {member.workforceKind === "employee"
                      ? member.employeeProfile?.department || "بدون قسم"
                      : reference.cityLabel(member.fieldProfile?.cityCode ?? member.captainProfile?.operatingCityCode)}
                  </Text>
                </Box>
                <Box style={{ flexDirection: "row-reverse", gap: spacing[2], alignItems: "center" }}>
                  <Text role="bodySm" tone={statusTone(member.engagementStatus)}>{ENGAGEMENT_STATUS_LABEL_AR[member.engagementStatus]}</Text>
                  <Button label="فتح" tone="secondary" onPress={() => props.onOpen(member.actorId, member.workforceKind)} />
                </Box>
              </Box>
            </Card>
          ))
        : null}
    </ScrollScreen>
  );
}

export default ProviderListView;
