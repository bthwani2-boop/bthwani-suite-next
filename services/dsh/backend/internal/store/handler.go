package store

import (
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"unicode/utf8"
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

// ParseListQuery parses and validates the query parameters shared by the
// public discovery list and the governed operator list. It returns the parsed
// query and an error message; an empty error message means the query is valid.
// Behavior:
//   - limit defaults to 20, must be an integer in [1, 100]
//   - offset defaults to 0, must be an integer >= 0
//   - status, if present, must be one of the known DshStoreStatus values
//   - isVisible is tri-state: "true" -> true, "false" -> false, otherwise unset
//   - sort, if present, must be one of rating, distance, or eta
//   - boolean filters, if present, must be true or false
//   - text filters must be valid UTF-8 and cannot contain PostgreSQL NUL bytes
func ParseListQuery(q url.Values) (DshStoreListQuery, string) {
	textParams := []struct {
		name  string
		value string
	}{
		{name: "cityCode", value: q.Get("cityCode")},
		{name: "serviceAreaCode", value: q.Get("serviceAreaCode")},
		{name: "status", value: q.Get("status")},
		{name: "search", value: q.Get("search")},
		{name: "category", value: q.Get("category")},
		{name: "sort", value: q.Get("sort")},
	}
	for _, param := range textParams {
		if !utf8.ValidString(param.value) || strings.IndexByte(param.value, 0) >= 0 {
			return DshStoreListQuery{}, "invalid " + param.name
		}
	}

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

	isVisible, errMsg := parseOptionalBoolean(q, "isVisible")
	if errMsg != "" {
		return DshStoreListQuery{}, errMsg
	}

	status := DshStoreStatus(q.Get("status"))

	if limit < 1 || limit > 100 {
		return DshStoreListQuery{}, "limit must be between 1 and 100"
	}
	if offset < 0 {
		return DshStoreListQuery{}, "offset must be >= 0"
	}
	if status != "" {
		if status != StatusDraft && status != StatusReady && status != StatusPublished && status != StatusPaused && status != StatusSuspended && status != StatusClosed {
			return DshStoreListQuery{}, "invalid status: " + string(status)
		}
	}

	sort := q.Get("sort")
	if sort != "" && sort != "rating" && sort != "distance" && sort != "eta" {
		return DshStoreListQuery{}, "invalid sort: " + sort
	}

	isFreeDelivery, errMsg := parseOptionalBoolean(q, "isFreeDelivery")
	if errMsg != "" {
		return DshStoreListQuery{}, errMsg
	}
	hasProBadge, errMsg := parseOptionalBoolean(q, "hasProBadge")
	if errMsg != "" {
		return DshStoreListQuery{}, errMsg
	}

	return DshStoreListQuery{
		CityCode:        q.Get("cityCode"),
		ServiceAreaCode: q.Get("serviceAreaCode"),
		Status:          status,
		IsVisible:       isVisible,
		Search:          q.Get("search"),
		Category:        q.Get("category"),
		Sort:            sort,
		IsFreeDelivery:  isFreeDelivery,
		HasProBadge:     hasProBadge,
		Limit:           limit,
		Offset:          offset,
	}, ""
}

func parseOptionalBoolean(q url.Values, name string) (*bool, string) {
	if _, present := q[name]; !present {
		return nil, ""
	}
	switch value := q.Get(name); value {
	case "true":
		v := true
		return &v, ""
	case "false":
		v := false
		return &v, ""
	default:
		return nil, "invalid " + name + ": must be true or false"
	}
}

// validateListQuery remains as the package-local compatibility entry point for
// existing tests and callers while ParseListQuery is used by protected routes.
func validateListQuery(q url.Values) (DshStoreListQuery, string) {
	return ParseListQuery(q)
}

func HandleListStores(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		listQuery, errMsg := ParseListQuery(r.URL.Query())
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
