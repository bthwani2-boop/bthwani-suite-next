package http

import (
	"net/http"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGovernedOperatorStoreDiagnostics(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}

	row, err := store.GetStoreByIDInternalForOperatorContext(r.Context(), s.db, actor.OperatorContextID, r.PathValue("storeId"))
	if err != nil {
		s.writeStoreError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, store.DiagnoseStorePublication(*row))
}
