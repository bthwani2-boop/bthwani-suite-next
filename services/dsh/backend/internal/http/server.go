package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/health"
	"dsh-api/internal/homediscovery"
	"dsh-api/internal/store"
)

func NewRouter(db *sql.DB, identityClient *auth.Client) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /dsh/health", health.HandleHealth)
	mux.HandleFunc("GET /dsh/readiness", health.HandleReadiness(db))
	mux.HandleFunc("GET /dsh/stores", store.HandleListStores(db))
	mux.HandleFunc("GET /dsh/stores/{storeId}", store.HandleGetStore(db))
	mux.HandleFunc("GET /dsh/home-discovery", homediscovery.HandleHomeDiscovery(db))
	protected := newProtectedStoreServer(db, identityClient)
	mux.HandleFunc("GET /dsh/store-context", protected.handleStoreContext)
	mux.HandleFunc("GET /dsh/operator/stores", protected.handleOperatorStores)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}", protected.handleOperatorStoreDetail)
	mux.HandleFunc("PATCH /dsh/partner/stores/{storeId}/settings", protected.handlePartnerSettings)
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/verifications", protected.handleFieldVerification)
	mux.HandleFunc("POST /dsh/captain/stores/{storeId}/pickup-readiness", protected.handleCaptainReadiness)
	mux.HandleFunc("POST /dsh/operator/stores/{storeId}/governance", protected.handleOperatorGovernance)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/audit", protected.handleStoreAudit)
	mux.HandleFunc("GET /dsh/operator/home-discovery/{kind}", protected.handleHomeDiscoveryAdminList)
	mux.HandleFunc("POST /dsh/operator/home-discovery/{kind}", protected.handleHomeDiscoveryAdminCreate)
	mux.HandleFunc("PATCH /dsh/operator/home-discovery/{kind}/{itemId}", protected.handleHomeDiscoveryAdminUpdate)
	mux.HandleFunc("DELETE /dsh/operator/home-discovery/{kind}/{itemId}", protected.handleHomeDiscoveryAdminDelete)

	// Catch-all 404 handler for routes not found
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "Route not found")
	})

	return mux
}

func CorsMiddleware(authMode string, next http.Handler) http.Handler {
	localCorsOrigin := ""
	if authMode != "" {
		localCorsOrigin = "http://localhost:13000"
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Service", "dsh")

		origin := r.Header.Get("Origin")
		if localCorsOrigin != "" && origin == localCorsOrigin {
			w.Header().Set("Access-Control-Allow-Origin", localCorsOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Correlation-ID")
			w.Header().Set("Vary", "Origin")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
