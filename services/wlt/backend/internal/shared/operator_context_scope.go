package shared

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// OperatorContextScopeConfig describes how to enforce the trusted OperatorContext on one
// resource family: which table/column stores the OperatorContext of record, which
// path value (if any) carries the row id for id-scoped routes, and which
// exact list path (if any) should receive an injected operatorContextId query filter.
type OperatorContextScopeConfig struct {
	// Table is the table queried to resolve the owning OperatorContext for an
	// id-scoped route, e.g. "wlt_settlements".
	Table string
	// IDColumn is the primary-key column on Table, defaulting to "id".
	IDColumn string
	// OperatorContextColumn is the OperatorContext column on Table, defaulting to "operator_context_id".
	OperatorContextColumn string
	// IDPathValue is the r.PathValue name carrying the row id, e.g.
	// "settlementId". Leave empty to skip the id-ownership check (routes
	// with no id in the path, such as list-only routes).
	IDPathValue string
	// ListPath, when non-empty, is the exact request path for which a GET
	// request has its "operatorContextId" query parameter forced to the trusted
	// OperatorContext (mirroring refund.RequireOperatorContextScope's list behavior).
	ListPath string
}

// RequireOperatorContextScope makes the authenticated request OperatorContext
// authoritative for one resource family. Transport headers are consumed by the
// service-auth boundary; domain scoping reads only the trusted request context.
// For id-scoped routes it looks up the stored OperatorContext of the referenced
// row and returns 404 (never 403) on a mismatch, so tenancy never becomes an
// identifier-enumeration oracle. For the configured list route it injects (and
// never lets the caller override away from) the trusted operatorContextId query filter.
func RequireOperatorContextScope(db *sql.DB, cfg OperatorContextScopeConfig, next http.HandlerFunc) http.HandlerFunc {
	idColumn := cfg.IDColumn
	if idColumn == "" {
		idColumn = "id"
	}
	operatorContextColumn := cfg.OperatorContextColumn
	if operatorContextColumn == "" {
		operatorContextColumn = "operator_context_id"
	}

	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, err := RequireOperatorContext(r.Context())
		if err != nil {
			SendError(w, http.StatusBadRequest, "OPERATOR_CONTEXT_REQUIRED", "authenticated OperatorContext context is required")
			return
		}

		if cfg.IDPathValue != "" {
			rowID := strings.TrimSpace(r.PathValue(cfg.IDPathValue))
			if rowID != "" {
				query := fmt.Sprintf(`SELECT %s FROM %s WHERE %s=$1`, operatorContextColumn, cfg.Table, idColumn)
				var storedOperatorContext string
				if err := db.QueryRowContext(r.Context(), query, rowID).Scan(&storedOperatorContext); err != nil {
					if errors.Is(err, sql.ErrNoRows) {
						SendError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
						return
					}
					SendError(w, http.StatusInternalServerError, "OPERATOR_CONTEXT_LOOKUP_FAILED", "resource OperatorContext could not be verified")
					return
				}
				if storedOperatorContext != operatorContextID {
					SendError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
					return
				}
			}
		}

		if cfg.ListPath != "" && r.Method == http.MethodGet && r.URL.Path == cfg.ListPath {
			query := r.URL.Query()
			if requestedOperatorContext := strings.TrimSpace(query.Get("operatorContextId")); requestedOperatorContext != "" && requestedOperatorContext != operatorContextID {
				SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_MISMATCH", "OperatorContext filter does not match authenticated OperatorContext")
				return
			}
			query.Set("operatorContextId", operatorContextID)
			r.URL.RawQuery = query.Encode()
		}

		next(w, r)
	}
}
