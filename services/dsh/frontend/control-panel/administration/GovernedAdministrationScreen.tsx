"use client";

import React from "react";
import { AdministrationDashboardScreen } from "./AdministrationDashboardScreen";
import { RoleDefinitionApprovalQueue } from "./RoleDefinitionApprovalQueue";
import { RoleAssignmentApprovalQueue } from "./RoleAssignmentApprovalQueue";
import { DecisionRollbackQueue } from "./DecisionRollbackQueue";
import { AdministrationDiagnosticsPanel } from "./AdministrationDiagnosticsPanel";
import { IdentityRuntimeHealthPanel } from "../dashboard/IdentityRuntimeHealthPanel";

export function GovernedAdministrationScreen() {
  return (
    <>
      <div style={{ padding: "16px" }}>
        <IdentityRuntimeHealthPanel />
      </div>
      <AdministrationDashboardScreen />
      <AdministrationDiagnosticsPanel />
      <RoleDefinitionApprovalQueue />
      <RoleAssignmentApprovalQueue />
      <DecisionRollbackQueue />
    </>
  );
}
