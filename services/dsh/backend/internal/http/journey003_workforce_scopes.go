package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

const WorkforceScopePermissionManage = "workforce.scopes.manage"
const WorkforceScopePermissionRead = "workforce.scopes.read"

type workforceScopeSnapshot struct {
	ActorID          string   `json:"actorId"`
	ActorRole        string   `json:"actorRole"`
	StoreIDs         []string `json:"storeIds"`
	ServiceAreaCodes []string `json:"serviceAreaCodes"`
}

type replaceWorkforceScopesInput struct {
	ActorRole        string   `json:"actorRole"`
	StoreIDs         []string `json:"storeIds"`
	ServiceAreaCodes []string `json:"serviceAreaCodes"`
}

func RegisterWorkforceScopeRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/workforce/scopes/{actorId}", protected.handleGetWorkforceScopes)
	mux.HandleFunc("PUT /dsh/operator/workforce/scopes/{actorId}", protected.handleReplaceWorkforceScopes)
}

func (s *protectedStoreServer) handleGetWorkforceScopes(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", WorkforceScopePermissionRead, "operator")
	if !ok {
		return
	}
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	role := strings.TrimSpace(r.URL.Query().Get("actorRole"))
	if actorID == "" || (role != "field" && role != "captain") {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actorId and actorRole=field|captain are required")
		return
	}
	snapshot, err := loadWorkforceScopes(r.Context(), s.db, actorID, role)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "WORKFORCE_SCOPE_READ_FAILED", "failed to load workforce scopes")
		return
	}
	store.SendJSON(w, http.StatusOK, snapshot)
}

func (s *protectedStoreServer) handleReplaceWorkforceScopes(w http.ResponseWriter, r *http.Request) {
	operator, ok := s.requirePermission(w, r, "control-panel", WorkforceScopePermissionManage, "operator")
	if !ok {
		return
	}
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	var input replaceWorkforceScopesInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.ActorRole = strings.TrimSpace(input.ActorRole)
	input.StoreIDs = normalizedScopeValues(input.StoreIDs)
	input.ServiceAreaCodes = normalizedScopeValues(input.ServiceAreaCodes)
	if actorID == "" || (input.ActorRole != "field" && input.ActorRole != "captain") {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "actorId and actorRole=field|captain are required")
		return
	}
	if len(input.StoreIDs) == 0 && len(input.ServiceAreaCodes) == 0 {
		store.SendError(w, http.StatusBadRequest, "EMPTY_SCOPE_FORBIDDEN", "at least one store or service area scope is required")
		return
	}

	snapshot, err := replaceWorkforceScopes(
		r.Context(),
		s.db,
		actorID,
		input,
		operator.ID,
		r.Header.Get("X-Correlation-ID"),
	)
	switch {
	case errors.Is(err, errWorkforceScopeReference):
		store.SendError(w, http.StatusUnprocessableEntity, "INVALID_SCOPE_REFERENCE", "one or more stores or service areas do not exist")
	case err != nil:
		store.SendError(w, http.StatusInternalServerError, "WORKFORCE_SCOPE_WRITE_FAILED", "failed to replace workforce scopes")
	default:
		store.SendJSON(w, http.StatusOK, snapshot)
	}
}

var errWorkforceScopeReference = errors.New("invalid workforce scope reference")

func replaceWorkforceScopes(
	ctx context.Context,
	db *sql.DB,
	actorID string,
	input replaceWorkforceScopesInput,
	changedBy string,
	correlationID string,
) (workforceScopeSnapshot, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return workforceScopeSnapshot{}, err
	}
	defer tx.Rollback()

	for _, storeID := range input.StoreIDs {
		var exists bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM dsh_stores WHERE id = $1)`, storeID).Scan(&exists); err != nil {
			return workforceScopeSnapshot{}, err
		}
		if !exists {
			return workforceScopeSnapshot{}, errWorkforceScopeReference
		}
	}
	for _, areaCode := range input.ServiceAreaCodes {
		var exists bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM dsh_stores WHERE service_area_code = $1)`, areaCode).Scan(&exists); err != nil {
			return workforceScopeSnapshot{}, err
		}
		if !exists {
			return workforceScopeSnapshot{}, errWorkforceScopeReference
		}
	}

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM dsh_store_actor_scopes
		WHERE actor_id = $1 AND actor_role = $2`, actorID, input.ActorRole); err != nil {
		return workforceScopeSnapshot{}, err
	}
	for _, storeID := range input.StoreIDs {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_store_actor_scopes (actor_id, actor_role, store_id, scope_type, active)
			VALUES ($1, $2, $3, 'assigned', true)`, actorID, input.ActorRole, storeID); err != nil {
			return workforceScopeSnapshot{}, err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM dsh_actor_service_area_scopes
		WHERE actor_id = $1 AND actor_role = $2`, actorID, input.ActorRole); err != nil {
		return workforceScopeSnapshot{}, err
	}
	for _, areaCode := range input.ServiceAreaCodes {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_actor_service_area_scopes
				(actor_id, actor_role, service_area_code, active, assigned_by)
			VALUES ($1, $2, $3, true, $4)`, actorID, input.ActorRole, areaCode, changedBy); err != nil {
			return workforceScopeSnapshot{}, err
		}
	}

	storeJSON, _ := json.Marshal(input.StoreIDs)
	areaJSON, _ := json.Marshal(input.ServiceAreaCodes)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_workforce_scope_audit
			(actor_id, actor_role, changed_by, store_ids, service_areas, correlation_id)
		VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, NULLIF($6, ''))`,
		actorID, input.ActorRole, changedBy, string(storeJSON), string(areaJSON), correlationID); err != nil {
		return workforceScopeSnapshot{}, err
	}

	if err := tx.Commit(); err != nil {
		return workforceScopeSnapshot{}, err
	}
	return loadWorkforceScopes(ctx, db, actorID, input.ActorRole)
}

func loadWorkforceScopes(ctx context.Context, db *sql.DB, actorID, role string) (workforceScopeSnapshot, error) {
	snapshot := workforceScopeSnapshot{
		ActorID: actorID,
		ActorRole: role,
		StoreIDs: []string{},
		ServiceAreaCodes: []string{},
	}
	rows, err := db.QueryContext(ctx, `
		SELECT store_id
		FROM dsh_store_actor_scopes
		WHERE actor_id = $1 AND actor_role = $2 AND active = true
		ORDER BY store_id`, actorID, role)
	if err != nil {
		return snapshot, err
	}
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			rows.Close()
			return snapshot, err
		}
		snapshot.StoreIDs = append(snapshot.StoreIDs, value)
	}
	if err := rows.Close(); err != nil {
		return snapshot, err
	}

	areaRows, err := db.QueryContext(ctx, `
		SELECT service_area_code
		FROM dsh_actor_service_area_scopes
		WHERE actor_id = $1 AND actor_role = $2 AND active = true
		ORDER BY service_area_code`, actorID, role)
	if err != nil {
		return snapshot, err
	}
	defer areaRows.Close()
	for areaRows.Next() {
		var value string
		if err := areaRows.Scan(&value); err != nil {
			return snapshot, err
		}
		snapshot.ServiceAreaCodes = append(snapshot.ServiceAreaCodes, value)
	}
	return snapshot, areaRows.Err()
}

func normalizedScopeValues(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}
