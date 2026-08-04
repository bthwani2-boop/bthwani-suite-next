"use client";

import React from "react";
import { useIdentityRuntimeStatus } from "@bthwani/core-identity";
import { AdministrationDashboardScreen } from "./AdministrationDashboardScreen";
import { RoleDefinitionApprovalQueue } from "./RoleDefinitionApprovalQueue";
import { RoleAssignmentApprovalQueue } from "./RoleAssignmentApprovalQueue";
import { DecisionRollbackQueue } from "./DecisionRollbackQueue";
import { AdministrationDiagnosticsPanel } from "./AdministrationDiagnosticsPanel";
import { IdentityRuntimeHealthPanel } from "../dashboard/IdentityRuntimeHealthPanel";

export function GovernedAdministrationScreen() {
  const { state } = useIdentityRuntimeStatus();
  const identityReady = state.kind === "resolved" && state.value.status === "HEALTHY";
  const identityNotReady = state.kind === "resolved" && state.value.status === "NOT_READY";
  const reasonCodes = state.kind === "resolved" ? state.value.reasonCodes.join(", ") : "";

  return (
    <>
      {identityNotReady && (
        <div style={{
          backgroundColor: "#FEE2E2",
          color: "#991B1B",
          padding: "16px",
          margin: "16px",
          borderRadius: "8px",
          border: "1px solid #F87171"
        }}>
          <h3 style={{ marginTop: 0, marginBottom: "8px" }}>عمليات الهوية متوقفة (Identity NOT_READY)</h3>
          <p style={{ margin: 0 }}>
            <strong>السبب:</strong> {reasonCodes || "غير معروف"}<br/>
            <strong>الإجراء:</strong> يرجى التحقق من قواعد البيانات والمهاجرات (Migrations) لحين استعادة الخدمة.
            تم تعطيل إجراءات إنشاء وتفعيل الحسابات (Actors) حفاظاً على سلامة البيانات.
          </p>
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
