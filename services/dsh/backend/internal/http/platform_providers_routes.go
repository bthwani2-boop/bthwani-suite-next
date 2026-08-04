package http

import (
	"net/http"

	"dsh-api/internal/platform/provider"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleListProviders(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", "platform.read")
	if !ok {
		return
	}
	providers, err := s.providers.ListProviders(r.Context())
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list providers")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"providers": providers})
}

type updateProviderStatusInput struct {
	Status provider.Status `json:"status"`
}

func (s *protectedStoreServer) handleUpdateProviderStatus(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", "platform.manage")
	if !ok {
		return
	}
	var input updateProviderStatusInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	err := s.providers.UpdateStatus(r.Context(), r.PathValue("providerId"), input.Status)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]string{"status": string(input.Status)})
}
