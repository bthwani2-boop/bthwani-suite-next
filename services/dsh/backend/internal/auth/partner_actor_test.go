package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestProvisionPartnerActorUsesTrustedDSHBoundary(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/internal/partner/actors/provision" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer dsh-secret" || r.Header.Get("X-Service-Caller") != "dsh" || r.Header.Get("X-Operator-Context-ID") != "operator-main" {
			t.Fatalf("missing trusted headers: %#v", r.Header)
		}
		var input PartnerActorProvisionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if input.PermissionBundle != "manager" || input.StoreID != "store-1" {
			t.Fatalf("unexpected input: %#v", input)
		}
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(PartnerActorView{
			ActorID: "partner-actor-1", Username: input.Username, PhoneE164: input.PhoneE164, Roles: []string{"partner"},
		})
	}))
	defer server.Close()

	client := NewClientWithInternalAccess(server.URL, "dsh-secret", "operator-main")
	view, err := client.ProvisionPartnerActor(context.Background(), PartnerActorProvisionInput{
		Username: "partner-967771000001", PhoneE164: "+967771000001", PermissionBundle: "manager", StoreID: "store-1",
	})
	if err != nil || view.ActorID != "partner-actor-1" {
		t.Fatalf("unexpected result view=%#v err=%v", view, err)
	}
}

func TestIssuePartnerActivationForwardsIdempotencyAndCorrelation(t *testing.T) {
	expiresAt := time.Now().UTC().Add(10 * time.Minute).Truncate(time.Second)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/internal/partner/actors/partner-actor-1/activations" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
		if r.Header.Get("Idempotency-Key") != "invite-1" || r.Header.Get("X-Correlation-ID") != "correlation-1" {
			t.Fatalf("missing operation headers: %#v", r.Header)
		}
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(PartnerActivationResult{
			ActivationID: "activation-1", Code: "123456", MaskedPhone: "+967*******01", ExpiresAt: expiresAt,
		})
	}))
	defer server.Close()

	client := NewClientWithInternalAccess(server.URL, "dsh-secret", "operator-main")
	result, err := client.IssuePartnerActivation(
		context.Background(),
		"partner-actor-1",
		PartnerActivationInput{IssuedByActorID: "owner-1", StoreID: "store-1"},
		"invite-1",
		"correlation-1",
	)
	if err != nil || result.Code != "123456" || !result.ExpiresAt.Equal(expiresAt) {
		t.Fatalf("unexpected result=%#v err=%v", result, err)
	}
}

func TestPartnerMutationClientFailsClosedWithoutTrustConfiguration(t *testing.T) {
	client := NewClient("https://identity.internal")
	_, err := client.ProvisionPartnerActor(context.Background(), PartnerActorProvisionInput{
		Username: "partner-user", PhoneE164: "+967771000001", PermissionBundle: "staff", StoreID: "store-1",
	})
	if err != ErrIdentityUnavailable {
		t.Fatalf("expected unavailable without service trust, got %v", err)
	}
}
