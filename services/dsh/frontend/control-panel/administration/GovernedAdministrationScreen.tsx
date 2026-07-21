"use client";

import React from "react";
import { AdministrationDashboardScreen } from "./AdministrationDashboardScreen";
import { RoleDefinitionApprovalQueue } from "./RoleDefinitionApprovalQueue";
import { RoleAssignmentApprovalQueue } from "./RoleAssignmentApprovalQueue";

export function GovernedAdministrationScreen() {
  return (
    <>
      <AdministrationDashboardScreen />
      <RoleDefinitionApprovalQueue />
      <RoleAssignmentApprovalQueue />
    </>
  );
}
