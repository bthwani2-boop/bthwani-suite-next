package store

import (
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strconv"
)

type ApiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func SendJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func SendError(w http.ResponseWriter, status int, code, message string) {
	SendJSON(w, status, ApiError{Code: code, Message: message})
}

// validateListQuery parses and validates the query parameters for the store
// list endpoint. It returns the parsed query and an error message; an empty
// error message means the query is valid. Behavior:
//   - limit defaults to 20, must be an integer in [1, 100]
//   - offset defaults to 0, must be an integer >= 0
//   - status, if present, must be one of the known DshStoreStatus values
//   - isVisible is tri-state: "true" -> true, "false" -> false, otherwise unset
func validateListQuery(q url.Values) (DshStoreListQuery, string) {
	limitStr := q.Get("limit")
	offsetStr := q.Get("offset")

	limit := 20
	offset := 0
	var err error

	if limitStr != "" {
		limit, err = strconv.Atoi(limitStr)
		if err != nil {
			return DshStoreListQuery{}, "limit and offset must be integers"
		}
	}

	if offsetStr != "" {
		offset, err = strconv.Atoi(offsetStr)
		if err != nil {
			return DshStoreListQuery{}, "limit and offset must be integers"
		}
	}

	var isVisible *bool
	isVisibleStr := q.Get("isVisible")
	if isVisibleStr == "true" {
		v := true
		isVisible = &v
	} else if isVisibleStr == "false" {
		v := false
		isVisible = &v
	}

	status := DshStoreStatus(q.Get("status"))

	// Validate query params
	if limit < 1 || limit > 100 {
		return DshStoreListQuery{}, "limit must be between 1 and 100"
	}
	if offset < 0 {
		return DshStoreListQuery{}, "offset must be >= 0"
	}
	if status != "" {
		if status != StatusActive && status != StatusInactive && status != StatusTemporarilyClosed && status != StatusUnavailable {
			return DshStoreListQuery{}, "invalid status: " + string(status)
		}
	}

	return DshStoreListQuery{
		CityCode:        q.Get("cityCode"),
		ServiceAreaCode: q.Get("serviceAreaCode"),
		Status:          status,
		IsVisible:       isVisible,
		Limit:           limit,
		Offset:          offset,
	}, ""
}

func HandleListStores(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		listQuery, errMsg := validateListQuery(r.URL.Query())
		if errMsg != "" {
			SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", errMsg)
			return
		}

		result, err := ListStores(db, listQuery)
		if err != nil {
			SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}

		SendJSON(w, http.StatusOK, result)
	}
}

func HandleGetStore(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		storeID := r.PathValue("storeId")
		if storeID == "" {
			SendError(w, http.StatusBadRequest, "INVALID_PARAMETER", "storeId is required")
			return
		}

		row, err := GetStoreByID(db, storeID)
		if err != nil {
			SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}

		if row == nil {
			SendError(w, http.StatusNotFound, "NOT_FOUND", "store not found: "+storeID)
			return
		}

		SendJSON(w, http.StatusOK, map[string]interface{}{
			"store": RowToDetail(*row),
		})
	}
}

// RequireServiceCaller enforces that a request carries a valid shared-secret
// bearer token (compared in constant time) plus the expected X-Service-Caller
// identity, for internal service-to-service endpoints (e.g. the WLT payment-
// session-event webhook). The secret is read from the given environment
// variable on every call so it can be rotated without a restart.
//
// Missing Authorization -> 401. Wrong token or wrong caller -> 403. If the
// environment variable itself is unset, the request is rejected as
// unavailable (503) rather than silently allowed, so a misconfigured
// deployment fails closed instead of open.
func RequireServiceCaller(w http.ResponseWriter, r *http.Request, tokenEnvVar, expectedCaller string) bool {
	expectedToken := os.Getenv(tokenEnvVar)
	if expectedToken == "" {
		SendError(w, http.StatusServiceUnavailable, "SERVICE_AUTH_NOT_CONFIGURED", tokenEnvVar+" is not configured")
		return false
	}
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		SendError(w, http.StatusUnauthorized, "SERVICE_AUTH_REQUIRED", "service authorization is required")
		return false
	}
	if subtle.ConstantTimeCompare([]byte(authHeader), []byte("Bearer "+expectedToken)) != 1 {
		SendError(w, http.StatusForbidden, "SERVICE_TOKEN_INVALID", "service authorization token is invalid")
		return false
	}
	if r.Header.Get("X-Service-Caller") != expectedCaller {
		SendError(w, http.StatusForbidden, "SERVICE_CALLER_FORBIDDEN", "unexpected service caller")
		return false
	}
	return true
}
