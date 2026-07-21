package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dsh-api/internal/clientaddress"
	"github.com/lib/pq"
)

func TestAddressErrorMapsUnverifiedServiceArea(t *testing.T) {
	recorder := httptest.NewRecorder()
	addressError(recorder, clientaddress.ErrServiceAreaUnverified)

	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d", http.StatusUnprocessableEntity, recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "ADDRESS_SERVICE_AREA_UNVERIFIED") {
		t.Fatalf("expected governed service-area error, got %s", recorder.Body.String())
	}
}

func TestAddressErrorMapsDatabaseGeofenceConstraint(t *testing.T) {
	recorder := httptest.NewRecorder()
	addressError(recorder, &pq.Error{
		Code:    "23514",
		Message: "DSH_ADDRESS_SERVICE_AREA_UNVERIFIED",
	})

	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status %d, got %d", http.StatusUnprocessableEntity, recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "ADDRESS_SERVICE_AREA_UNVERIFIED") {
		t.Fatalf("expected governed service-area error, got %s", recorder.Body.String())
	}
}

func TestAddressErrorDoesNotMaskUnrelatedCheckViolation(t *testing.T) {
	recorder := httptest.NewRecorder()
	addressError(recorder, &pq.Error{
		Code:    "23514",
		Message: "UNRELATED_CONSTRAINT",
	})

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected unrelated database error to remain internal, got %d", recorder.Code)
	}
}
