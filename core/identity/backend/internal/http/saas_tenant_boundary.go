package http

import (
	"bytes"
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/lib/pq"

	"identity-api/internal/identity"
)

type provisionActorTenantRequest struct {
	Username  string `json:"username"`
	PhoneE164 string `json:"phoneE164"`
	Role      string `json:"role"`
	TenantID  string `json:"tenantId"`
}

func activeSaaSTenant() (string, bool, error) {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("BTHWANI_SAAS_MODE")))
	if mode != "active" {
		return "", false, nil
	}
	activation := strings.ToLower(strings.TrimSpace(os.Getenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE")))
	if activation != "authorized" && activation != "active" {
		return "", true, errors.New("active SaaS mode requires authorized or active commercial state")
	}
	tenantID := strings.TrimSpace(os.Getenv("BTHWANI_DEFAULT_TENANT_ID"))
	if tenantID == "" {
		return "", true, errors.New("BTHWANI_DEFAULT_TENANT_ID is required in active SaaS mode")
	}
	return tenantID, true, nil
}

func validateInternalTenantRequest(w http.ResponseWriter, r *http.Request, tenantID string) bool {
	if strings.TrimSpace(r.Header.Get("X-Service-Caller")) != "workforce" {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "X-Service-Caller is not allowed")
		return false
	}
	expectedToken := strings.TrimSpace(os.Getenv("IDENTITY_WORKFORCE_SERVICE_TOKEN"))
	if expectedToken == "" {
		sendError(w, http.StatusServiceUnavailable, "INTERNAL_API_UNAVAILABLE", "internal API is not configured")
		return false
	}
	token, ok := bearerToken(r)
	if !ok || subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
		sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "service token is required")
		return false
	}
	requestedTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
	if requestedTenantID == "" {
		sendError(w, http.StatusBadRequest, "TENANT_CONTEXT_REQUIRED", "X-Tenant-ID is required for internal actor operations")
		return false
	}
	if subtle.ConstantTimeCompare([]byte(requestedTenantID), []byte(tenantID)) != 1 {
		sendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "service tenant does not match the active runtime tenant")
		return false
	}
	return true
}

func rewriteProvisionTenant(w http.ResponseWriter, r *http.Request, db *sql.DB, tenantID string) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	var input provisionActorTenantRequest
	if err := decoder.Decode(&input); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	requestedTenantID := strings.TrimSpace(input.TenantID)
	if requestedTenantID != "" && requestedTenantID != tenantID {
		sendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "provisioned actor tenant cannot override the active runtime tenant")
		return false
	}
	phone, err := identity.NormalizePhoneE164(input.PhoneE164)
	if err != nil {
		sendError(w, http.StatusUnprocessableEntity, "INVALID_ACTOR_INPUT", "actor input is invalid")
		return false
	}
	var existingTenantID string
	err = db.QueryRowContext(r.Context(), `
		SELECT tenant_id
		FROM identity_actors
		WHERE phone_e164 = $1
		LIMIT 1`, phone).Scan(&existingTenantID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
		return false
	}
	if err == nil && strings.TrimSpace(existingTenantID) != tenantID {
		sendError(w, http.StatusConflict, "PHONE_BOUND_TO_ANOTHER_TENANT", "phone is already bound to an actor in another tenant")
		return false
	}
	input.TenantID = tenantID
	body, err := json.Marshal(input)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
		return false
	}
	r.Body = http.NoBody
	if len(body) > 0 {
		r.Body = ioNopCloser(bytes.NewReader(body))
	}
	r.ContentLength = int64(len(body))
	r.Header.Set("Content-Type", "application/json")
	return true
}

// ioNopCloser is kept local to make the middleware's body rewrite explicit
// without exposing a package-level mutable buffer.
func ioNopCloser(reader *bytes.Reader) httpBodyReadCloser {
	return httpBodyReadCloser{Reader: reader}
}

