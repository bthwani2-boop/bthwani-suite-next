package http

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/dispatch"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
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

// DeliveryExceptionGovernanceMiddleware intercepts only the two JRN-020
// mutation routes whose acceptance rules are stricter than the legacy router.
// All other traffic is delegated unchanged to the existing unified router.
func DeliveryExceptionGovernanceMiddleware(
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
	next http.Handler,
) http.Handler {
	governed := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			if assignmentID, ok := deliveryExceptionPathID(
				r.URL.Path,
				"/dsh/captain/dispatch/assignments/",
				"/exceptions",
			); ok {
				r.SetPathValue("assignmentId", assignmentID)
				governed.handleReportDeliveryExceptionGoverned(w, r)
				return
			}
			if exceptionID, ok := deliveryExceptionPathID(
				r.URL.Path,
				"/dsh/operator/delivery-exceptions/",
				"/resolve",
			); ok {
				r.SetPathValue("exceptionId", exceptionID)
				governed.handleResolveDeliveryExceptionGoverned(w, r)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// handleReportDeliveryExceptionGoverned keeps the domain primitive unchanged
// while enforcing the JRN-020 evidence contract at the HTTP boundary. Location
// remains optional so safety incidents can still be reported when GPS is denied;
// the operational note is the mandatory human-readable evidence.
func (s *protectedStoreServer) handleReportDeliveryExceptionGoverned(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		ReasonCode    dispatch.DeliveryExceptionReasonCode `json:"reasonCode"`
		Note          string                               `json:"note"`
		CorrelationID string                               `json:"correlationId"`
		Latitude      *float64                             `json:"latitude"`
		Longitude     *float64                             `json:"longitude"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if err := validateDeliveryExceptionReportNote(body.Note); err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	item, err := dispatch.ReportDeliveryException(s.db, r.PathValue("assignmentId"), actor.ID, dispatch.ReportDeliveryExceptionInput{
		ReasonCode:    body.ReasonCode,
		Note:          strings.TrimSpace(body.Note),
		CorrelationID: operationalCorrelationID(r, body.CorrelationID),
		Latitude:      body.Latitude,
		Longitude:     body.Longitude,
	})
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"exception": marshalDeliveryException(item)})
}

// handleResolveDeliveryExceptionGoverned enforces the acknowledge/ownership
// gate before any retry, reassignment, return, or cancellation decision. A
// resolved item remains eligible only for the domain layer's idempotent replay.
func (s *protectedStoreServer) handleResolveDeliveryExceptionGoverned(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	current, err := dispatch.GetDeliveryException(s.db, r.PathValue("exceptionId"))
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	if err := validateDeliveryExceptionResolutionState(current); err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}

	var body struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Action          string `json:"action"`
		Note            string `json:"note"`
		NewCaptainID    string `json:"newCaptainId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	var item *dispatch.DeliveryException
	switch body.Action {
	case "retry_same_captain":
		item, err = dispatch.ResolveDeliveryExceptionRetrySameCaptain(s.db, current.ID, body.ExpectedVersion, body.Note, actor.ID)
	case "reassign_captain":
		item, err = dispatch.ResolveDeliveryExceptionReassignCaptain(s.db, current.ID, body.ExpectedVersion, body.NewCaptainID, body.Note, actor.ID)
	case "return_to_store":
		item, err = dispatch.ResolveDeliveryExceptionReturnToStore(s.db, current.ID, body.ExpectedVersion, body.Note, actor.ID)
	case "cancel_order":
		item, err = dispatch.ResolveDeliveryExceptionCancelOrder(s.db, current.ID, body.ExpectedVersion, body.Note, actor.ID)
	default:
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "unsupported delivery exception resolution action")
		return
	}
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}
