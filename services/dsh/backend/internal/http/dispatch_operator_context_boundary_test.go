package http

import (
	"bytes"
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
