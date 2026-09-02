package http

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/dispatch"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

func validateDeliveryExceptionReportNote(note string) error {
	note = strings.TrimSpace(note)
	if len(note) < 5 {
		return fmt.Errorf("%w: note must describe the operational evidence in at least 5 characters", dispatch.ErrInvalid)
	}
	if len(note) > 1000 {
		return fmt.Errorf("%w: note must not exceed 1000 characters", dispatch.ErrInvalid)
	}
	return nil
}

func validateDeliveryExceptionResolutionState(item *dispatch.DeliveryException) error {
	if item == nil {
		return dispatch.ErrNotFound
	}
	switch item.Status {
	case dispatch.DeliveryExceptionAcknowledged, dispatch.DeliveryExceptionResolved:
		return nil
	case dispatch.DeliveryExceptionOpen:
		return fmt.Errorf("%w: acknowledge the exception and assign operational responsibility before resolution", dispatch.ErrConflict)
	default:
		return fmt.Errorf("%w: unsupported delivery exception state", dispatch.ErrConflict)
	}
}

func deliveryExceptionPathID(path, prefix, suffix string) (string, bool) {
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, suffix) {
		return "", false
	}
	id := strings.TrimSuffix(strings.TrimPrefix(path, prefix), suffix)
	if id == "" || strings.Contains(id, "/") {
		return "", false
	}
	return id, true
}

// DeliveryExceptionGovernanceMiddleware intercepts only the two governed
// mutation routes whose acceptance rules are stricter than the legacy router.
// All other traffic is delegated unchanged to the existing unified router.
func DeliveryExceptionGovernanceMiddleware(
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
	next http.Handler,
) http.Handler {
	governed := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			if assignmentID, ok := deliveryExceptionPathID(
				r.URL.Path,
				"/dsh/captain/dispatch/assignments/",
				"/exceptions",
			); ok {
				r.SetPathValue("assignmentId", assignmentID)
				governed.handleReportDeliveryException(w, r)
				return
			}
			if exceptionID, ok := deliveryExceptionPathID(
				r.URL.Path,
				"/dsh/operator/delivery-exceptions/",
				"/resolve",
			); ok {
				r.SetPathValue("exceptionId", exceptionID)
				governed.handleResolveDeliveryException(w, r)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
