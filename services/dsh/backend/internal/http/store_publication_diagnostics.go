package http

import (
	"net/http"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGovernedOperatorStoreDiagnostics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}

	row, err := store.GetStoreByIDInternal(r.Context(), s.db, r.PathValue("storeId"))
	if err != nil {
		s.writeStoreError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, store.DiagnoseStorePublication(*row))
}
