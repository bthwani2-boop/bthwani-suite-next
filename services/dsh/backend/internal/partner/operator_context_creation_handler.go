package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
)

func decodePartnerCreationInput(w http.ResponseWriter, r *http.Request, input *CreatePartnerInput) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(input); err != nil {
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return false
	}
	return true
}

func writeIdempotentPartnerCreateResult(w http.ResponseWriter, p Partner, replayed bool, err error, draft bool) {
	switch {
	case errors.Is(err, ErrOperatorContextRequired):
		sendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", err.Error())
	case errors.Is(err, ErrPartnerCreationIdempotencyRequired):
		sendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", err.Error())
	case errors.Is(err, ErrIdempotencyConflict):
		sendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used with a different partner creation request")
	case errors.Is(err, ErrInvalid):
		sendError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	case errors.Is(err, ErrConflict):
		sendError(w, http.StatusConflict, "CONFLICT", "partner with this legal identity already exists in the current OperatorContext")
	case err != nil:
		message := "failed to create partner"
		if draft {
			message = "failed to create draft"
		}
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", message)
	default:
		if replayed {
			w.Header().Set("Idempotent-Replayed", "true")
		}
		sendJSON(w, http.StatusCreated, p)
	}
}

func HandleOperatorContextCreatePartnerIdempotent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := requireOperatorContext(w, r)
		if !ok { return }
		actorID, surface := actorFromContext(r)
		var input CreatePartnerInput
		if !decodePartnerCreationInput(w, r, &input) { return }
		input.CreatedByActorID = actorID
		input.CreatedBySurface = surface
		p, replayed, err := CreatePartnerForOperatorContextIdempotent(r.Context(), db, operatorContextID, r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input)
		writeIdempotentPartnerCreateResult(w, p, replayed, err, false)
	}
}

func HandleOperatorContextFieldCreateDraftIdempotent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := requireOperatorContext(w, r)
		if !ok { return }
		actorID, _ := actorFromContext(r)
		var input CreatePartnerInput
		if !decodePartnerCreationInput(w, r, &input) { return }
		input.CreatedByActorID = actorID
		input.CreatedBySurface = "app-field"
		p, replayed, err := CreatePartnerForOperatorContextIdempotent(r.Context(), db, operatorContextID, r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input)
		writeIdempotentPartnerCreateResult(w, p, replayed, err, true)
	}
}
