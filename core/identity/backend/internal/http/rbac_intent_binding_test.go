package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRbacRoleMutationsRequireCanonicalIntentBinding(t *testing.T) {
	handlers := map[string]http.HandlerFunc{
		"grant":    (&server{}).internalRbacGrantRole,
		"revoke":   (&server{}).internalRbacRevokeRole,
		"role-def": handleRoleDefinitionWrite(nil),
	}
	for name, handler := range handlers {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/internal/rbac/actors/actor-1/roles", strings.NewReader(`{"roleName":"operator","requestedByActorId":"reviewer-1"}`))
			req.Header.Set("Idempotency-Key", "intent-1")
			req.Header.Set("X-Canonical-Intent-ID", "different-intent")
			if name == "revoke" {
				req = httptest.NewRequest(http.MethodDelete, "/internal/rbac/actors/actor-1/roles?roleName=operator&requestedByActorId=reviewer-1", nil)
				req.Header.Set("Idempotency-Key", "intent-1")
				req.Header.Set("X-Canonical-Intent-ID", "different-intent")
			}
			if name == "role-def" {
				req = httptest.NewRequest(http.MethodPut, "/internal/rbac/role-definitions/operator", strings.NewReader(`{"description":"operator","active":true,"expectedVersion":1,"permissions":[]}`))
				req.Header.Set("Idempotency-Key", "intent-1")
				req.Header.Set("X-Canonical-Intent-ID", "different-intent")
			}
			rec := httptest.NewRecorder()
			handler(rec, req)
			if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "INVALID_CANONICAL_INTENT") {
				t.Fatalf("status/body = %d/%s; want canonical-intent rejection", rec.Code, rec.Body.String())
			}
		})
	}
}
