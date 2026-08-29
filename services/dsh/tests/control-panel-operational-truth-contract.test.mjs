import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const marketingDashboard = readFileSync(
  "services/dsh/frontend/control-panel/marketing/MarketingDashboardScreen.tsx",
  "utf8",
);
const administrationDashboard = readFileSync(
  "services/dsh/frontend/control-panel/administration/AdministrationDashboardScreen.tsx",
  "utf8",
);
const operationalDashboard = readFileSync(
  "services/dsh/frontend/control-panel/dashboard/DshOperationalDashboardScreen.tsx",
  "utf8",
);
const supportDashboard = readFileSync(
  "services/dsh/frontend/control-panel/support/SupportDashboardScreen.tsx",
  "utf8",
);

test("marketing kpis are rendered only when backed by the owning API", () => {
  assert.match(marketingDashboard, /metrics\.isBackedByApi\s*\?\s*\(/);
  assert.match(marketingDashboard, /تعذر إثبات مؤشرات التسويق/);
  assert.match(marketingDashboard, /metrics\.disclosureReason/);
});

test("administration kpis never turn unread or unproven data into zero", () => {
  assert.match(administrationDashboard, /if \(!allowed\) return "غير مصرح"/);
  assert.match(administrationDashboard, /state\.kind === "success" \? state\.data\.length : "—"/);
  assert.doesNotMatch(administrationDashboard, /state\.kind === "success" \? state\.data\.length : 0/);
});

test("support kpis require both runtime sources to be proven", () => {
  assert.match(supportDashboard, /ticketDataProven = isProvenListState\(ticketCtrl\.listState\.kind\)/);
  assert.match(supportDashboard, /incidentDataProven = isProvenListState\(incidentCtrl\.listState\.kind\)/);
  assert.match(supportDashboard, /supportMetricsProven = ticketDataProven && incidentDataProven/);
  assert.match(supportDashboard, /supportMetricsProven \? buildSupportKpiMetrics\(tickets, incidents\) : null/);
  assert.match(supportDashboard, /تعذر إثبات مؤشرات الدعم/);
  assert.match(supportDashboard, /لن تُعرض أرقام صفرية أو جزئية على أنها حقيقة تشغيلية/);
});

test("operational dashboard does not request partner or dispatch reads without their permissions", () => {
  assert.match(operationalDashboard, /hasServiceControlPanelPermission/);
  assert.match(operationalDashboard, /partners\.read/);
  assert.match(operationalDashboard, /usePartnerAdminController\(canReadPartners \? "authenticated" : "restricted"\)/);
  assert.match(operationalDashboard, /operations\.read/);
  assert.match(operationalDashboard, /canReadOperations \? \(/);
  assert.match(operationalDashboard, /DSH_OPERATIONS_READ_REQUIRED/);
});