type httpBodyReadCloser struct {
	*bytes.Reader
}

func (httpBodyReadCloser) Close() error { return nil }

func actorIDFromInternalPath(path string) string {
	rest := strings.TrimPrefix(path, "/internal/actors/")
	if rest == path || rest == "" {
		return ""
	}
	actorID, _, _ := strings.Cut(rest, "/")
	if actorID == "search" || actorID == "provision" {
		return ""
	}
	return actorID
}

func actorBelongsToTenant(w http.ResponseWriter, r *http.Request, db *sql.DB, actorID, tenantID string) bool {
	var actorTenantID string
	err := db.QueryRowContext(r.Context(), `
		SELECT tenant_id FROM identity_actors WHERE id = $1`, actorID).Scan(&actorTenantID)
	if errors.Is(err, sql.ErrNoRows) {
		sendError(w, http.StatusNotFound, "ACTOR_NOT_FOUND", "actor was not found")
		return false
	}
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
		return false
	}
	if strings.TrimSpace(actorTenantID) != tenantID {
		sendError(w, http.StatusForbidden, "TENANT_CONTEXT_FORBIDDEN", "actor belongs to another tenant")
		return false
	}
	return true
}

func handleTenantActorSearch(w http.ResponseWriter, r *http.Request, db *sql.DB, tenantID string) {
	queryValues := r.URL.Query()
	role := strings.TrimSpace(queryValues.Get("role"))
	q := strings.TrimSpace(queryValues.Get("q"))
	limit := 25
	if raw := strings.TrimSpace(queryValues.Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	clauses := []string{"active", "tenant_id = $1"}
	args := []any{tenantID}
	if role != "" {
		args = append(args, role)
		clauses = append(clauses, fmt.Sprintf("$%d = ANY(roles)", len(args)))
	}
	if q != "" {
		args = append(args, "%"+q+"%")
		clauses = append(clauses, fmt.Sprintf("(username ILIKE $%d OR COALESCE(phone_e164, '') ILIKE $%d)", len(args), len(args)))
	}
	args = append(args, limit)
	rows, err := db.QueryContext(r.Context(), `
		SELECT id, username, COALESCE(phone_e164, ''), roles, active
		FROM identity_actors
		WHERE `+strings.Join(clauses, " AND ")+`
		ORDER BY username
		LIMIT $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
		return
	}
	defer rows.Close()
	views := []identity.ActorAdminView{}
	for rows.Next() {
		var view identity.ActorAdminView
		var roles pq.StringArray
		if err := rows.Scan(&view.ActorID, &view.Username, &view.PhoneE164, &roles, &view.Active); err != nil {
			sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
			return
		}
		view.Roles = []string(roles)
		views = append(views, view)
	}
	if err := rows.Err(); err != nil {
		sendError(w, http.StatusInternalServerError, "IDENTITY_INTERNAL_ERROR", "identity request failed")
		return
	}
	sendJSON(w, http.StatusOK, views)
}

// SaaSTenantBoundary scopes Workforce-to-Identity actor administration to the
// trusted runtime tenant. It does not trust tenantId from the request body and
// it prevents search, read, activation and lifecycle operations from crossing
// tenant boundaries before the repository handler executes.
func SaaSTenantBoundary(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/internal/actors") {
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
		if !validateInternalTenantRequest(w, r, tenantID) {
			return
		}
		if r.Method == http.MethodPost && r.URL.Path == "/internal/actors/provision" {
			if !rewriteProvisionTenant(w, r, db, tenantID) {
				return
			}
		}
		if r.Method == http.MethodGet && r.URL.Path == "/internal/actors/search" {
			handleTenantActorSearch(w, r, db, tenantID)
			return
		}
		if actorID := actorIDFromInternalPath(r.URL.Path); actorID != "" {
			if !actorBelongsToTenant(w, r, db, actorID, tenantID) {
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
