import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const policyUrl = new URL(
  "../../../../services/dsh/frontend/shared/delivery/captain.derived.policy.ts",
  import.meta.url,
);
const adapterUrl = new URL(
  "../../../../services/dsh/frontend/shared/delivery/captain.derived.ts",
  import.meta.url,
);

const {
  buildCaptainBottomActiveIdPolicy,
  buildCaptainHomeTickerPolicy,
  buildCaptainOrderSummaryPolicy,
  buildCaptainPresentationPolicy,
} = await import(policyUrl.href);

const assignmentStatusLabels = {
  accepted: "مقبولة",
};
const deliveryStatusLabels = {
  assigned: "تم إنشاء المهمة",
  driver_assigned: "الكابتن مستلم المهمة",
  driver_arrived_store: "وصل الكابتن للمتجر",
  picked_up: "تم الاستلام من المتجر",
  arrived_customer: "وصل الكابتن للعميل",
};

function assignment(deliveryStatus = "assigned") {
  return {
    orderId: "order-42",
    status: "accepted",
    delivery: { status: deliveryStatus },
  };
}

function specialRequestAssignment(deliveryStatus = "assigned") {
  return {
    specialRequestId: "special-42",
    requestType: "AWNAK_ERRAND",
    status: "accepted",
    delivery: { status: deliveryStatus },
  };
}

function state(overrides = {}) {
  return {
    route: "home",
    captainAvailabilityStatus: "available",
    gpsStatus: "ready",
    captainAppMode: "bthwani_captain_mode",
    activeOrderId: "order-42",
    ...overrides,
  };
}

test("captain runtime adapter is bound to the canonical pure derived policy", () => {
  const adapter = fs.readFileSync(adapterUrl, "utf8");
  assert.match(adapter, /from '\.\/captain\.derived\.policy'/);
  for (const functionName of [
    "buildCaptainBottomActiveIdPolicy",
    "buildCaptainHomeTickerPolicy",
    "buildCaptainOrderSummaryPolicy",
    "buildCaptainPresentationPolicy",
  ]) {
    assert.ok(adapter.includes(functionName), `captain runtime adapter is not bound to ${functionName}`);
  }
});

test("captain active assignment exposes only the next legal DSH action", () => {
  const beforeStoreArrival = buildCaptainOrderSummaryPolicy(
    assignment("driver_assigned"),
    assignmentStatusLabels,
    deliveryStatusLabels,
  );
  const beforePickup = buildCaptainOrderSummaryPolicy(
    assignment("driver_arrived_store"),
    assignmentStatusLabels,
    deliveryStatusLabels,
  );
  const afterPickup = buildCaptainOrderSummaryPolicy(
    assignment("picked_up"),
    assignmentStatusLabels,
    deliveryStatusLabels,
  );
  const afterCustomerArrival = buildCaptainOrderSummaryPolicy(
    assignment("arrived_customer"),
    assignmentStatusLabels,
    deliveryStatusLabels,
  );

  assert.equal(beforePickup.orderId, "order-42");
  assert.equal(beforeStoreArrival.nextActionLabel, "تأكيد الوصول للمتجر");
  assert.equal(beforePickup.nextActionLabel, "تأكيد الاستلام");
  assert.equal(afterPickup.nextActionLabel, "تأكيد الوصول للعميل");
  assert.equal(afterCustomerArrival.nextActionLabel, "فتح إثبات التسليم");
  assert.match(afterPickup.currentStageLabel, /الاستلام/);
  assert.equal(afterPickup.etaLabel, "مقبولة");
});

test("captain special-request assignment keeps its source identity through execution", () => {
  const summary = buildCaptainOrderSummaryPolicy(
    specialRequestAssignment("arrived_customer"),
    assignmentStatusLabels,
    deliveryStatusLabels,
  );

  assert.equal(summary.orderId, "special-42");
  assert.equal(summary.workItemLabel, "عونك");
  assert.match(summary.pickupLabel, /عونك/);
  assert.equal(summary.nextActionLabel, "فتح إثبات التسليم");
});

test("captain empty assignment is explicit and cannot invent an active order", () => {
  assert.deepEqual(
    buildCaptainOrderSummaryPolicy(undefined, assignmentStatusLabels, deliveryStatusLabels),
    {
      orderId: "",
      workItemLabel: "المهمة",
      pickupLabel: "",
      dropoffLabel: "",
      etaLabel: "",
      currentStageLabel: "",
      nextActionLabel: "",
      deliveryActionId: "none",
    },
  );
});

