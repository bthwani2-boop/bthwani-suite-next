package refund

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"wlt-api/internal/shared"
)

func TestRefundDecisionHandlerRejectsBodySuppliedOperator(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/refunds/ref-1/approve", strings.NewReader(`{"operatorId":"forged-operator","reason":"approve"}`))
	req.SetPathValue("refundId", "ref-1")
	rec := httptest.NewRecorder()

	HandleApproveGovernedRefund(nil)(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected forged body operator to be rejected with 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRefundDecisionHandlerRequiresAuthenticatedDelegatedPrincipal(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/refunds/ref-1/approve", strings.NewReader(`{"reason":"approve"}`))
	req.SetPathValue("refundId", "ref-1")
	rec := httptest.NewRecorder()

	HandleApproveGovernedRefund(nil)(rec, req)

	if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), "AUTHENTICATED_PRINCIPAL_REQUIRED") {
		t.Fatalf("expected missing principal to fail closed with 403, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestResolveRefundPrincipalRejectsMismatchedAssertion(t *testing.T) {
	ctx := shared.WithDelegatedFinancePrincipal(context.Background(), "authenticated-operator")

	if _, err := resolveRefundPrincipal(ctx, "forged-operator"); err != ErrRefundPrincipalMismatch {
		t.Fatalf("expected principal mismatch, got %v", err)
	}

	principal, err := resolveRefundPrincipal(ctx, "authenticated-operator")
	if err != nil || principal != "authenticated-operator" {
		t.Fatalf("expected authenticated principal, got principal=%q err=%v", principal, err)
	}
}
