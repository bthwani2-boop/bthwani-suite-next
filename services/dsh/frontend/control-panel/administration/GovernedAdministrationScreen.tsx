"use client";

import React from "react";
import { useIdentityRuntimeStatus } from "@bthwani/core-identity";
import { AdministrationDashboardScreen } from "./AdministrationDashboardScreen";
import { RoleDefinitionApprovalQueue } from "./RoleDefinitionApprovalQueue";
import { RoleAssignmentApprovalQueue } from "./RoleAssignmentApprovalQueue";
import { DecisionRollbackQueue } from "./DecisionRollbackQueue";
import { AdministrationDiagnosticsPanel } from "./AdministrationDiagnosticsPanel";
import { IdentityRuntimeHealthPanel } from "../dashboard/IdentityRuntimeHealthPanel";
import { CpStatePanel } from "@bthwani/control-panel/components";

export function GovernedAdministrationScreen() {
  const { state } = useIdentityRuntimeStatus();
  const identityReady = state.kind === "resolved" && state.value.status === "HEALTHY";
  const identityNotReady = state.kind === "resolved" && state.value.status === "NOT_READY";
  const reasonCodes = state.kind === "resolved" ? state.value.reasonCodes.join(", ") : "";

  return (
    <>
      {identityNotReady && (
        <div style={{ padding: "16px", paddingBottom: 0 }}>
          <CpStatePanel
            role="alert"
            title="عمليات الهوية متوقفة (Identity NOT_READY)"
            description={`السبب: ${reasonCodes || "غير معروف"} — يرجى التحقق من قواعد البيانات والمهاجرات لحين استعادة الخدمة. تم تعطيل إجراءات إنشاء وتفعيل الحسابات حفاظاً على سلامة البيانات.`}
          />
        </div>
      )}
      <div style={{ padding: "16px" }}>
        <IdentityRuntimeHealthPanel />
      </div>
      <AdministrationDashboardScreen />
      <AdministrationDiagnosticsPanel />

      {/* Identity Mutation Gate */}
      <div style={identityReady ? {} : { pointerEvents: "none", opacity: 0.6 }}>
        <RoleDefinitionApprovalQueue />
        <RoleAssignmentApprovalQueue />
        <DecisionRollbackQueue />
      </div>
    </>
  );
}
