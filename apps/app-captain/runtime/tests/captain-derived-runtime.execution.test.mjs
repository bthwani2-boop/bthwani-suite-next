import assert from "node:assert/strict";
import test from "node:test";

const derivedUrl = new URL(
  "../../../../services/dsh/frontend/shared/delivery/captain.derived.ts",
  import.meta.url,
);

const {
  buildActiveOrderSummary,
  buildCaptainBottomActiveId,
  buildCaptainDerived,
  buildCaptainHomeTicker,
} = await import(derivedUrl.href);

const noop = () => {};
const callbacks = {
  toggleAvailability: noop,
  goToInbox: noop,
  resetInboxState: noop,
  toggleOrderExpanded: noop,
};

function assignment(deliveryStatus = "assigned") {
  return {
    orderId: "order-42",
    status: "accepted",
    delivery: { status: deliveryStatus },
  };
}

function state(overrides = {}) {
  return {
    activeServiceType: "dsh",
    route: "home",
    inboxState: "ready",
    activeAssignmentId: "assignment-42",
    activeOrderId: "order-42",
    activeDeliveryStatus: "assigned",
    inboxItems: [],
    selectedSupportScreen: "order-details",
    isPickupSheetVisible: false,
    isDeliverySheetVisible: false,
    captainAvailabilityStatus: "available",
    gpsStatus: "ready",
    activeOrderExpanded: false,
    activeOrderPhase: "pickup",
    captainAppMode: "bthwani_captain_mode",
    activeOrderDraft: "",
    activeOrderMessages: [],
    storeCourierStage: "ready_for_pickup",
    captainPodState: "idle",
    captainPodPhotoUri: undefined,
    captainPodMediaKey: undefined,
    isDeclineSheetVisible: false,
    declineSheetState: "ready",
    declineOrderId: "",
    pickupSheetState: "ready",
    ...overrides,
  };
}

test("captain active assignment switches the next action from pickup to delivery", () => {
  const beforePickup = buildActiveOrderSummary(assignment("driver_arrived_store"));
  const afterPickup = buildActiveOrderSummary(assignment("picked_up"));

  assert.equal(beforePickup.orderId, "order-42");
  assert.equal(beforePickup.nextActionLabel, "تأكيد الاستلام");
  assert.equal(afterPickup.nextActionLabel, "تأكيد التسليم");
  assert.match(afterPickup.currentStageLabel, /الاستلام/);
});

test("captain home ticker exposes loading, error, empty, delivered and active states", () => {
  const summary = buildActiveOrderSummary(assignment("picked_up"));
  const cases = [
    ["loading", "تحميل"],
    ["error", "تنبيه"],
    ["empty", "انتظار"],
    ["delivered", "مغلق"],
    ["ready", "#order-42"],
  ];

  for (const [inboxState, expectedStatus] of cases) {
    const ticker = buildCaptainHomeTicker(
      {
        captainAvailabilityStatus: "available",
        inboxState,
        activeOrderId: " order-42 ",
      },
      callbacks,
      summary,
    );
    assert.equal(ticker.statusLabel, expectedStatus);
    assert.equal(ticker.marquee, false);
  }
});

test("unavailable captain is fail-closed before inbox state is considered", () => {
  const summary = buildActiveOrderSummary(assignment());
  const ticker = buildCaptainHomeTicker(
    {
      captainAvailabilityStatus: "unavailable",
      inboxState: "ready",
      activeOrderId: "order-42",
    },
    callbacks,
    summary,
  );

  assert.equal(ticker.statusLabel, "غير متاح");
  assert.equal(ticker.onPress, callbacks.toggleAvailability);
});

test("captain derived state enforces GPS, store-courier and proof boundaries", () => {
  const normal = buildCaptainDerived(state(), callbacks, assignment("picked_up"));
  assert.equal(normal.isCaptainAvailable, true);
  assert.equal(normal.isGpsEnabled, true);
  assert.equal(normal.captainPodRequired, true);
  assert.equal(normal.isStoreCourierMode, false);

  const gpsDisabled = buildCaptainDerived(state({ gpsStatus: "disabled" }), callbacks, assignment());
  assert.equal(gpsDisabled.isGpsEnabled, false);

  const storeCourier = buildCaptainDerived(
    state({ captainAppMode: "store_courier_mode" }),
    callbacks,
    assignment(),
  );
  assert.equal(storeCourier.isStoreCourierMode, true);
  assert.equal(storeCourier.captainPodRequired, false);

  const withoutAssignment = buildCaptainDerived(state(), callbacks, undefined);
  assert.equal(withoutAssignment.captainPodRequired, false);
});

test("captain navigation highlights only the canonical section for each mode", () => {
  assert.equal(buildCaptainBottomActiveId("inbox", false), "orders");
  assert.equal(buildCaptainBottomActiveId("account-finance", false), "wallet");
  assert.equal(buildCaptainBottomActiveId("support-directory", false), "support");
  assert.equal(buildCaptainBottomActiveId("account-profile", false), "profile");
  assert.equal(buildCaptainBottomActiveId("home", true), "my-orders");
  assert.equal(buildCaptainBottomActiveId("account", true), "profile");
  assert.equal(buildCaptainBottomActiveId("detail", true), "");
});
