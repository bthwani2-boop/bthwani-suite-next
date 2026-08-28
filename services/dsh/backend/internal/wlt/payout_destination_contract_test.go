package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func readCanonicalPayoutContract(t *testing.T) string {
	t.Helper()
	path := filepath.Join("..", "..", "..", "..", "wlt", "contracts", "wlt.payouts-destinations.openapi.yaml")
	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read canonical WLT payout destination contract: %v", err)
	}
	return string(body)
}

func TestPayoutDestinationPathMatchesCanonicalContract(t *testing.T) {
	contract := readCanonicalPayoutContract(t)
	for _, required := range []string{
		"/wlt/payout-destinations/{actorType}/{actorId}:",
		"/wlt/payout-destinations/{actorType}/{actorId}/verify:",
		"/wlt/payout-destinations/{actorType}/{actorId}/deactivate:",
		"officialWalletProviderKey",
		"destinationReference",
	} {
		if !strings.Contains(contract, required) {
			t.Fatalf("canonical contract no longer declares %s", required)
		}
	}
	if strings.Contains(contract, "/wlt/payout-destinations/{partnerId}") {
		t.Fatal("canonical contract must not reintroduce the retired partner-only path")
	}
	operation, err := Registry.GetOperation("finance.payout_destinations.read")
	if err != nil {
		t.Fatal(err)
	}
	got, err := operation.Path(map[string]string{"actorType": "partner", "actorId": "partner-1"})
	if err != nil {
		t.Fatal(err)
	}
	if got != "/wlt/payout-destinations/partner/partner-1" {
		t.Fatalf("DSH addresses a non-canonical payout destination path: %s", got)
	}
}

func TestGetPayoutDestinationRejectsAnotherActorsDestination(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"payoutDestination": map[string]any{
				"id":                            "wpd-1",
				"ownerActorId":                  "captain-9",
				"ownerActorType":                "captain",
				"officialWalletProviderKey":     "bthwani_local_wallet",
				"destinationVersion":            1,
				"destinationMethod":             "official_wallet",
				"maskedDestinationReference":    "******7890",
				"destinationVerificationStatus": "verified",
				"beneficiaryName":               "Captain",
				"active":                        true,
				"updatedAt":                     "2026-01-01T00:00:00Z",
			},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-test-token")
	ctx := WithOperatorContext(context.Background(), "OperatorContext-test")
	if _, err := client.GetPayoutDestination(ctx, "partner-1"); err == nil {
		t.Fatal("readback accepted a destination owned by a different actor")
	}
}
