package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dsh-api/internal/fieldassignment"
	"dsh-api/internal/workforceclient"
)

func TestGetFieldSelfReadinessRoute(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil, nil)
	RegisterFieldReadinessRoutes(router, nil, nil, nil, nil)
	req, _ := http.NewRequest("GET", "/dsh/field/me/readiness", nil)
	_, pattern := router.Handler(req)
	if pattern != "GET /dsh/field/me/readiness" {
		t.Fatalf("expected field self-readiness route, got %q", pattern)
	}
}

func TestGetFieldAggregatedReadinessUsesWorkforceActivationBoundary(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/internal/fields/field-1/readiness" {
			t.Fatalf("Workforce readiness path = %q", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer service-token" {
			t.Fatalf("Workforce readiness authorization = %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("Workforce readiness caller = %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Operator-Context-ID") != "context-main" {
			t.Fatalf("Workforce readiness context = %q", r.Header.Get("X-Operator-Context-ID"))
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"activationReadiness": map[string]any{
				"isActive": false,
				"missing":  []string{"DOCUMENTS_EXPIRED"},
			},
		})
	}))
	defer upstream.Close()

	server := &protectedStoreServer{workforce: workforceclient.NewClient(upstream.URL, "service-token")}
	readiness, err := server.getFieldAggregatedReadiness(httptest.NewRequest(http.MethodGet, "/dsh/field/me/readiness", nil), "context-main", "field-1")
	if err != nil {
		t.Fatalf("getFieldAggregatedReadiness() error = %v", err)
	}
	if readiness.Ready {
		t.Fatal("field readiness should preserve Workforce inactive state")
	}
	if len(readiness.Missing) != 1 || readiness.Missing[0] != "DOCUMENTS_EXPIRED" {
		t.Fatalf("field readiness missing = %#v", readiness.Missing)
	}
}

func TestGetFieldAggregatedReadinessFailsClosedWhenWorkforceUnavailable(t *testing.T) {
	server := &protectedStoreServer{}
	_, err := server.getFieldAggregatedReadiness(httptest.NewRequest(http.MethodGet, "/dsh/field/me/readiness", nil), "context-main", "field-1")
	if err == nil || !strings.Contains(err.Error(), "workforce readiness unavailable") {
		t.Fatalf("getFieldAggregatedReadiness() error = %v, want unavailable error", err)
	}
}

func TestEnsureActiveFieldAttestsOperatorContextBeforeReadiness(t *testing.T) {
	for name, forbidden := range map[string]bool{"verified field": false, "foreign field": true} {
		t.Run(name, func(t *testing.T) {
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/internal/assignments/field-1/scopes" {
					if r.URL.Query().Get("role") != "field" || r.Header.Get("X-Operator-Context-ID") != "context-main" {
						t.Fatalf("scope boundary request was not trusted: query=%s context=%q", r.URL.RawQuery, r.Header.Get("X-Operator-Context-ID"))
					}
					if forbidden {
						w.WriteHeader(http.StatusForbidden)
						return
					}
					_ = json.NewEncoder(w).Encode(workforceclient.ActorScopes{ActorID: "field-1", Role: "field", OperatorContextID: "context-main"})
					return
				}
				if r.URL.Path == "/internal/fields/field-1/readiness" {
					if r.Header.Get("X-Operator-Context-ID") != "context-main" {
						t.Fatalf("readiness boundary context = %q", r.Header.Get("X-Operator-Context-ID"))
					}
					_ = json.NewEncoder(w).Encode(map[string]any{"activationReadiness": map[string]any{"isActive": true}})
					return
				}
				http.NotFound(w, r)
			}))
			defer upstream.Close()

			server := &protectedStoreServer{workforce: workforceclient.NewClient(upstream.URL, "service-token")}
			response := httptest.NewRecorder()
			ok := server.ensureActiveField(response, httptest.NewRequest(http.MethodPost, "/dsh/operator/field-onboarding-assignments", nil), "field-1", "context-main")
			if forbidden {
				if ok || response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "FIELD_ACTOR_FORBIDDEN") {
					t.Fatalf("foreign field must be rejected at the context boundary: ok=%v status=%d body=%s", ok, response.Code, response.Body.String())
				}
				return
			}
			if !ok || response.Code != http.StatusOK {
				t.Fatalf("verified field should pass readiness boundary: ok=%v status=%d body=%s", ok, response.Code, response.Body.String())
			}
		})
	}
}

