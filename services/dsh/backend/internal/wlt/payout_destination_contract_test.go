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

// The WLT partner-only payout destination surface was retired: WLT serves only
// /wlt/payout-destinations/{actorType}/{actorId} and asserts the old shape stays
// unregistered in retired_financial_routes_test.go. These tests pin the DSH
// client to the surviving contract so the retired shape cannot come back.

func readCanonicalPayoutContract(t *testing.T) string {
	t.Helper()
	// The WLT contract lives outside the DSH module; resolve it from the repo root.
	path := filepath.Join("..", "..", "..", "..", "wlt", "contracts", "wlt.payouts-destinations.openapi.yaml")
	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read canonical WLT payout destination contract: %v", err)
	}
	return string(body)
}

func TestPartnerPayoutDestinationPathMatchesCanonicalContract(t *testing.T) {
	contract := readCanonicalPayoutContract(t)

	for _, required := range []string{
		"/wlt/payout-destinations/{actorType}/{actorId}:",
		"/wlt/payout-destinations/{actorType}/{actorId}/deactivate:",
	} {
		if !strings.Contains(contract, required) {
			t.Fatalf("canonical contract no longer declares %s", required)
		}
	}
	if strings.Contains(contract, "/wlt/payout-destinations/{partnerId}") {
		t.Fatal("canonical contract must not reintroduce the retired partner-only path")
	}

	if got := partnerPayoutDestinationPath("partner-1"); got != "/wlt/payout-destinations/partner/partner-1" {
		t.Fatalf("DSH addresses a non-canonical payout destination path: %s", got)
	}
}

func TestUpsertPayoutDestinationSendsOperatorIdAndReadsEnvelope(t *testing.T) {
	var gotPath string
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"payoutDestination": map[string]any{
				"id":                   "wpd-1",
				"ownerActorId":         "partner-1",
				"ownerActorType":       "partner",
				"settlementPreference": "bank",
				"beneficiaryName":      "Owner",
				"active":               true,
				"updatedAt":            "2026-01-01T00:00:00Z",
			},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-test-token")
	ctx := WithTenantContext(context.Background(), "tenant-test")
	ref, err := client.UpsertPayoutDestination(ctx, "partner-1", PayoutDestinationUpsertInput{
		BeneficiaryName:      "Owner",
		SettlementPreference: "bank",
		CreatedByActorID:     "operator-1",
	})
	if err != nil {
		t.Fatalf("upsert payout destination: %v", err)
	}

	if gotPath != "/wlt/payout-destinations/partner/partner-1" {
		t.Fatalf("unexpected upsert path: %s", gotPath)
	}
	// WLT decodes with DisallowUnknownFields against PayoutDestinationInput, so
	// the operator must be sent as operatorId, never as createdByActorId.
	if _, present := gotBody["createdByActorId"]; present {
		t.Fatal("request still sends the retired createdByActorId field")
	}
	if gotBody["operatorId"] != "operator-1" {
		t.Fatalf("operatorId was not sent: %#v", gotBody)
	}
	if ref.ID != "wpd-1" || ref.OwnerActorID != "partner-1" || ref.OwnerActorType != "partner" {
		t.Fatalf("envelope was not decoded into an actor-owned reference: %#v", ref)
	}
}

func TestGetPayoutDestinationRejectsAnotherActorsDestination(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"payoutDestination": map[string]any{
				"id":             "wpd-1",
				"ownerActorId":   "captain-9",
				"ownerActorType": "captain",
				"active":         true,
			},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-test-token")
	ctx := WithTenantContext(context.Background(), "tenant-test")
	if _, err := client.GetPayoutDestination(ctx, "partner-1"); err == nil {
		t.Fatal("readback accepted a destination owned by a different actor")
	}
}
