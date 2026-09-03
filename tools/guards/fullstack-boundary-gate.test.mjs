import assert from "node:assert/strict";
import test from "node:test";

import {
  findRuntimeOwnershipViolations,
  isForbiddenAppRuntimeDshImport,
} from "./lib/fullstack-boundary-rules.mjs";

test("rejects an app runtime deep import into DSH implementation", () => {
  assert.equal(
    isForbiddenAppRuntimeDshImport(
      "apps/app-field/runtime/src/App.tsx",
      "services/dsh/frontend/app-field/index.ts",
    ),
    true,
  );
});

test("allows app runtime imports resolved through the public package boundary", () => {
  assert.equal(
    isForbiddenAppRuntimeDshImport(
      "apps/app-field/runtime/src/App.tsx",
      "@bthwani/dsh/app-field",
    ),
    false,
  );
});

test("allows a thin mobile runtime that composes the canonical DSH application boundary", () => {
  const source = `
    import { DshCaptainApplication, type DshCaptainNavigation } from "@bthwani/dsh/app-captain";
    export default function App({ route, navigation }) {
      return <DshCaptainApplication route={route} navigation={navigation} pushScheme="captain" />;
    }
  `;
  assert.deepEqual(
    findRuntimeOwnershipViolations("apps/app-captain/runtime/src/App.tsx", source),
    [],
  );
});

test("rejects mobile runtime ownership of DSH surfaces, gates, fetches, and product feature containers", () => {
  const source = `
    import {
      DshCaptainSurface,
      IdentitySessionGate,
      fetchCaptainOperationalReadiness,
      type DshCaptainNavigation,
    } from "@bthwani/dsh/app-captain";
  `;
  const appViolations = findRuntimeOwnershipViolations(
    "apps/app-captain/runtime/src/App.tsx",
    source,
  );
  assert.ok(appViolations.some((item) => item.includes("DshCaptainSurface")));
  assert.ok(appViolations.some((item) => item.includes("IdentitySessionGate")));
  assert.ok(appViolations.some((item) => item.includes("fetchCaptainOperationalReadiness")));
  assert.ok(appViolations.some((item) => item.includes("DshCaptainApplication")));

  assert.deepEqual(
    findRuntimeOwnershipViolations(
      "apps/app-captain/runtime/src/features/readiness/ReadinessGateScreen.tsx",
      'import React from "react";',
    ),
    ["MOBILE_RUNTIME_PRODUCT_CONTAINER_FORBIDDEN"],
  );
});

test("allows runtime-native platform injection and navigation helpers", () => {
  const source = `
    import {
      configureCatalogMobileFilePicker,
      DshPartnerApplication,
      dshPartnerRouteToPath,
      type DshPartnerNavigation,
    } from "@bthwani/dsh/app-partner";
  `;
  assert.deepEqual(
    findRuntimeOwnershipViolations("apps/app-partner/runtime/src/App.tsx", source),
    [],
  );
});

test("allows thin Next route adapters and rejects control-panel product applications", () => {
  const good = `
    import { PlatformWorkspaceScreen } from "@bthwani/dsh/control-panel/platform";
    export default function Page() { return <PlatformWorkspaceScreen />; }
  `;
  assert.deepEqual(
    findRuntimeOwnershipViolations(
      "apps/control-panel/runtime/src/app/(shell)/dsh/platform/page.tsx",
      good,
    ),
    [],
  );

  const bad = `
    "use client";
    import { useState } from "react";
    import { useIdentitySession } from "@bthwani/core-identity";
    import { CpTabs } from "@bthwani/control-panel/components";
    import { colorRoles } from "@bthwani/ui-kit";
    export default function Page() {
      const [section] = useState("control");
      const { state } = useIdentitySession();
      return <form><CpTabs value={section} items={[]} />{state.kind}{colorRoles.danger}</form>;
    }
  `;
  const violations = findRuntimeOwnershipViolations(
    "apps/control-panel/runtime/src/app/(shell)/dsh/platform/page.tsx",
    bad,
  );
  assert.ok(violations.includes("CONTROL_PANEL_RUNTIME_PAGE_OWNS_CORE_DOMAIN_POLICY"));
  assert.ok(violations.includes("CONTROL_PANEL_RUNTIME_PAGE_OWNS_PRESENTATION_COMPOSITION"));
  assert.ok(violations.includes("CONTROL_PANEL_RUNTIME_PAGE_OWNS_PRODUCT_PRESENTATION"));
  assert.ok(violations.includes("CONTROL_PANEL_RUNTIME_PAGE_OWNS_AUTHORIZATION_OR_IDENTITY_DECISION"));
  assert.ok(violations.includes("CONTROL_PANEL_RUNTIME_PAGE_OWNS_PRODUCT_FORM"));
});
