package orders

import (
	"encoding/json"
	"slices"
	"testing"
)

func TestOrderCreateFingerprintIsStableAndRequestSpecific(t *testing.T) {
	first := orderCreateFingerprint(" 8ba4e0d1-2f80-42b5-a88a-f8600cf2c4f5 ")
	replay := orderCreateFingerprint("8ba4e0d1-2f80-42b5-a88a-f8600cf2c4f5")
	other := orderCreateFingerprint("c9958a72-cbbd-4756-a54f-ac8138044373")

	if first != replay {
		t.Fatalf("expected canonical checkout fingerprint replay, got %q and %q", first, replay)
	}
	if first == other {
		t.Fatal("different Checkout Intents must not share a request fingerprint")
	}
	if len(first) != 64 {
		t.Fatalf("expected SHA-256 hex fingerprint length 64, got %d", len(first))
	}
}

func TestOrderTruthIdentifierValidationRejectsDatabaseCastErrors(t *testing.T) {
	if !validOrderTruthID("8ba4e0d1-2f80-42b5-a88a-f8600cf2c4f5") {
		t.Fatal("canonical UUID must be accepted")
	}
	for _, invalid := range []string{"", "not-a-uuid", "../other-order", "8ba4e0d1"} {
		if validOrderTruthID(invalid) {
			t.Fatalf("malformed order identifier %q must be rejected before SQL", invalid)
		}
	}
}

func TestOrderTruthRedactionProtectsPartnerAndOperatorEventMetadata(t *testing.T) {
	for _, viewerRole := range []string{"partner", "operator"} {
		truth := &OrderTruth{
			ClientID:                "client-sensitive",
			DeliveryAddressSnapshot: json.RawMessage(`{"formattedAddress":"private address"}`),
			StatusTimeline: []OrderTruthEvent{{
				Metadata: json.RawMessage(`{"phone":"+967700000000","providerTrace":"secret"}`),
			}},
		}
		RedactOrderTruthForViewer(truth, viewerRole)
		if truth.ClientID != "" {
			t.Fatalf("%s response leaked client id", viewerRole)
		}
		if string(truth.DeliveryAddressSnapshot) != `{"redacted":true}` {
			t.Fatalf("%s response leaked address snapshot: %s", viewerRole, truth.DeliveryAddressSnapshot)
		}
		if len(truth.StatusTimeline) != 1 || string(truth.StatusTimeline[0].Metadata) != `{}` {
			t.Fatalf("%s response leaked event metadata: %#v", viewerRole, truth.StatusTimeline)
		}
	}
}

func TestAllowedActionsAreServerOwnedByActorAndState(t *testing.T) {
	clientPending := AllowedActions(StatusPending, "client")
	if !slices.Contains(clientPending, "view") || !slices.Contains(clientPending, "cancel_if_policy_allows") {
		t.Fatalf("client pending actions are incomplete: %#v", clientPending)
	}
	if slices.Contains(clientPending, "accept") {
		t.Fatalf("client must not receive partner action: %#v", clientPending)
	}

	partnerPending := AllowedActions(StatusPending, "partner")
	if !slices.Contains(partnerPending, "accept") || !slices.Contains(partnerPending, "reject") {
		t.Fatalf("partner pending actions are incomplete: %#v", partnerPending)
	}
	if slices.Contains(partnerPending, "cancel_if_policy_allows") {
		t.Fatalf("partner must not receive client cancellation action: %#v", partnerPending)
	}

	operatorPreparing := AllowedActions(StatusPreparing, "operator")
	if !slices.Contains(operatorPreparing, "view_audit") || !slices.Contains(operatorPreparing, "cancel_if_policy_allows") {
		t.Fatalf("operator preparing actions are incomplete: %#v", operatorPreparing)
	}

	clientDelivered := AllowedActions(StatusDelivered, "client")
	if !slices.Contains(clientDelivered, "rate") || slices.Contains(clientDelivered, "cancel_if_policy_allows") {
		t.Fatalf("delivered client actions are invalid: %#v", clientDelivered)
	}
}

func TestCurrentOwnerFollowsOperationalState(t *testing.T) {
	cases := []struct {
		status OrderStatus
		want   string
	}{
		{StatusPending, "partner"},
		{StatusPreparing, "partner"},
		{StatusDriverAssigned, "captain"},
		{StatusPickedUp, "captain"},
		{StatusDelivered, "terminal"},
		{OrderStatus("cancelled_by_client"), "terminal"},
		{OrderStatus("failed_dispatch"), "terminal"},
	}

	for _, item := range cases {
		if got := currentOwner(item.status); got != item.want {
			t.Errorf("currentOwner(%q)=%q, want %q", item.status, got, item.want)
		}
	}
}
