package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGetMarketingStorePublication(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	row, err := store.GetStoreByIDInternalForOperatorContext(r.Context(), s.db, actor.OperatorContextID, r.PathValue("storeId"))
	if err != nil {
		s.writeStoreError(w, err)
		return
	}
	policy, err := store.GetPublicationOverridePolicy(r.Context(), s.db, actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load publication override policy")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"store":          store.RowToDetail(*row),
		"diagnostics":    store.DiagnoseStorePublication(*row),
		"overridePolicy": policy,
	})
}

func (s *protectedStoreServer) handleMarketingStorePublication(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	var input store.StorePublicationInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	response, err := store.PublishStore(
		r.Context(), s.db, s.workforce, actor, r.PathValue("storeId"),
		r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input,
	)
	var gateErr *store.PublicationGateError
	if errors.As(err, &gateErr) {
		store.SendJSON(w, http.StatusConflict, map[string]any{
			"error": map[string]any{
				"code":    "PUBLICATION_GATE_FAILED",
				"message": "store publication prerequisites are incomplete or not overrideable by policy",
			},
			"diagnostics": gateErr.Diagnostics,
		})
		return
	}
	s.writeActionResponse(w, response, err)
}
