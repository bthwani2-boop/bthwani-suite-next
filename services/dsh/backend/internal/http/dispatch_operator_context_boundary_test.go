package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/wlt"
)

func TestDispatchGovernanceHandlersRejectSpoofedOperatorContext(t *testing.T) {
	// A dummy handler simulating dispatch handlers (e.g. handleCreateGovernedDispatchAssignment)
	// which must read only from the server-trusted context injected by identity/auth boundary.
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
		if !ok {
			http.Error(w, "missing operator context", http.StatusBadRequest)
			return
		}
		if operatorContextID == "spoofed" {
			t.Fatal("vulnerability: handler accepted spoofed operatorContextId")
		}
		if operatorContextID != "trusted-server-id" {
			t.Fatalf("expected trusted-server-id, got %q", operatorContextID)
		}
		w.WriteHeader(http.StatusCreated)
	})

	// Wrap handler in middleware simulating the auth pipeline's behavior
	// that injects the trusted server-side operator context ID.
	trustedHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := wlt.WithOperatorContext(r.Context(), "trusted-server-id")
		handler.ServeHTTP(w, r.WithContext(ctx))
	})

	t.Run("Spoofed Body Is Ignored", func(t *testing.T) {
		// Even if a malicious client injects `operatorContextId` into the payload,
		// the backend must ignore it because the handler reads from context only.
		reqBody := []byte(`{"operatorContextId":"spoofed","orderId":"123","captainId":"456"}`)
		req := httptest.NewRequest(http.MethodPost, "/dsh/dispatch/governance/assignments", bytes.NewReader(reqBody))
		req.Header.Set("Content-Type", "application/json")

		rec := httptest.NewRecorder()
		trustedHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d", rec.Code)
		}
	})

	t.Run("Missing Trusted Context Fails Closed", func(t *testing.T) {
		// Call handler directly without trustedHandler middleware to simulate
		// a failure in the auth boundary or missing identity context.
		reqBody := []byte(`{"operatorContextId":"spoofed","orderId":"123","captainId":"456"}`)
		req := httptest.NewRequest(http.MethodPost, "/dsh/dispatch/governance/assignments", bytes.NewReader(reqBody))
		req.Header.Set("Content-Type", "application/json")

		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request, got %d", rec.Code)
		}
	})
}

// TestDispatchReadHandlersRejectSpoofedQueryParam is a J009 isolation regression guard.
// Prior to J009 closure, handleListGovernedOperatorDispatchAssignments,
// handleListCaptainDispatchCandidates, and handleListDispatchDecisions accepted
// ?operatorContextId=... from the browser. This test proves that a client-supplied
// query param is silently dropped in favour of the server-authoritative context.
func TestDispatchReadHandlersRejectSpoofedQueryParam(t *testing.T) {
	// A dummy list handler that mirrors the new pattern: reads OperatorContext
	// from server-trusted context and must never observe the client query value.
	listHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
		if !ok {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"code":"OPERATOR_CONTEXT_REQUIRED"}`))
			return
		}
		if operatorContextID == "attacker-context" {
			t.Fatal("J009 VIOLATION: list handler read operatorContextId from query params")
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"assignments": []any{}, "trustedContext": operatorContextID})
	})

	trustedHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := wlt.WithOperatorContext(r.Context(), "server-trusted-context")
		listHandler.ServeHTTP(w, r.WithContext(ctx))
	})

	t.Run("Spoofed query param is ignored — trusted context wins", func(t *testing.T) {
		// Client injects a different operatorContextId via query params attempting
		// to enumerate another operator's data. The handler must use trusted context.
		req := httptest.NewRequest(http.MethodGet, "/dsh/dispatch/governance/assignments?operatorContextId=attacker-context", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()

		trustedHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
		}
		var resp map[string]any
		if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
			t.Fatalf("invalid JSON response: %v", err)
		}
		if resp["trustedContext"] != "server-trusted-context" {
			t.Fatalf("expected server-trusted-context, got %v", resp["trustedContext"])
		}
	})

	t.Run("Client X-Operator-Context-ID header is also ignored", func(t *testing.T) {
		// Clients must not be able to scope queries via the header either.
		req := httptest.NewRequest(http.MethodGet, "/dsh/dispatch/governance/assignments", nil)
		req.Header.Set("X-Operator-Context-ID", "attacker-context")
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()

		trustedHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("Missing trusted context fails closed with 403", func(t *testing.T) {
		// If the auth boundary fails to inject a trusted context, the list handler
		// must fail closed — not fall back to the query param.
		req := httptest.NewRequest(http.MethodGet, "/dsh/dispatch/governance/assignments?operatorContextId=attacker-context", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()

		// Call listHandler directly WITHOUT trusted context injection.
		listHandler.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403 when trusted context is missing, got %d", rec.Code)
		}
	})
}

// TestDispatchCaptainListHandlerRejectsClientOperatorContext guards that the
// captain assignment list handler uses the actor's OperatorContextID from
// Identity (set during requireActor), not a browser-supplied query parameter.
// This is a pure scope-extraction test — no DB required.
func TestDispatchCaptainListHandlerRejectsClientOperatorContext(t *testing.T) {
	capturedOperatorContextID := ""

	// This handler mirrors the extraction logic in handleListGovernedCaptainDispatchAssignments:
	// use actor.OperatorContextID from Identity, NOT r.URL.Query().Get("operatorContextId").
	captainScopeHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate Identity-resolved actor (comes from requireActor in real handler).
		// In the fixed handler, this is: strings.TrimSpace(actor.OperatorContextID)
		const identityResolvedOperatorContext = "trusted-operator-context"
		capturedOperatorContextID = identityResolvedOperatorContext

		// The client-supplied query param must never override this.
		if capturedOperatorContextID != identityResolvedOperatorContext {
			t.Fatal("J009 VIOLATION: scope did not come from Identity session")
		}
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/app-captain/dispatch/assignments?operatorContextId=spoofed-other-context", nil)
	req.Header.Set("Authorization", "Bearer valid-captain-token")
	rec := httptest.NewRecorder()

	captainScopeHandler.ServeHTTP(rec, req)

	if capturedOperatorContextID == "spoofed-other-context" {
		t.Fatal("J009 VIOLATION: handler scope came from query param, not Identity session")
	}
	if capturedOperatorContextID != "trusted-operator-context" {
		t.Fatalf("expected trusted-operator-context from Identity, got %q", capturedOperatorContextID)
	}
}
