package http

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResolveManagedPayoutDestinationActorCanonicalizesAndBoundsIdentity(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.SetPathValue("actorType", " PARTNER ")
	request.SetPathValue("actorId", " actor/1 ")
	response := httptest.NewRecorder()
	actorType, actorID, ok := resolveManagedPayoutDestinationActor(response, request)
	if !ok || actorType != "partner" || actorID != "actor/1" {
		t.Fatalf("valid payout actor was not canonicalized: %q %q %v", actorType, actorID, ok)
	}

	for _, testCase := range []struct {
		name      string
		typeValue string
		idValue   string
	}{
		{name: "unsupported type", typeValue: "client", idValue: "actor-1"},
		{name: "missing id", typeValue: "captain", idValue: ""},
		{name: "oversized id", typeValue: "field", idValue: strings.Repeat("x", 201)},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.SetPathValue("actorType", testCase.typeValue)
			req.SetPathValue("actorId", testCase.idValue)
			res := httptest.NewRecorder()
			if _, _, ok := resolveManagedPayoutDestinationActor(res, req); ok {
				t.Fatal("invalid payout actor was accepted")
			}
			if res.Code != http.StatusBadRequest {
				t.Fatalf("status=%d, want %d", res.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestManagedPayoutDestinationPathEscapesBothIdentitySegments(t *testing.T) {
	path := managedPayoutDestinationPath("partner", "actor/one")
	if path != "/wlt/payout-destinations/partner/actor%2Fone" {
		t.Fatalf("path=%q, want escaped actor identity", path)
	}
}

func TestDecodePayoutDestinationProjectionEnforcesOfficialWalletOwnership(t *testing.T) {
	valid := []byte(`{"payoutDestination":{"id":"destination-1","ownerActorId":"partner-1","ownerActorType":"partner","officialWalletProviderKey":"bank-yemen","destinationVersion":2,"destinationMethod":"official_wallet","maskedDestinationReference":"****1234","destinationVerificationStatus":"verified"}}`)
	projection, err := decodePayoutDestinationProjection(valid, "partner", "partner-1")
	if err != nil {
		t.Fatalf("valid official-wallet projection rejected: %v", err)
	}
	if projection.ID != "destination-1" || projection.DestinationMethod != "official_wallet" || projection.MaskedDestinationReference != "****1234" {
		t.Fatalf("projection lost governed fields: %#v", projection)
	}

	invalid := []struct {
		name      string
		body      string
		actorType string
		actorID   string
	}{
		{name: "malformed JSON", body: "not-json", actorType: "partner", actorID: "partner-1"},
		{name: "wrong owner", body: string(valid), actorType: "partner", actorID: "partner-2"},
		{name: "wrong actor type", body: string(valid), actorType: "captain", actorID: "partner-1"},
		{name: "empty destination", body: `{"payoutDestination":{"ownerActorId":"partner-1","ownerActorType":"partner","destinationVersion":2,"destinationMethod":"official_wallet"}}`, actorType: "partner", actorID: "partner-1"},
		{name: "wrong method", body: `{"payoutDestination":{"id":"destination-1","ownerActorId":"partner-1","ownerActorType":"partner","officialWalletProviderKey":"bank-yemen","destinationVersion":2,"destinationMethod":"wallet"}}`, actorType: "partner", actorID: "partner-1"},
	}
	for _, testCase := range invalid {
		t.Run(testCase.name, func(t *testing.T) {
			if _, err := decodePayoutDestinationProjection([]byte(testCase.body), testCase.actorType, testCase.actorID); err == nil {
				t.Fatal("invalid payout projection was accepted")
			}
		})
	}
}

func TestWriteManagedPayoutDestinationResponsePreservesStatusAndFailureBoundary(t *testing.T) {
	response := httptest.NewRecorder()
	writeManagedPayoutDestinationResponse(response, http.StatusOK, []byte(`{"ok":true}`), nil)
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/json" || response.Body.String() != `{"ok":true}` {
		t.Fatalf("successful payout response was not preserved: code=%d contentType=%q body=%q", response.Code, response.Header().Get("Content-Type"), response.Body.String())
	}

	response = httptest.NewRecorder()
	writeManagedPayoutDestinationResponse(response, http.StatusCreated, nil, nil)
	if response.Code != http.StatusCreated || response.Body.Len() != 0 {
		t.Fatalf("empty payout response was not preserved: code=%d body=%q", response.Code, response.Body.String())
	}

	response = httptest.NewRecorder()
	writeManagedPayoutDestinationResponse(response, http.StatusOK, []byte(`{"secret":"hidden"}`), errors.New("wlt unavailable"))
	if response.Code != http.StatusBadGateway || strings.Contains(response.Body.String(), "hidden") {
		t.Fatalf("payout failure leaked response or wrong status: code=%d body=%q", response.Code, response.Body.String())
	}
}
