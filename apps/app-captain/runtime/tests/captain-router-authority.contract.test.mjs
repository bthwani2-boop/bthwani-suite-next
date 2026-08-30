import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");
const exists = (relative) => existsSync(new URL(relative, root));

test("captain uses Expo Router as the sole navigation authority", () => {
  const app = read("apps/app-captain/runtime/src/App.tsx");
  const screen = read("apps/app-captain/runtime/src/navigation/CaptainRouteScreen.tsx");
  const capabilities = read("apps/app-captain/runtime/src/platform/dsh-capabilities.tsx");
  const surface = read("services/dsh/frontend/app-captain/DshCaptainSurface.tsx");
  const binding = read("services/dsh/frontend/shared/delivery/captain-surface.binding.ts");
  const deliveryActions = read("services/dsh/frontend/shared/delivery/delivery.actions.ts");
  const serviceMode = read("services/dsh/frontend/shared/delivery/captain-service-mode.model.ts");

  assert.match(screen, /useRouter/);
  assert.match(screen, /router\.push/);
  assert.match(screen, /router\.replace/);
  assert.match(screen, /router\.back/);
  assert.doesNotMatch(app, /\bLinking\b|DshCaptainNavigationCommand|navigationCommand/);
  assert.doesNotMatch(capabilities, /configureDshLinkingAdapter|getInitialURL|getInitialUrl|addUrlListener|addEventListener\("url"/);
  assert.match(capabilities, /configureDshMobileNotificationRuntime\(createDshExpoNotificationRuntime/);
  assert.match(capabilities, /linking: Linking/);
  assert.doesNotMatch(surface, /setRoute\(|routeHistoryRef|DshCaptainNavigationCommand/);
  assert.doesNotMatch(binding, /useState<DshCaptainRoute>|useCaptainNavigationModel|setRoute/);
  assert.doesNotMatch(deliveryActions, /setRoute|DshCaptainRoute/);
  assert.doesNotMatch(serviceMode, /setRoute|DshCaptainRoute/);
  assert.equal(exists("services/dsh/frontend/shared/delivery/captain-navigation.model.ts"), false);
  assert.equal(exists("services/dsh/frontend/shared/delivery/captain-deep-link.ts"), false);
});

test("captain support deep links cannot re-enter retired lifecycle screens", () => {
  const navigation = read("services/dsh/frontend/app-captain/captain-navigation.ts");
  const contract = read("services/dsh/frontend/shared/delivery/captain.contract.ts");
  const router = read("services/dsh/frontend/app-captain/account/CaptainSupportScreenRouter.tsx");

  for (const retiredRoute of ["order-accept", "order-deliver", "order-details", "order-get", "order-pickup", "orders-list", "orders-offers-list", "profile-get", "proof-upload", "tier-evaluate", "tier-info"]) {
    assert.doesNotMatch(navigation, new RegExp(`['\"]${retiredRoute}['\"]`), `retired route remains parseable: ${retiredRoute}`);
    assert.doesNotMatch(contract, new RegExp(`['\"]${retiredRoute}['\"]`), `retired route remains in Captain support contract: ${retiredRoute}`);
  }
  assert.doesNotMatch(router, /DshCaptainOrder(?:Pickup|Deliver|Details|Get)Screen|DshCaptainProofUploadScreen/);
});

test("captain task routes bind assignment identity atomically in the URL", () => {
  const navigation = read("services/dsh/frontend/app-captain/captain-navigation.ts");
  for (const fragment of [
    "/orders/${segment(route.assignmentId)}",
    "/orders/${segment(route.assignmentId)}/map",
    "/orders/${segment(route.assignmentId)}/execution",
    "/orders/${segment(route.assignmentId)}/proof",
  ]) {
    assert.ok(navigation.includes(fragment), `missing canonical captain route: ${fragment}`);
  }
  assert.match(navigation, /dshCaptainRouteAssignmentId/);
  assert.match(navigation, /screenId: CaptainSupportRoute/);
});

test("captain has real file-system routes and fail-closed dynamic parameter guards", () => {
  const required = [
    "apps/app-captain/runtime/app/orders/index.tsx",
    "apps/app-captain/runtime/app/orders/[assignmentId]/index.tsx",
    "apps/app-captain/runtime/app/orders/[assignmentId]/map.tsx",
    "apps/app-captain/runtime/app/orders/[assignmentId]/execution.tsx",
    "apps/app-captain/runtime/app/orders/[assignmentId]/proof.tsx",
    "apps/app-captain/runtime/app/notifications.tsx",
    "apps/app-captain/runtime/app/account/index.tsx",
    "apps/app-captain/runtime/app/account/[section].tsx",
    "apps/app-captain/runtime/app/support/index.tsx",
    "apps/app-captain/runtime/app/support/[screenId].tsx",
  ];
  for (const file of required) assert.equal(exists(file), true, `missing ${file}`);

  const detail = read("apps/app-captain/runtime/app/orders/[assignmentId]/index.tsx");
  const account = read("apps/app-captain/runtime/app/account/[section].tsx");
  const support = read("apps/app-captain/runtime/app/support/[screenId].tsx");
  assert.match(detail, /if \(!assignmentId\) return <Redirect href="\/orders" \/>/);
  assert.match(account, /if \(!section\) return <Redirect href="\/account" \/>/);
  assert.match(support, /if \(!screenId\) return <Redirect href="\/support" \/>/);
});

test("captain operational assignment truth remains DSH-owned instead of URL-owned", () => {
  const inbox = read("services/dsh/frontend/shared/delivery/captain-inbox.model.ts");
  const binding = read("services/dsh/frontend/shared/delivery/captain-surface.binding.ts");
  const journey = read("services/dsh/frontend/app-captain/DshCaptainOrderJourneyRenderer.tsx");
  const surface = read("services/dsh/frontend/app-captain/DshCaptainSurface.tsx");

  assert.match(inbox, /assignment\.status !== 'accepted'/);
  assert.match(inbox, /operationalAssignments\.length === 1/);
  assert.match(inbox, /operationalAssignmentAmbiguous/);
  assert.match(binding, /const operationalAssignmentId = inboxModel\.operationalAssignment\?\.id \|\| '';/);
  assert.match(binding, /const contextAssignmentId = routeAssignmentId \|\| operationalAssignmentId;/);
  assert.match(binding, /const operationalCommandAssignmentId =/);
  assert.match(binding, /routeAssignmentId === operationalAssignmentId/);

  const actionBindingStart = binding.indexOf("const deliveryActions = useCaptainDeliveryActions");
  const actionBindingEnd = binding.indexOf("const pushLocation", actionBindingStart);
  assert.ok(actionBindingStart >= 0 && actionBindingEnd > actionBindingStart);
  const actionBinding = binding.slice(actionBindingStart, actionBindingEnd);
  assert.match(actionBinding, /activeAssignmentId: operationalCommandAssignmentId/);
  assert.doesNotMatch(actionBinding, /activeAssignmentId: contextAssignmentId/);

  assert.match(journey, /isActiveAssignmentOperational/);
  assert.match(journey, /props\.route === 'pickup-dropoff'/);
  assert.match(journey, /props\.route === 'pod-submission'/);
  assert.doesNotMatch(journey, /activeDeliveryStatus === 'assigned'/);

  assert.match(surface, /activeAssignment\.id === operationalAssignmentId/);
  assert.match(surface, /captainPodRequired=\{derived\.captainPodRequired && isActiveAssignmentOperational\}/);
  assert.match(surface, /assignmentId: operationalAssignmentId/);
});
