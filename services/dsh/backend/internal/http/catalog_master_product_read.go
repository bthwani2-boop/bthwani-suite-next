package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// handleGetCatalogMasterProduct returns one sovereign master product for the
// operator detail workspace. The catalog package remains the only product
// truth owner; this handler only enforces actor scope and transports the result.
func (s *protectedStoreServer) handleGetCatalogMasterProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}

	productID := strings.TrimSpace(r.PathValue("productId"))
	if productID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "productId is required")
		return
	}

	product, err := centralcatalog.GetMasterProduct(r.Context(), s.db, productID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"masterProduct": product})
}
