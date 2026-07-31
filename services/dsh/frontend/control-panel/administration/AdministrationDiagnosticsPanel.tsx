"use client";

import React from "react";
import {
  CpButton,
  CpKpiCard,
  CpKpiStrip,
  CpMutedInline,
  CpStatePanel,
  CpStateView,
} from "@bthwani/control-panel/components";
import { useAdministrationDiagnosticsController } from "../../shared/administration";

export function AdministrationDiagnosticsPanel() {
  const diagnostics = useAdministrationDiagnosticsController("authenticated");

  if (diagnostics.state.kind === "loading" || diagnostics.state.kind === "idle") {
    return <CpStateView kind="loading" title="جارٍ تحميل تشخيص الإدارة…" />;
  }
  if (diagnostics.state.kind === "error") {
    return (
      <>
        <CpStateView kind="error" title={diagnostics.state.message} />
        <CpButton onClick={() => void diagnostics.reload()}>إعادة المحاولة</CpButton>
      </>
    );
  }

  const data = diagnostics.state.data;
  return (
    <section aria-label="تشخيص الإدارة المنقح">
      <CpStatePanel
        role="status"
        title={data.status === "healthy" ? "الحالة الإدارية مستقرة" : "توجد طلبات إدارية تحتاج متابعة"}
        description="هذه القراءة تعرض أعدادًا تشغيلية فقط ولا تعرض أرقام الهواتف أو وثائق الاعتماد أو أسرار الجلسات أو تفاصيل PII."
      />
      <CpKpiStrip>
        <CpKpiCard label="الأدوار الفعالة" value={data.activeRoleCount} />
        <CpKpiCard label="الإسنادات المعتمدة" value={data.approvedAssignmentCount} />
        <CpKpiCard label="تعريفات معلقة" value={data.pendingRoleDefinitionCount} />
        <CpKpiCard label="إسنادات معلقة" value={data.pendingRoleAssignmentCount} />
        <CpKpiCard label="تراجعات معلقة" value={data.pendingRollbackCount} />
        <CpKpiCard label="أحداث حساسة خلال 24 ساعة" value={data.recentRestrictedAuditCount} />
      </CpKpiStrip>
      <CpMutedInline tight>آخر تحديث: {data.generatedAt}</CpMutedInline>
      <div>
        <CpButton onClick={() => void diagnostics.reload()}>تحديث التشخيص</CpButton>
      </div>
    </section>
  );
}
