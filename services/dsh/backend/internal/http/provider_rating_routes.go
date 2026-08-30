package http

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/ratings"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// RegisterProviderRatingRoutes keeps ratings inside DSH because DSH owns the
// activation and delivery facts that make each rating eligible.
func RegisterProviderRatingRoutes(mux *http.ServeMux, db *sql.DB, identityClient *auth.Client, wltClient *wlt.Client, mediaProvider *media.Provider) {
	s := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)
	mux.HandleFunc("GET /dsh/partner/me/ratings/field/prompt", s.handlePartnerFieldRatingPrompt)
	mux.HandleFunc("POST /dsh/partner/me/ratings/field", s.handleSubmitPartnerFieldRating)
	mux.HandleFunc("GET /dsh/client/me/ratings/pending-order", s.handlePendingClientOrderRatingPrompt)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}/rating-prompt", s.handleClientOrderRatingPrompt)
	mux.HandleFunc("POST /dsh/client/orders/{orderId}/ratings", s.handleSubmitClientOrderRatings)
	mux.HandleFunc("GET /dsh/field/me/ratings/summary", s.handleFieldRatingSummary)
	mux.HandleFunc("GET /dsh/captain/me/ratings/summary", s.handleCaptainRatingSummary)
}

func requireClientOrderRatingMutationHeaders(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if len(idempotencyKey) < 16 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 16 to 200 characters")
		return "", "", false
	}
	if correlationID == "" || len(correlationID) > 200 {
		store.SendError(w, http.StatusBadRequest, "INVALID_CORRELATION_ID", "X-Correlation-ID is required")
		return "", "", false
	}
	return idempotencyKey, correlationID, true
}

func (s *protectedStoreServer) handlePartnerFieldRatingPrompt(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	prompt, err := ratings.PartnerFieldRatingPrompt(r.Context(), s.db, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeRatingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"prompt": prompt})
}

func (s *protectedStoreServer) handleSubmitPartnerFieldRating(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	var input struct {
		Score      int    `json:"score"`
		Comment    string `json:"comment"`
		Dimensions string `json:"dimensions"`
	}
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	rating, err := ratings.SubmitPartnerFieldRating(r.Context(), s.db, actor.OperatorContextID, actor.ID, input.Score, input.Comment, input.Dimensions, correlationID(r))
	if err != nil {
		writeRatingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"rating": rating})
}

func (s *protectedStoreServer) handlePendingClientOrderRatingPrompt(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	prompt, err := ratings.PendingClientOrderRatingPrompt(r.Context(), s.db, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeRatingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"prompt": prompt})
}

func (s *protectedStoreServer) handleClientOrderRatingPrompt(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	prompt, err := ratings.ClientOrderRatingPrompt(r.Context(), s.db, actor.OperatorContextID, actor.ID, r.PathValue("orderId"))
	if err != nil {
		writeRatingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"prompt": prompt})
}

func (s *protectedStoreServer) handleSubmitClientOrderRatings(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireClientOrderRatingMutationHeaders(w, r)
	if !ok {
		return
	}
	var input ratings.OrderRatingInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	result, err := ratings.SubmitClientOrderRatings(r.Context(), s.db, actor.OperatorContextID, actor.ID, r.PathValue("orderId"), input, ratings.ClientOrderRatingsMutationContext{
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		if errors.Is(err, ratings.ErrIdempotencyConflict) {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was already used for another rating request")
			return
		}
		writeRatingError(w, err)
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	store.SendJSON(w, http.StatusOK, map[string]any{
		"ratings": result,
		"mutation": map[string]string{
			"idempotencyKey": idempotencyKey,
			"correlationId":  correlationID,
		},
	})
}

func (s *protectedStoreServer) handleFieldRatingSummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	summary, err := ratings.Summary(r.Context(), s.db, actor.OperatorContextID, "field", actor.ID)
	if err != nil {
		writeRatingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"summary": summary})
}

func (s *protectedStoreServer) handleCaptainRatingSummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	summary, err := ratings.Summary(r.Context(), s.db, actor.OperatorContextID, "captain", actor.ID)
	if err != nil {
		writeRatingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"summary": summary})
}

func writeRatingError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ratings.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_RATING", "rating payload is invalid")
	case errors.Is(err, ratings.ErrNotEligible):
		store.SendError(w, http.StatusConflict, "RATING_NOT_ELIGIBLE", "rating requires an activated partner or a delivered order")
	case errors.Is(err, ratings.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "RATING_SOURCE_NOT_FOUND", "rating source was not found for the authenticated actor")
	default:
		store.SendError(w, http.StatusInternalServerError, "RATING_FAILED", "rating operation failed")
	}
}
