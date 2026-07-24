package http

import (
	"context"
	"errors"
	"net/http"

	"identity-api/internal/identity"
)

type tenantOtpRepository interface {
	RequestOtpForTenant(
		ctx context.Context,
		tenantID string,
		input identity.OtpInput,
	) (identity.IssueActivationResult, error)
}

func writeTenantOtpError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, identity.ErrTenantMismatch):
		sendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "phone is already bound to another tenant")
	case errors.Is(err, identity.ErrActivationRateLimited):
		sendError(w, http.StatusTooManyRequests, "ACTIVATION_RATE_LIMITED", "activation can be requested again later")
	case errors.Is(err, identity.ErrInvalidActivation):
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid phone or actor type")
	case errors.Is(err, identity.ErrActivationUnavailable):
		sendError(w, http.StatusServiceUnavailable, "ACTIVATION_UNAVAILABLE", "activation is not configured")
	default:
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
	}
}

// SaaSOtpBoundary makes the public OTP path tenant-safe while preserving the
// canonical request/response shape. The tenant is selected only from trusted
// runtime configuration; mobile callers cannot select or override it.
func SaaSOtpBoundary(repository tenantOtpRepository, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/auth/otp/request" {
			next.ServeHTTP(w, r)
			return
		}
		tenantID, active, err := activeSaaSTenant()
		if err != nil {
			sendError(w, http.StatusServiceUnavailable, "SAAS_RUNTIME_CONFIG_INVALID", err.Error())
			return
		}
		if !active {
			next.ServeHTTP(w, r)
			return
		}

		var request identity.OtpInput
		if !decodeJSON(w, r, &request) {
			return
		}
		result, err := repository.RequestOtpForTenant(r.Context(), tenantID, request)
		if err != nil {
			writeTenantOtpError(w, err)
			return
		}
		sendJSON(w, http.StatusOK, result)
	})
}