test("captain home ticker exposes loading, error, empty, delivered and active states", () => {
  const summary = buildCaptainOrderSummaryPolicy(
    assignment("picked_up"),
    assignmentStatusLabels,
    deliveryStatusLabels,
  );
  const availabilityMeta = { label: "متاح", description: "جاهز" };
  const cases = [
    ["loading", "تحميل", "go-inbox"],
    ["error", "تنبيه", "reset-inbox"],
    ["empty", "انتظار", "go-inbox"],
    ["delivered", "مغلق", "go-inbox"],
    ["ready", "#order-42", "toggle-order"],
  ];

  for (const [inboxState, expectedStatus, expectedAction] of cases) {
    const ticker = buildCaptainHomeTickerPolicy(
      {
        captainAvailabilityStatus: "available",
        inboxState,
        activeOrderId: " order-42 ",
      },
      availabilityMeta,
      summary,
    );
    assert.equal(ticker.statusLabel, expectedStatus);
    assert.equal(ticker.action, expectedAction);
    assert.equal(ticker.marquee, false);
  }
});

test("unavailable captain is fail-closed before inbox state is considered", () => {
  const summary = buildCaptainOrderSummaryPolicy(
    assignment(),
    assignmentStatusLabels,
    deliveryStatusLabels,
  );
  const ticker = buildCaptainHomeTickerPolicy(
    {
      captainAvailabilityStatus: "unavailable",
      inboxState: "ready",
      activeOrderId: "order-42",
    },
    { label: "غير متاح", description: "تم إيقاف استقبال الطلبات مؤقتًا" },
    summary,
  );

  assert.equal(ticker.statusLabel, "غير متاح");
  assert.equal(ticker.action, "toggle-availability");
});

test("captain presentation policy enforces GPS, store-courier and proof boundaries", () => {
  const normal = buildCaptainPresentationPolicy(state({ activeDeliveryStatus: "arrived_customer" }), true);
  assert.equal(normal.isCaptainAvailable, true);
  assert.equal(normal.isGpsEnabled, true);
  assert.equal(normal.captainPodRequired, true);
  assert.equal(normal.isStoreCourierMode, false);
  assert.equal(normal.showBottomNav, true);

  const gpsDisabled = buildCaptainPresentationPolicy(state({ gpsStatus: "disabled" }), true);
  assert.equal(gpsDisabled.isGpsEnabled, false);

  const storeCourier = buildCaptainPresentationPolicy(
    state({ captainAppMode: "store_courier_mode", activeDeliveryStatus: "arrived_customer" }),
    true,
  );
  assert.equal(storeCourier.isStoreCourierMode, true);
  assert.equal(storeCourier.captainPodRequired, true);

  const withoutAssignment = buildCaptainPresentationPolicy(state({ activeDeliveryStatus: "arrived_customer" }), false);
  assert.equal(withoutAssignment.captainPodRequired, false);
});

test("captain delivery action is derived from the canonical delivery status", () => {
  const cases = [
    ["driver_assigned", "تأكيد الوصول للمتجر", "arrive_store"],
    ["driver_arrived_store", "تأكيد الاستلام", "pickup"],
    ["picked_up", "تأكيد الوصول للعميل", "arrive_customer"],
    ["arrived_customer", "فتح إثبات التسليم", "open_pod"],
  ];
  for (const [status, label, actionId] of cases) {
    const summary = buildCaptainOrderSummaryPolicy(
      assignment(status),
      assignmentStatusLabels,
      deliveryStatusLabels,
    );
    assert.equal(summary.nextActionLabel, label);
    assert.equal(summary.deliveryActionId, actionId);
  }
});

test("captain navigation highlights only the canonical section for each mode", () => {
  assert.equal(buildCaptainBottomActiveIdPolicy("inbox", false), "orders");
  assert.equal(buildCaptainBottomActiveIdPolicy("account-finance", false), "wallet");
  assert.equal(buildCaptainBottomActiveIdPolicy("support-directory", false), "support");
  assert.equal(buildCaptainBottomActiveIdPolicy("account-profile", false), "profile");
  assert.equal(buildCaptainBottomActiveIdPolicy("home", true), "my-orders");
  assert.equal(buildCaptainBottomActiveIdPolicy("account", true), "profile");
  assert.equal(buildCaptainBottomActiveIdPolicy("detail", true), "");
});
