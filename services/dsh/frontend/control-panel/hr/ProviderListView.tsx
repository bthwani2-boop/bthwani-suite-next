"use client";

import React, { useMemo, useState } from "react";
import { Box, Button, Card, ScrollScreen, Surface, Text, TextField, spacing } from "@bthwani/ui-kit";
import {
  ENGAGEMENT_STATUS_LABEL_AR,
  PROVIDER_KIND_LABEL_AR,
  useCaptainListController,
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
  const reference = useWorkforceReferenceData();

  const status = fieldList.status;
  const setStatus = (value: EngagementStatus | undefined) => {
    fieldList.setStatus(value);
    captainList.setStatus(value);
  };
  const query = fieldList.query;
  const setQuery = (value: string) => {
    fieldList.setQuery(value);
    captainList.setQuery(value);
  };

  const combined = useMemo(() => {
    const field: FieldAgent[] = fieldList.state.kind === "ready" ? [...fieldList.state.fieldAgents] : [];
    const captains: FieldAgent[] = captainList.state.kind === "ready" ? [...captainList.state.captains] : [];
    const rows = typeFilter === "field" ? field : typeFilter === "captain" ? captains : [...field, ...captains];
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [fieldList.state, captainList.state, typeFilter]);

  const loading = fieldList.state.kind === "loading" || captainList.state.kind === "loading";
  const errorState = fieldList.state.kind === "error" ? fieldList.state : captainList.state.kind === "error" ? captainList.state : null;

  const counts = useMemo(() => {
    const rows = [
      ...(fieldList.state.kind === "ready" ? fieldList.state.fieldAgents : []),
      ...(captainList.state.kind === "ready" ? captainList.state.captains : []),
    ];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.engagementStatus === "pending_activation").length,
      active: rows.filter((r) => r.engagementStatus === "active").length,
      suspended: rows.filter((r) => r.engagementStatus === "suspended").length,
    };
  }, [fieldList.state, captainList.state]);

  const reload = () => {
    void fieldList.reload();
    void captainList.reload();
  };

  return (
    <ScrollScreen>
      <Card style={{ padding: spacing[4], gap: spacing[3] }}>
        <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text role="titleSm" style={{ textAlign: "right", fontWeight: "bold" }}>
            مقدمو الخدمة
          </Text>
          <Box style={{ flexDirection: "row-reverse", gap: spacing[2] }}>
            <Button label="إضافة مقدم خدمة" tone="primary" onPress={props.onCreate} />
            <Button label="تفعيل الحسابات" tone="secondary" onPress={props.onActivation} />
            <Button label="المرجعيات" tone="ghost" onPress={props.onReference} />
          </Box>
        </Box>

        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          إجمالي {counts.total} · بانتظار التفعيل {counts.pending} · نشط {counts.active} · موقوف {counts.suspended}
        </Text>

        <TextField
          label="بحث بالاسم أو رقم مقدم الخدمة"
          value={query}
          onChangeText={setQuery}
          placeholder="مثال: FLD-000123 أو أحمد"
        />

        <Text role="bodySm" style={{ textAlign: "right" }}>النوع</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {TYPE_TABS.map((tab) => (
            <Button
              key={tab.value}
              label={tab.label}
              tone={typeFilter === tab.value ? "primary" : "ghost"}
              onPress={() => setTypeFilter(tab.value)}
            />
          ))}
        </Box>

        <Text role="bodySm" style={{ textAlign: "right" }}>الحالة</Text>
        <Box style={{ flexDirection: "row-reverse", gap: spacing[2], flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.label}
              label={tab.label}
              tone={status === tab.value ? "primary" : "ghost"}
              onPress={() => setStatus(tab.value)}
            />
          ))}
        </Box>
      </Card>

      {loading && (
        <Surface tone="default" padding={4}>
          <Text role="bodySm" tone="muted" align="center">جارٍ تحميل مقدمي الخدمة…</Text>
        </Surface>
      )}
      {errorState && errorState.kind === "error" && (
        <WorkforceErrorState message={errorState.message} isSessionExpired={errorState.isSessionExpired} onRetry={reload} />
      )}
      {!loading && !errorState && combined.length === 0 && (
        <Surface tone="default" padding={4}>
          <Text role="bodySm" tone="muted" align="center">
            لا يوجد مقدمو خدمة مطابقون — أضف مقدم خدمة جديدًا للبدء.
          </Text>
        </Surface>
      )}
      {!loading &&
        !errorState &&
        combined.map((agent) => (
          <Card key={agent.actorId} style={{ padding: spacing[3], gap: spacing[1] }}>
            <Box style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
              <Box style={{ alignItems: "flex-end", gap: 2 }}>
                <Text role="bodyStrong">{agent.fullNameAr}</Text>
                <Text role="caption" tone="muted">
                  {agent.workforceCode} · {PROVIDER_KIND_LABEL_AR[agent.workforceKind]} ·{" "}
                  {reference.cityLabel(agent.fieldProfile?.cityCode ?? agent.captainProfile?.operatingCityCode)}
                </Text>
              </Box>
              <Box style={{ flexDirection: "row-reverse", gap: spacing[2], alignItems: "center" }}>
                <Text role="bodySm" tone={statusTone(agent.engagementStatus)}>
                  {ENGAGEMENT_STATUS_LABEL_AR[agent.engagementStatus]}
                </Text>
                <Button label="فتح" tone="secondary" onPress={() => props.onOpen(agent.actorId, agent.workforceKind)} />
              </Box>
            </Box>
          </Card>
        ))}
    </ScrollScreen>
  );
}

export default ProviderListView;
