package http

import (
	"context"
	"errors"
	"net/http"

	"identity-api/internal/identity"
)

type governedRefreshRepository interface {
	RefreshGovernedForDevice(context.Context, string, string) (identity.TokenPair, error)
}

// GovernedRefreshBoundary is the canonical runtime boundary for refresh-token
// rotation. It intercepts only POST /auth/refresh and delegates every other
// request unchanged. Cross-instance serialization and device binding live in
// Identity's repository/database layer rather than process-local BFF memory.
func GovernedRefreshBoundary(repository governedRefreshRepository, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/auth/refresh" {
			next.ServeHTTP(w, r)
			return
		}

		var request struct {
			RefreshToken      string `json:"refreshToken"`
			DeviceFingerprint string `json:"deviceFingerprint"`
		}
		if !decodeJSON(w, r, &request) {
			return
		}

		pair, err := repository.RefreshGovernedForDevice(
			r.Context(),
			request.RefreshToken,
			request.DeviceFingerprint,
		)
		switch {
		case errors.Is(err, identity.ErrRefreshAlreadyRotated):
			sendError(
				w,
				http.StatusConflict,
				"REFRESH_ALREADY_ROTATED",
				"refresh token was rotated by another concurrent request",
			)
			return
		case errors.Is(err, identity.ErrDeviceFingerprintRequired):
			sendError(
				w,
				http.StatusUnauthorized,
				"DEVICE_FINGERPRINT_REQUIRED",
				"device-bound session requires its device fingerprint",
			)
			return
		case errors.Is(err, identity.ErrDeviceFingerprintMismatch):
			sendError(
				w,
				http.StatusUnauthorized,
				"DEVICE_FINGERPRINT_MISMATCH",
				"device fingerprint does not match the session",
			)
			return
		case errors.Is(err, identity.ErrInvalidRefresh):
			sendError(w, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "refresh token is invalid or expired")
			return
		case err != nil:
			sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "refresh service is temporarily unavailable")
			return
		}
		sendJSON(w, http.StatusOK, tokenResponse(pair))
	})
}
