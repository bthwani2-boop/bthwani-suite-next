package http

import (
	"errors"
	"testing"

	"dsh-api/internal/dispatch"
)

func TestValidateDeliveryExceptionReportNote(t *testing.T) {
	t.Parallel()

	for _, note := range []string{"", "   ", "abcd"} {
		if err := validateDeliveryExceptionReportNote(note); !errors.Is(err, dispatch.ErrInvalid) {
			t.Fatalf("expected invalid note error for %q, got %v", note, err)
		}
	}
	if err := validateDeliveryExceptionReportNote("تعذر الوصول بعد ثلاث محاولات اتصال"); err != nil {
		t.Fatalf("expected operational evidence note to pass, got %v", err)
	}
}

func TestValidateDeliveryExceptionResolutionState(t *testing.T) {
	t.Parallel()

	if err := validateDeliveryExceptionResolutionState(nil); !errors.Is(err, dispatch.ErrNotFound) {
		t.Fatalf("expected nil item to be not found, got %v", err)
	}
	if err := validateDeliveryExceptionResolutionState(&dispatch.DeliveryException{
		Status: dispatch.DeliveryExceptionOpen,
	}); !errors.Is(err, dispatch.ErrConflict) {
		t.Fatalf("expected open exception to require acknowledgement, got %v", err)
	}
	for _, status := range []dispatch.DeliveryExceptionStatus{
		dispatch.DeliveryExceptionAcknowledged,
		dispatch.DeliveryExceptionResolved,
	} {
		if err := validateDeliveryExceptionResolutionState(&dispatch.DeliveryException{Status: status}); err != nil {
			t.Fatalf("expected %s exception to pass resolution gate, got %v", status, err)
		}
	}
}

func TestDeliveryExceptionPathID(t *testing.T) {
	t.Parallel()

	id, ok := deliveryExceptionPathID(
		"/dsh/operator/delivery-exceptions/exception-1/resolve",
		"/dsh/operator/delivery-exceptions/",
		"/resolve",
	)
	if !ok || id != "exception-1" {
		t.Fatalf("expected governed exception path, got id=%q ok=%v", id, ok)
	}
	if _, ok := deliveryExceptionPathID(
		"/dsh/operator/delivery-exceptions/exception-1/resolve/extra",
		"/dsh/operator/delivery-exceptions/",
		"/resolve",
	); ok {
		t.Fatal("expected extra path segments to be rejected")
	}
}
