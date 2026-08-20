package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"workforce-api/internal/workforce"
)

func TestInternalReadinessRoutesRequireDSHServiceIdentity(t *testing.T) {
	mux := http.NewServeMux()
	RegisterInternalReadinessRoutes(mux, nil, "configured-dsh-token")

	for _, path := range []string{
		"/internal/captains/captain-1/readiness",
		"/internal/fields/field-1/readiness",
	} {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, path, nil)
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, request)
			if response.Code != http.StatusUnauthorized {
				t.Fatalf("internal readiness must fail closed without DSH identity, got %d", response.Code)
			}

			request = httptest.NewRequest(http.MethodGet, path, nil)
			request.Header.Set("Authorization", "Bearer configured-dsh-token")
			request.Header.Set("X-Service-Caller", "dsh")
			response = httptest.NewRecorder()
			mux.ServeHTTP(response, request)
			if response.Code != http.StatusBadRequest {
				t.Fatalf("authenticated route must require trusted OperatorContext, got %d", response.Code)
			}

			request = httptest.NewRequest(http.MethodGet, path, nil)
			request.Header.Set("Authorization", "Bearer configured-dsh-token")
			request.Header.Set("X-Service-Caller", "dsh")
			request.Header.Set("X-Operator-Context-ID", "context-main")
			response = httptest.NewRecorder()
			mux.ServeHTTP(response, request)
			if response.Code != http.StatusServiceUnavailable {
				t.Fatalf("authenticated route must reach readiness handler, got %d", response.Code)
			}
		})
	}
}

func TestInternalActivationReadinessContractMapsReadyToIsActive(t *testing.T) {
	mapped := toInternalActivationReadiness(workforce.ActivationReadiness{
		Ready:   true,
		Missing: nil,
	})
	body, err := json.Marshal(map[string]any{"activationReadiness": mapped})
	if err != nil {
		t.Fatal(err)
	}
	var decoded struct {
		ActivationReadiness struct {
			IsActive bool     `json:"isActive"`
			Missing  []string `json:"missing"`
		} `json:"activationReadiness"`
	}
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatal(err)
	}
	if !decoded.ActivationReadiness.IsActive {
		t.Fatal("ready Workforce state must map to isActive=true at the DSH service boundary")
	}
	if decoded.ActivationReadiness.Missing == nil || len(decoded.ActivationReadiness.Missing) != 0 {
		t.Fatalf("missing must be a deterministic empty array, got %#v", decoded.ActivationReadiness.Missing)
	}
}
