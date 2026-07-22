"use client";

import React from "react";
import { AdministrationDashboardScreen } from "./AdministrationDashboardScreen";
import { RoleDefinitionApprovalQueue } from "./RoleDefinitionApprovalQueue";
import { RoleAssignmentApprovalQueue } from "./RoleAssignmentApprovalQueue";
import { DecisionRollbackQueue } from "./DecisionRollbackQueue";
import { AdministrationDiagnosticsPanel } from "./AdministrationDiagnosticsPanel";

export function GovernedAdministrationScreen() {
  return (
    <>
      <AdministrationDashboardScreen />
      <AdministrationDiagnosticsPanel />
      <RoleDefinitionApprovalQueue />
      <RoleAssignmentApprovalQueue />
      <DecisionRollbackQueue />
    </>
  );
}
