package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

type governedFieldPartnerUpdateRequest struct {
	DisplayName       string `json:"displayName"`
	OwnerActorID      string `json:"ownerActorId"`
	WorkforcePersonID string `json:"workforcePersonId"`
	PrimaryPhone      string `json:"primaryPhone"`
	SecondaryPhone    string `json:"secondaryPhone"`
	Email             string `json:"email"`
	Notes             string `json:"notes"`
}

// HandleGovernedFieldUpdatePartner owns operational onboarding edits only.
// Payout destinations are WLT-owned and are mutated exclusively through the
// governed actor finance payout-destination route, which then synchronizes the
// masked DSH readiness projection. Keeping finance out of this handler prevents
// a second write authority and makes legacy bank/IBAN/mobile fields fail closed
// as unknown request properties.
func HandleGovernedFieldUpdatePartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		if !requireFieldOwnsPartner(w, db, r, partnerID, actorID) {
			return
		}
		expectedVersion := expectedPartnerVersion(r)
		if expectedVersion < 1 {
			sendError(w, http.StatusPreconditionRequired, "EXPECTED_VERSION_REQUIRED", "a positive partner version is required")
			return
		}

		var request governedFieldPartnerUpdateRequest
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&request); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "partner draft accepts operational fields only; configure payout destinations through the governed finance surface")
			return
		}

		current, err := GetPartner(db, partnerID)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner")
			return
		}
		if current.Version != expectedVersion {
			sendError(w, http.StatusConflict, "VERSION_CONFLICT", "partner was modified concurrently")
			return
		}
		if !IsFieldPartnerEditableStatus(current.ActivationStatus) {
			sendError(w, http.StatusConflict, "FIELD_EDIT_LOCKED", "ملف الشريك قيد مراجعة الشركاء ولا يمكن تعديله ميدانيًا حتى إعادته للتعديلات")
			return
		}

		input := UpdatePartnerInput{
			DisplayName:       request.DisplayName,
			OwnerActorID:      request.OwnerActorID,
			WorkforcePersonID: request.WorkforcePersonID,
			PrimaryPhone:      request.PrimaryPhone,
			SecondaryPhone:    request.SecondaryPhone,
			Email:             request.Email,
			Notes:             request.Notes,
			UpdatedByActorID:  actorID,
		}
		updated, err := UpdatePartnerGoverned(db, partnerID, input, expectedVersion)
		if errors.Is(err, ErrExpectedVersionRequired) {
			sendError(w, http.StatusPreconditionRequired, "EXPECTED_VERSION_REQUIRED", err.Error())
			return
		}
		if errors.Is(err, ErrVersionConflict) {
			sendError(w, http.StatusConflict, "VERSION_CONFLICT", "partner was modified concurrently")
			return
		}
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update partner")
			return
		}
		sendJSON(w, http.StatusOK, updated)
	}
}

func HandleGovernedActivationTransition(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, surface := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		expectedVersion := expectedPartnerVersion(r)
		if expectedVersion < 1 {
			sendError(w, http.StatusPreconditionRequired, "EXPECTED_VERSION_REQUIRED", "a positive partner version is required")
			return
		}
		var input TransitionInput
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.ActorID = actorID
		input.ActorSurface = surface
		input.CorrelationID = strings.TrimSpace(correlationID(r))
		input.IdempotencyKey = strings.TrimSpace(idempotencyKey(r))
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = governedMutationKey("partner-transition", partnerID, strconv.Itoa(expectedVersion), string(input.ToStatus), input.Reason)
		}

		// Partner lifecycle is business-Partner state. The canonical payout
		// destination belongs to the authenticated partner actor in WLT and can be
		// shared by multiple Partner businesses inside the same OperatorContext.
		// Suspending or terminating one business must therefore never deactivate
		// the actor-level destination. Destination lifecycle stays on the explicit
		// partner finance endpoint; this transition mutates DSH business state only.
		updated, event, err := TransitionStatusGoverned(r.Context(), db, partnerID, input, expectedVersion)
		if writeGovernedTransitionError(w, err) {
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"partner": updated, "event": event})
	}
}

