package shared

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// OperatorContextScopeConfig describes how to enforce the trusted DSH OperatorContext on one
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

// RequireOperatorContextScope makes the trusted DSH OperatorContext header (X-Operator-Context-ID)
// authoritative for one resource family. For id-scoped routes it looks up
// the stored OperatorContext of the referenced row and returns 404 (never 403) on a
// mismatch, so tenancy never becomes an identifier-enumeration oracle. For
// the configured list route it injects (and never lets the caller override
// away from) the trusted operatorContextId query filter.
//
// This is the generalized form of refund.RequireOperatorContextScope; both id-lookup
// and list-injection semantics are preserved exactly.
func RequireOperatorContextScope(db *sql.DB, cfg OperatorContextScopeConfig, next http.HandlerFunc) http.HandlerFunc {
	idColumn := cfg.IDColumn
	if idColumn == "" {
		idColumn = "id"
	}
	OperatorContextColumn := cfg.OperatorContextColumn
	if OperatorContextColumn == "" {
		OperatorContextColumn = "operator_context_id"
	}

	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
		if operatorContextID == "" {
			SendError(w, http.StatusBadRequest, "OperatorContext_REQUIRED", "trusted OperatorContext is required")
			return
		}

		if cfg.IDPathValue != "" {
			rowID := strings.TrimSpace(r.PathValue(cfg.IDPathValue))
			if rowID != "" {
				query := fmt.Sprintf(`SELECT %s FROM %s WHERE %s=$1`, OperatorContextColumn, cfg.Table, idColumn)
				var storedOperatorContext string
				if err := db.QueryRowContext(r.Context(), query, rowID).Scan(&storedOperatorContext); err != nil {
					if errors.Is(err, sql.ErrNoRows) {
						SendError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
						return
					}
					SendError(w, http.StatusInternalServerError, "OperatorContext_LOOKUP_FAILED", "resource OperatorContext could not be verified")
					return
				}
				if storedOperatorContext != operatorContextID {
					// Deliberately return not found so OperatorContext boundaries do
					// not become an identifier-enumeration oracle.
					SendError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
					return
				}
			}
		}

		if cfg.ListPath != "" && r.Method == http.MethodGet && r.URL.Path == cfg.ListPath {
			query := r.URL.Query()
			if requestedOperatorContext := strings.TrimSpace(query.Get("operatorContextId")); requestedOperatorContext != "" && requestedOperatorContext != operatorContextID {
				SendError(w, http.StatusForbidden, "OperatorContext_MISMATCH", "OperatorContext filter does not match trusted DSH OperatorContext")
				return
			}
			query.Set("operatorContextId", operatorContextID)
			r.URL.RawQuery = query.Encode()
		}

		next(w, r)
	}
}
