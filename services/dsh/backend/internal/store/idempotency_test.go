package store

import "testing"

func TestStoreMutationRequestHashScopesResourceIdentity(t *testing.T) {
	payload := PartnerSettingsInput{
		ExpectedVersion: 1,
		Status:          "ready",
		DeliveryModes:   []string{"delivery"},
		Reason:          "verified settings",
	}

	base, err := storeMutationRequestHash("operator-a", "actor-a", "store-a", "partner.settings.update", payload)
	if err != nil {
		t.Fatalf("hash base request: %v", err)
	}
	same, err := storeMutationRequestHash("operator-a", "actor-a", "store-a", "partner.settings.update", payload)
	if err != nil {
		t.Fatalf("hash identical request: %v", err)
	}
	if base != same {
		t.Fatalf("identical canonical request must hash identically")
	}

	cases := []struct {
		name              string
		operatorContextID string
		actorID           string
		storeID           string
		operation         string
	}{
		{name: "operator context", operatorContextID: "operator-b", actorID: "actor-a", storeID: "store-a", operation: "partner.settings.update"},
		{name: "actor", operatorContextID: "operator-a", actorID: "actor-b", storeID: "store-a", operation: "partner.settings.update"},
		{name: "store", operatorContextID: "operator-a", actorID: "actor-a", storeID: "store-b", operation: "partner.settings.update"},
		{name: "operation", operatorContextID: "operator-a", actorID: "actor-a", storeID: "store-a", operation: "operator.store.govern"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := storeMutationRequestHash(tc.operatorContextID, tc.actorID, tc.storeID, tc.operation, payload)
			if err != nil {
				t.Fatalf("hash changed request: %v", err)
			}
			if got == base {
				t.Fatalf("changing %s must change the canonical request hash", tc.name)
			}
		})
	}
}

func TestStoreMutationIdempotencyLockKeyMatchesReceiptNamespace(t *testing.T) {
	base := storeMutationIdempotencyLockKey("actor-a", "partner.settings.update", "idem-12345678")
	if base == "" {
		t.Fatal("lock key must not be empty")
	}
	if same := storeMutationIdempotencyLockKey(" actor-a ", " partner.settings.update ", " idem-12345678 "); same != base {
		t.Fatalf("lock key must normalize receipt namespace values")
	}
	if other := storeMutationIdempotencyLockKey("actor-a", "partner.settings.update", "idem-87654321"); other == base {
		t.Fatalf("different idempotency keys must not share the same logical lock key")
	}
}
