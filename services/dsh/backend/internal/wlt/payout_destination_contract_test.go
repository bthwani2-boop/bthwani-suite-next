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

func TestPartnerPayoutDestinationPathMatchesCanonicalContract(t *testing.T) {
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
	if got := partnerPayoutDestinationPath("partner-1"); got != "/wlt/payout-destinations/partner/partner-1" {
		t.Fatalf("DSH addresses a non-canonical payout destination path: %s", got)
	}
}

func TestUpsertPayoutDestinationSendsOfficialWalletIdentityOnly(t *testing.T) {
	var gotPath string
	var gotBody map[string]any
	var gotDelegatedOperatorContext string
	var gotDelegatedPrincipal string
	var gotLegacyOperatorContext string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotDelegatedOperatorContext = r.Header.Get("X-Delegated-Operator-Context")
		gotDelegatedPrincipal = r.Header.Get("X-Delegated-Principal-ID")
		gotLegacyOperatorContext = r.Header.Get("X-Operator-Context-ID")
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"payoutDestination": map[string]any{
				"id":                            "wpd-1",
				"ownerActorId":                  "partner-1",
				"ownerActorType":                "partner",
				"officialWalletProviderKey":     "bthwani_local_wallet",
				"destinationVersion":            1,
				"destinationMethod":             "official_wallet",
				"maskedDestinationReference":    "******7890",
				"destinationVerificationStatus": "unverified",
				"beneficiaryName":               "Owner",
				"active":                        true,
				"updatedAt":                     "2026-01-01T00:00:00Z",
			},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-test-token")
	ctx := WithOperatorContext(context.Background(), "OperatorContext-test")
	ref, err := client.UpsertPayoutDestination(ctx, "partner-1", PayoutDestinationUpsertInput{
		BeneficiaryName:           "Owner",
		OfficialWalletProviderKey: "bthwani_local_wallet",
		DestinationReference:      "7771237890",
		CreatedByActorID:          "operator-1",
	})
	if err != nil {
		t.Fatalf("upsert payout destination: %v", err)
	}

	if gotPath != "/wlt/payout-destinations/partner/partner-1" {
		t.Fatalf("unexpected upsert path: %s", gotPath)
	}
	if gotDelegatedOperatorContext != "OperatorContext-test" {
		t.Fatalf("delegated OperatorContext was not sent: %q", gotDelegatedOperatorContext)
	}
	if gotDelegatedPrincipal != "operator-1" {
		t.Fatalf("delegated principal was not sent: %q", gotDelegatedPrincipal)
	}
	if gotLegacyOperatorContext != "" {
		t.Fatalf("legacy OperatorContext header must not be emitted: %q", gotLegacyOperatorContext)
	}
	if _, present := gotBody["destinationMethod"]; present {
		t.Fatal("DSH still sends caller-controlled destinationMethod")
	}
	if _, present := gotBody["createdByActorId"]; present {
		t.Fatal("request still sends the retired createdByActorId field")
	}
	if _, present := gotBody["operatorId"]; present {
		t.Fatal("delegated finance principal must not be supplied in the request body")
	}
	if gotBody["officialWalletProviderKey"] != "bthwani_local_wallet" {
		t.Fatalf("officialWalletProviderKey was not sent: %#v", gotBody)
	}
	if gotBody["destinationReference"] != "7771237890" {
		t.Fatalf("destinationReference was not sent: %#v", gotBody)
	}
	if ref.ID != "wpd-1" || ref.OwnerActorID != "partner-1" || ref.OwnerActorType != "partner" || ref.DestinationMethod != "official_wallet" {
		t.Fatalf("envelope was not decoded into a canonical official-wallet reference: %#v", ref)
	}
}

func TestUpsertPayoutDestinationRejectsIncompleteOfficialWalletIdentity(t *testing.T) {
	client := NewClient("http://127.0.0.1:1", "service-test-token")
	ctx := WithOperatorContext(context.Background(), "OperatorContext-test")
	_, err := client.UpsertPayoutDestination(ctx, "partner-1", PayoutDestinationUpsertInput{
		BeneficiaryName:  "Owner",
		CreatedByActorID: "operator-1",
	})
	if err == nil {
		t.Fatal("incomplete official-wallet identity was accepted")
	}
}

func TestGetPayoutDestinationRejectsAnotherActorsDestination(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
