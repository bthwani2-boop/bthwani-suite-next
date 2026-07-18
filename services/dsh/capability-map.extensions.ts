import type { DshCapability } from "./capability-map";

/**
 * Adds operations and surface coverage to an existing canonical DSH capability.
 * Extension entries are never standalone owners.
 */
export type DshCapabilityExtension = {
  readonly id: DshCapability["id"];
  readonly status: DshCapability["status"];
  readonly contractOperations: readonly string[];
  readonly surfaces: readonly string[];
  readonly runtimeBound: boolean;
  readonly closureState: DshCapability["closureState"];
  readonly topic?: DshCapability["topic"];
  readonly topicScope: readonly string[];
};

export const DSH_CAPABILITY_MAP_EXTENSIONS = [
  {
    id: "dsh.field.finance",
    status: "experience-fix-required",
    contractOperations: [
      "DELETEDshFieldFinancePayoutDestinationsDestinationId",
      "GETDshCaptainFinanceCommissions",
      "GETDshCaptainFinancePayouts",
      "GETDshFieldFinanceCommissions",
      "GETDshFieldFinancePayoutDestinations",
      "GETDshFieldFinancePayouts",
      "GETDshFieldFinanceWallet",
      "PATCHDshFieldFinancePayoutDestinationsDestinationId",
      "POSTDshCaptainFinanceCodRecordsRecordIdCollect",
      "POSTDshCaptainFinanceCodRecordsRecordIdRemit",
      "POSTDshCaptainFinancePayouts",
      "POSTDshFieldFinancePayoutDestinations",
      "POSTDshFieldFinancePayouts",
      "completeDshControlPanelFinancePayoutRequest",
      "createDshGovernedSettlementFromDeliveredOrders",
      "failDshControlPanelFinancePayoutRequest",
      "processDshControlPanelFinancePayoutRequest",
      "upsertDshSettlementPolicy",
    ],
    surfaces: ["app-field", "app-captain", "control-panel"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "field-ops",
    topicScope: [
      "field-finance",
      "captain-finance",
      "settlements",
      "payout-processing",
    ],
  },
  {
    id: "dsh.support.hub",
    status: "experience-fix-required",
    contractOperations: [
      "approveDshSpecialRequestQuote",
      "assignDshSpecialRequestDispatch",
      "cancelDshClientSpecialRequest",
      "createDshClientSpecialRequest",
      "getDshClientSpecialRequest",
      "getDshOperatorSpecialRequest",
      "listDshClientSpecialRequests",
      "listDshOperatorSpecialRequests",
      "updateDshOperatorSpecialRequest",
      "listDshPartnerSupportTickets",
      "createDshPartnerSupportTicket",
      "getDshPartnerSupportTicket",
      "listDshPartnerSupportMessages",
      "addDshPartnerSupportMessage",
      "listDshClientSupportTickets",
      "createDshClientSupportTicket",
      "getDshClientSupportTicket",
      "listDshClientSupportMessages",
      "addDshClientSupportMessage",
      "listDshOperatorSupportTickets",
      "getDshOperatorSupportTicket",
      "updateDshOperatorSupportTicket",
      "listDshOperatorSupportMessages",
      "addDshOperatorSupportMessage",
      "listDshOperatorSupportEvents",
    ],
    surfaces: ["app-client", "app-partner", "app-captain", "control-panel"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "support",
    topicScope: [
      "special-requests",
      "quotes",
      "dispatch-handoff",
      "client-ticket-submission",
      "partner-ticket-submission",
      "captain-ticket-submission",
      "ticket-conversation",
      "operator-readback",
      "support-audit",
    ],
  },
  {
    id: "dsh.client.dispatch",
    status: "experience-fix-required",
    contractOperations: [
      "arriveDshPartnerDeliveryTask",
      "assignDshPartnerDeliveryTask",
      "departDshPartnerDeliveryTask",
      "extendDshPickupWindow",
      "getDshOperatorPartnerDelivery",
      "getDshOperatorPickup",
      "listDshOperatorPartnerDeliveries",
      "listDshOperatorPickups",
      "markDshPartnerDeliveryPickedUp",
      "markDshPickupCustomerArrived",
      "markDshPickupNoShow",
      "markDshPickupReady",
      "notifyDshPickupCustomer",
      "raiseDshPartnerDeliveryException",
      "submitDshPartnerDeliveryProof",
      "verifyDshPickupSession",
    ],
    surfaces: ["control-panel", "app-partner", "app-captain", "app-client"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "commerce",
    topicScope: ["partner-delivery", "pickup", "proof", "exceptions"],
  },
  {
    id: "dsh.client.checkout",
    status: "experience-fix-required",
    contractOperations: [
      "listDshClientAddresses",
      "createDshClientAddress",
      "updateDshClientAddress",
      "deleteDshClientAddress",
      "setDshClientDefaultAddress",
      "searchDshClientMapLocations",
      "reverseDshClientMapLocation",
    ],
    surfaces: ["app-client"],
    runtimeBound: false,
    closureState: "FIX_REQUIRED",
    topic: "commerce",
    topicScope: [
      "client-address-book",
      "governed-map-search",
      "reverse-geocoding",
      "serviceability-address",
      "checkout-address",
    ],
  },
  {
    id: "dsh.policies",
    status: "experience-fix-required",
    contractOperations: [
      "listDshOperatorServiceAreas",
      "upsertDshOperatorServiceArea",
    ],
    surfaces: ["control-panel"],
    runtimeBound: false,
    closureState: "FIX_REQUIRED",
    topicScope: [
      "service-area-geofences",
      "coordinate-to-service-area",
      "map-provider-boundary",
    ],
  },
] as const satisfies readonly DshCapabilityExtension[];
