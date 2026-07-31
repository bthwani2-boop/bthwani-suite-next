package http

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

const activationRequestLimit = 32 * 1024

// ActivationSafetyMiddleware permanently rejects the retired universal
// bootstrap activation code before it can reach Identity's repository. Local
// development already has the explicit username/password bootstrap path, so a
// shared activation code is never a valid authentication mechanism in any
// runtime mode. The request body is restored unchanged for all other codes so
// the canonical activation handler remains the sole owner of validation and
// session creation.
func ActivationSafetyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/auth/activate" {
			next.ServeHTTP(w, r)
			return
		}

		body, err := io.ReadAll(io.LimitReader(r.Body, activationRequestLimit+1))
		if err != nil || len(body) > activationRequestLimit {
			sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))

		var request struct {
			Code string `json:"code"`
		}
		if json.Unmarshal(body, &request) == nil && strings.TrimSpace(request.Code) == "000000" {
			sendError(w, http.StatusUnauthorized, "INVALID_ACTIVATION", "activation code is invalid or expired")
			return
		}

		next.ServeHTTP(w, r)
	})
}
