package specialrequests

import (
	"context"
	"errors"
	"testing"
)

func TestProductionServiceMethodsRejectMissingOperatorContext(t *testing.T) {
	ctx := context.Background()
	svc := NewService(nil)

	if _, err := svc.Create(ctx, "client-1", CreateInput{RequestType: TypeAwnakErrand}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("Create must reject missing OperatorContext, got %v", err)
	}
	if _, err := svc.GetForClient(ctx, "request-1", "client-1"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("GetForClient must reject missing OperatorContext, got %v", err)
	}
	if _, _, err := svc.ListForClient(ctx, "client-1", 50, 0); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ListForClient must reject missing OperatorContext, got %v", err)
	}
	if _, err := svc.CancelForClient(ctx, "request-1", "client-1", nil); !errors.Is(err, ErrInvalid) {
		t.Fatalf("CancelForClient must reject missing OperatorContext, got %v", err)
	}
	if _, err := svc.ApplyOperatorTransition(ctx, "request-1", 1, UpdateInput{}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ApplyOperatorTransition must reject missing OperatorContext, got %v", err)
	}
	if _, err := svc.AttachWltPaymentSession(ctx, "request-1", 1, "session-1"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("AttachWltPaymentSession must reject missing OperatorContext, got %v", err)
	}
}

func TestPaymentEventRejectsMissingOperatorContext(t *testing.T) {
	if _, err := ApplyWltPaymentEvent(nil, "", "request-1", "session-1", "captured"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ApplyWltPaymentEvent must reject missing OperatorContext, got %v", err)
	}
}
