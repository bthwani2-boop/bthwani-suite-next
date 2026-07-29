package shared

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// TenantScopeConfig describes how to enforce the trusted DSH tenant on one
// resource family: which table/column stores the tenant of record, which
// path value (if any) carries the row id for id-scoped routes, and which
// exact list path (if any) should receive an injected operatorContextId query filter.
type TenantScopeConfig struct {
	// Table is the table queried to resolve the owning tenant for an
	// id-scoped route, e.g. "wlt_settlements".
	Table string
	// IDColumn is the primary-key column on Table, defaulting to "id".
	IDColumn string
	// TenantColumn is the tenant column on Table, defaulting to "tenant_id".
	TenantColumn string
	// IDPathValue is the r.PathValue name carrying the row id, e.g.
	// "settlementId". Leave empty to skip the id-ownership check (routes
	// with no id in the path, such as list-only routes).
	IDPathValue string
	// ListPath, when non-empty, is the exact request path for which a GET
	// request has its "operatorContextId" query parameter forced to the trusted
	// tenant (mirroring refund.RequireTenantScope's list behavior).
	ListPath string
}

// RequireTenantScope makes the trusted DSH tenant header (X-Operator-Context-ID)
// authoritative for one resource family. For id-scoped routes it looks up
// the stored tenant of the referenced row and returns 404 (never 403) on a
// mismatch, so tenancy never becomes an identifier-enumeration oracle. For
// the configured list route it injects (and never lets the caller override
// away from) the trusted operatorContextId query filter.
//
// This is the generalized form of refund.RequireTenantScope; both id-lookup
// and list-injection semantics are preserved exactly.
func RequireTenantScope(db *sql.DB, cfg TenantScopeConfig, next http.HandlerFunc) http.HandlerFunc {
	idColumn := cfg.IDColumn
	if idColumn == "" {
		idColumn = "id"
	}
	tenantColumn := cfg.TenantColumn
	if tenantColumn == "" {
		tenantColumn = "tenant_id"
	}

	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
		if operatorContextID == "" {
			SendError(w, http.StatusBadRequest, "TENANT_REQUIRED", "trusted tenant is required")
			return
		}

		if cfg.IDPathValue != "" {
			rowID := strings.TrimSpace(r.PathValue(cfg.IDPathValue))
			if rowID != "" {
				query := fmt.Sprintf(`SELECT %s FROM %s WHERE %s=$1`, tenantColumn, cfg.Table, idColumn)
				var storedTenant string
				if err := db.QueryRowContext(r.Context(), query, rowID).Scan(&storedTenant); err != nil {
					if errors.Is(err, sql.ErrNoRows) {
						SendError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
						return
					}
					SendError(w, http.StatusInternalServerError, "TENANT_LOOKUP_FAILED", "resource tenant could not be verified")
					return
				}
				if storedTenant != operatorContextID {
					// Deliberately return not found so tenant boundaries do
					// not become an identifier-enumeration oracle.
					SendError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
					return
				}
			}
		}

		if cfg.ListPath != "" && r.Method == http.MethodGet && r.URL.Path == cfg.ListPath {
			query := r.URL.Query()
			if requestedTenant := strings.TrimSpace(query.Get("operatorContextId")); requestedTenant != "" && requestedTenant != operatorContextID {
				SendError(w, http.StatusForbidden, "TENANT_MISMATCH", "tenant filter does not match trusted DSH tenant")
				return
			}
			query.Set("operatorContextId", operatorContextID)
			r.URL.RawQuery = query.Encode()
		}

		next(w, r)
	}
}
