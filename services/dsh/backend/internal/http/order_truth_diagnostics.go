package http

import (
	"net/http"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGetOrderTruthDiagnostics(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok { return }
	diagnostics, err := orders.LoadOrderTruthDiagnostics(s.db, actor.TenantID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load order truth diagnostics")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"diagnostics": diagnostics})
}
