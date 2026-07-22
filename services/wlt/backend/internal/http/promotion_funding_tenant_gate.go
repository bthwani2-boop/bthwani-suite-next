package http

import (
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// requirePromotionFundingTenant keeps the transport assertion independent from
// the JSON payload. The payload tenant is still compared by the domain handler,
// but a missing X-Tenant-ID can no longer become an implicit assertion.
func requirePromotionFundingTenant(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(r.Header.Get("X-Tenant-ID")) == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Tenant-ID is required")
			return
		}
		next(w, r)
	}
}
