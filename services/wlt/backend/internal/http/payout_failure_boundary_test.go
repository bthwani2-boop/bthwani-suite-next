package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type openDecisionService struct{}

func (openDecisionService) IsCapabilityKilled(context.Context, string, string) (bool, error) {
	return false, nil
}

func payoutFailureRequest(t *testing.T, path, body string) *http.Request {
	t.Helper()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer test-dsh-service-token")
	req.Header.Set("X-Service-Caller", "dsh")
	req.Header.Set("X-Delegated-Operator-Context", "payout-failure-boundary-context")
	req.Header.Set("X-Correlation-ID", "payout-failure-boundary-correlation")
	req.Header.Set("Idempotency-Key", "payout-failure-boundary-key")
	return req
}

// The contract declares POST /wlt/payout-requests/{payoutId}/fail as a
// fail-closed boundary. An unregistered path answered 404, which is not a
// governed financial denial, so the binding gate treated the contract as
// unimplemented.
func TestManualPayoutFailureIsRegisteredAndRefused(t *testing.T) {
	router := NewRouter(nil, true, openDecisionService{})
	req := payoutFailureRequest(t, "/wlt/payout-requests/payout-1/fail", `{"operatorId":"operator-1"}`)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 refusal, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "RECONCILIATION_REQUIRED") {
		t.Fatalf("expected RECONCILIATION_REQUIRED, got %s", rec.Body.String())
	}
}

func TestManualPayoutFailureRejectsUngovernedRequest(t *testing.T) {
	router := NewRouter(nil, true, openDecisionService{})
	for name, body := range map[string]string{
		"missing operator": `{}`,
		"blank operator":   `{"operatorId":"   "}`,
		"unknown field":    `{"operatorId":"operator-1","reason":"provider said so"}`,
		"malformed body":   `{`,
	} {
		req := payoutFailureRequest(t, "/wlt/payout-requests/payout-1/fail", body)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("%s: expected 403, got %d: %s", name, rec.Code, rec.Body.String())
		}
		if !strings.Contains(rec.Body.String(), "MANUAL_PAYOUT_FAILURE_FORBIDDEN") {
			t.Fatalf("%s: expected MANUAL_PAYOUT_FAILURE_FORBIDDEN, got %s", name, rec.Body.String())
		}
	}
}

// The boundary must never need a database handle: a nil *sql.DB router proves it
// cannot read payout state or release a hold on the way to refusing.
func TestManualPayoutFailureTouchesNoFinancialState(t *testing.T) {
	router := NewRouter(nil, true, openDecisionService{})
	req := payoutFailureRequest(t, "/wlt/payout-requests/payout-1/fail", `{"operatorId":"operator-1"}`)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code == http.StatusInternalServerError {
		t.Fatalf("boundary reached the database: %d %s", rec.Code, rec.Body.String())
	}
}
