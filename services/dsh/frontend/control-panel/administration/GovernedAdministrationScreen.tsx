"use client";

import React from "react";
import { useIdentityRuntimeStatus, useIdentitySession } from "@bthwani/core-identity";
import { AdministrationDashboardScreen } from "./AdministrationDashboardScreen";
import { RoleDefinitionApprovalQueue } from "./RoleDefinitionApprovalQueue";
import { RoleAssignmentApprovalQueue } from "./RoleAssignmentApprovalQueue";
import { DecisionRollbackQueue } from "./DecisionRollbackQueue";
import { AdministrationDiagnosticsPanel } from "./AdministrationDiagnosticsPanel";
import { IdentityRuntimeHealthPanel } from "../dashboard/IdentityRuntimeHealthPanel";
import { CpStatePanel } from "@bthwani/control-panel/components";
import { AdministrationInvalidationProvider } from "../../shared/administration";
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";

export function GovernedAdministrationScreen() {
  const { state } = useIdentityRuntimeStatus();
  const { state: identityState } = useIdentitySession();
  const identity = identityState.kind === "authenticated" ? identityState.identity : null;
  const canReadDiagnostics = hasServiceControlPanelPermission(identity, "dsh", "administration.diagnostics.read");
  const identityReady = state.kind === "resolved" && state.value.status === "HEALTHY";
  const identityNotReady = state.kind === "resolved" && state.value.status === "NOT_READY";
  const reasonCodes = state.kind === "resolved" ? state.value.reasonCodes.join(", ") : "";

  return (
    <AdministrationInvalidationProvider>
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
      <AdministrationDiagnosticsPanel enabled={canReadDiagnostics} />

      {/* Identity Mutation Gate */}
      <div style={identityReady ? {} : { pointerEvents: "none", opacity: 0.6 }}>
        <RoleDefinitionApprovalQueue />
        <RoleAssignmentApprovalQueue />
        <DecisionRollbackQueue />
      </div>
    </AdministrationInvalidationProvider>
  );
}
