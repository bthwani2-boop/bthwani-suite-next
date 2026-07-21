"use client";

import { AdministrationDashboardScreen } from "./AdministrationDashboardScreen";
import { RoleAssignmentApprovalQueue } from "./RoleAssignmentApprovalQueue";

export function GovernedAdministrationScreen() {
  return (
    <>
      <AdministrationDashboardScreen />
      <RoleAssignmentApprovalQueue />
    </>
  );
}