func TestEnsureActiveFieldFailsClosedForUnavailableInactiveOrBrokenReadiness(t *testing.T) {
	response := httptest.NewRecorder()
	if (&protectedStoreServer{}).ensureActiveField(response, httptest.NewRequest(http.MethodPost, "/", nil), "field-1", "context-main") || response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "WORKFORCE_UNAVAILABLE") {
		t.Fatalf("missing Workforce authority must fail closed: ok=%v status=%d body=%s", response.Code == http.StatusOK, response.Code, response.Body.String())
	}

	for name, readinessStatus := range map[string]int{"inactive": http.StatusOK, "readiness unavailable": http.StatusServiceUnavailable} {
		t.Run(name, func(t *testing.T) {
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/internal/assignments/field-1/scopes" {
					_ = json.NewEncoder(w).Encode(workforceclient.ActorScopes{ActorID: "field-1", Role: "field", OperatorContextID: "context-main"})
					return
				}
				if r.URL.Path == "/internal/fields/field-1/readiness" {
					if readinessStatus != http.StatusOK {
						http.Error(w, "unavailable", readinessStatus)
						return
					}
					_ = json.NewEncoder(w).Encode(map[string]any{"activationReadiness": map[string]any{"isActive": false}})
					return
				}
				http.NotFound(w, r)
			}))
			defer upstream.Close()

			server := &protectedStoreServer{workforce: workforceclient.NewClient(upstream.URL, "service-token")}
			response := httptest.NewRecorder()
			ok := server.ensureActiveField(response, httptest.NewRequest(http.MethodPost, "/", nil), "field-1", "context-main")
			if ok {
				t.Fatal("invalid Workforce readiness was accepted")
			}
			wantStatus := http.StatusForbidden
			wantCode := "FIELD_NOT_ACTIVE"
			if readinessStatus != http.StatusOK {
				wantStatus = http.StatusServiceUnavailable
				wantCode = "WORKFORCE_UNAVAILABLE"
			}
			if response.Code != wantStatus || !strings.Contains(response.Body.String(), wantCode) {
				t.Fatalf("readiness result status=%d body=%s, want status=%d code=%s", response.Code, response.Body.String(), wantStatus, wantCode)
			}
		})
	}
}

func TestWriteFieldAssignmentErrorPreservesCanonicalHTTPMapping(t *testing.T) {
	tests := []struct {
		name string
		err  error
		code int
		body string
	}{
		{name: "invalid", err: fieldassignment.ErrInvalid, code: http.StatusBadRequest, body: "INVALID_REQUEST"},
		{name: "not found", err: fieldassignment.ErrNotFound, code: http.StatusNotFound, body: "NOT_FOUND"},
		{name: "forbidden", err: fieldassignment.ErrForbidden, code: http.StatusForbidden, body: "FORBIDDEN"},
		{name: "version conflict", err: fieldassignment.ErrVersionConflict, code: http.StatusConflict, body: "VERSION_CONFLICT"},
		{name: "invalid transition", err: fieldassignment.ErrInvalidTransition, code: http.StatusConflict, body: "INVALID_TRANSITION"},
		{name: "unknown", err: errors.New("database unavailable"), code: http.StatusInternalServerError, body: "INTERNAL_ERROR"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			writeFieldAssignmentError(response, tc.err)
			if response.Code != tc.code || !strings.Contains(response.Body.String(), tc.body) {
				t.Fatalf("error mapping status=%d body=%s, want status=%d body code=%s", response.Code, response.Body.String(), tc.code, tc.body)
			}
		})
	}
}
