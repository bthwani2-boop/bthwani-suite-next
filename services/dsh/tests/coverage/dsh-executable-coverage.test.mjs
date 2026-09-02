// Canonical executable LCOV harness for the DSH TypeScript surface.
//
// The full DSH verification gate remains services/dsh: test (Nx), which owns
// every services/dsh/tests/*.test.mjs contract. Sonar coverage intentionally
// reuses only tests that execute DSH source so static governance/contract
// assertions cannot masquerade as executable coverage ownership.

const executableCoverageTests = [
  "../captain-inbox-exclusion.test.mjs",
  "../captain-route-registry.test.mjs",
  "../catalog-controller-core.test.mjs",
  "../checkout-controller-core.test.mjs",
  "../control-panel-store-admin-state.test.mjs",
  "../control-panel-store-admin-view-model.test.mjs",
  "../dsh-api-base-url.test.mjs",
  "../field-onboarding-validation.test.mjs",
  "../field-readiness-problem.test.mjs",
  "../geo.customer-visibility.policy.test.mjs",
  "../geo.operational-checkpoint.policy.test.mjs",
  "../geo.status-updates.test.mjs",
  "../home-discovery-admin.test.mjs",
  "../home-discovery-controller.test.mjs",
  "../home-discovery-policy.test.mjs",
  "../notifications-controller.test.mjs",
  "../platform-provider.policy.test.mjs",
  "../provider-secret-visibility.test.mjs",
  "../store-admin-controller.test.mjs",
  "../store-discovery-controller.test.mjs",
  "../store-discovery-states.test.mjs",
  "../store-discovery-view-model.test.mjs",
  "../store-role-context-controller.test.mjs",
  "../wlt-boundary-provider.test.mjs"
];

for (const testModule of executableCoverageTests) {
  await import(new URL(testModule, import.meta.url));
}
