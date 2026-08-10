package http

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/wlt"
)

func TestWriteCaptainFinancialEligibilityErrorUsesTypedCauses(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		status int
		code   string
	}{
		{"unavailable", wlt.ErrDispatchFinancialEligibilityUnavailable, http.StatusServiceUnavailable, "WLT_FINANCIAL_ELIGIBILITY_UNAVAILABLE"},
		{"invalid decision", wlt.ErrDispatchFinancialEligibilityInvalidDecision, http.StatusConflict, "WLT_FINANCIAL_DECISION_INVALID"},
		{"missing snapshot", dispatch.ErrCaptainNotEligible, http.StatusConflict, "CAPTAIN_WLT_FINANCIAL_DECISION_REQUIRED"},
		{"invalid request", wlt.ErrDispatchFinancialEligibilityInvalidRequest, http.StatusBadRequest, "INVALID_REQUEST"},
		{"wrapped invalid request", errors.Join(errors.New("context"), dispatch.ErrInvalid), http.StatusBadRequest, "INVALID_REQUEST"},
		{"unknown", errors.New("opaque downstream failure"), http.StatusInternalServerError, "INTERNAL_ERROR"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			writeCaptainFinancialEligibilityError(recorder, test.err)
			if recorder.Code != test.status || !strings.Contains(recorder.Body.String(), `"code":"`+test.code+`"`) {
				t.Fatalf("status=%d body=%s, want status=%d code=%s", recorder.Code, recorder.Body.String(), test.status, test.code)
			}
		})
	}
}
