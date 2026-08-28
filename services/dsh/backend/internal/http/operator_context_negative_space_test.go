package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dsh-api/internal/orders"
	"dsh-api/internal/partner"
)

func TestOperatorContextNegativeSpaceBoundaries(t *testing.T) {
	t.Run("Order Cancellation Scoped Query Rejects Empty or Invalid Inputs", func(t *testing.T) {
		_, err := orders.GetCancellationForContext(nil, "context-A", "")
		if err != orders.ErrInvalid {
			t.Fatalf("expected ErrInvalid for empty orderID, got %v", err)
		}
		_, err = orders.GetCancellationForContext(nil, "", "order-123")
		if err != orders.ErrInvalid {
			t.Fatalf("expected ErrInvalid for empty operatorContextID, got %v", err)
		}
	})

	t.Run("Partner Document List Rejects Request Without Trusted OperatorContext", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/dsh/partners/partner-1/documents", nil)
		rec := httptest.NewRecorder()

		handler := partner.HandleListDocuments(nil)
		handler(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected StatusForbidden without OperatorContext in context, got %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
			t.Errorf("expected OPERATOR_CONTEXT_REQUIRED error, got %s", rec.Body.String())
		}
	})

	t.Run("Partner Me Handler Rejects Request Without Trusted OperatorContext", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/dsh/partner/me", nil)
		rec := httptest.NewRecorder()

		handler := partner.HandlePartnerMe(nil)
		handler(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected StatusForbidden, got %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
			t.Errorf("expected OPERATOR_CONTEXT_REQUIRED error, got %s", rec.Body.String())
		}
	})

	t.Run("Partner Field Visits Rejects Request Without Trusted OperatorContext", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/dsh/partners/partner-1/field-visits", nil)
		rec := httptest.NewRecorder()

		handler := partner.HandleListFieldVisits(nil)
		handler(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected StatusForbidden, got %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
			t.Errorf("expected OPERATOR_CONTEXT_REQUIRED error, got %s", rec.Body.String())
		}
	})

	t.Run("Partner Stores Rejects Request Without Trusted OperatorContext", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/dsh/partners/partner-1/stores", nil)
		rec := httptest.NewRecorder()

		handler := partner.HandleListPartnerStores(nil)
		handler(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected StatusForbidden, got %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
			t.Errorf("expected OPERATOR_CONTEXT_REQUIRED error, got %s", rec.Body.String())
		}
	})

	t.Run("Partner Audit Rejects Request Without Trusted OperatorContext", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/dsh/partners/partner-1/audit", nil)
		rec := httptest.NewRecorder()

		handler := partner.HandleListAudit(nil)
		handler(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected StatusForbidden, got %d", rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
			t.Errorf("expected OPERATOR_CONTEXT_REQUIRED error, got %s", rec.Body.String())
		}
	})
}