func HandleGovernedFieldSubmitPartner(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		if !requireFieldOwnsPartner(w, db, r, partnerID, actorID) {
			return
		}
		var body struct {
			Reason string `json:"reason"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)

		current, err := GetPartner(db, partnerID)
		if errors.Is(err, ErrNotFound) {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load partner")
			return
		}
		if current.ActivationStatus == StatusSubmitted {
			event, eventErr := FindLatestTransitionEvent(db, partnerID, StatusSubmitted)
			if eventErr != nil {
				sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "submitted transition audit is missing")
				return
			}
			sendJSON(w, http.StatusOK, map[string]any{"partner": SanitizePartnerForSurface(current), "event": event})
			return
		}

		input := TransitionInput{
			ToStatus:       StatusSubmitted,
			Reason:         body.Reason,
			ActorID:        actorID,
			ActorSurface:   "app-field",
			CorrelationID:  strings.TrimSpace(correlationID(r)),
			IdempotencyKey: strings.TrimSpace(idempotencyKey(r)),
		}
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = governedMutationKey("field-partner-submit", partnerID, strconv.Itoa(current.Version))
		}
		updated, event, err := TransitionStatusGoverned(r.Context(), db, partnerID, input, current.Version)
		if writeGovernedTransitionError(w, err) {
			return
		}
		sendJSON(w, http.StatusOK, map[string]any{"partner": updated, "event": event})
	}
}

func HandleGovernedFieldCreateVisit(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, actorSurface := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		if !requireFieldOwnsPartner(w, db, r, partnerID, actorID) {
			return
		}
		var input CreateFieldVisitInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
			return
		}
		input.PartnerID = partnerID
		input.FieldActorID = actorID
		input.FieldActorSurface = actorSurface
		input.IdempotencyKey = strings.TrimSpace(idempotencyKey(r))
		input.CorrelationID = strings.TrimSpace(correlationID(r))
		if input.IdempotencyKey == "" {
			sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key is required")
			return
		}
		visit, err := CreateFieldVisitIdempotent(r.Context(), db, input)
		if errors.Is(err, ErrStoreIDRequired) {
			sendError(w, http.StatusUnprocessableEntity, "STORE_ID_REQUIRED", "field visit requires an explicit storeId")
			return
		}
		if errors.Is(err, ErrPartnerMutationIdempotencyRequired) {
			sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", err.Error())
			return
		}
		if errors.Is(err, ErrIdempotencyConflict) {
			sendError(w, http.StatusConflict, "IDEMPOTENCY_KEY_REUSED", err.Error())
			return
		}
		if errors.Is(err, ErrInvalid) || errors.Is(err, ErrReadinessGate) {
			sendError(w, http.StatusUnprocessableEntity, "FIELD_VISIT_EVIDENCE_REQUIRED", err.Error())
			return
		}
		if err != nil {
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create field visit")
			return
		}
		sendJSON(w, http.StatusCreated, visit)
	}
}

func writeGovernedTransitionError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	switch {
	case errors.Is(err, ErrNotFound):
		sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
	case errors.Is(err, ErrExpectedVersionRequired):
		sendError(w, http.StatusPreconditionRequired, "EXPECTED_VERSION_REQUIRED", err.Error())
	case errors.Is(err, ErrVersionConflict):
		sendError(w, http.StatusConflict, "VERSION_CONFLICT", "partner was modified concurrently")
	case errors.Is(err, ErrIdempotencyConflict):
		sendError(w, http.StatusConflict, "IDEMPOTENCY_KEY_REUSED", err.Error())
	case errors.Is(err, ErrInvalidTransition):
		sendError(w, http.StatusUnprocessableEntity, "INVALID_TRANSITION", "transition not allowed from current status")
	case errors.Is(err, ErrReadinessGate):
		sendError(w, http.StatusUnprocessableEntity, "PARTNER_READINESS_GATES_FAILED", err.Error())
	case errors.Is(err, ErrStorePublicationGatesFailed):
		sendError(w, http.StatusUnprocessableEntity, "STORE_PUBLICATION_GATES_FAILED", err.Error())
	case errors.Is(err, ErrInvalid):
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "transition reason or input is invalid")
	default:
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "transition failed")
	}
	return true
}

func expectedPartnerVersion(r *http.Request) int {
	if version := versionFromQuery(r); version > 0 {
		return version
	}
	version, _ := strconv.Atoi(strings.TrimSpace(r.Header.Get("If-Match-Version")))
	return version
}
