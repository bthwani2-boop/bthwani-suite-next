package reconciliation

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/shared"
)

// ErrCaseNotOpen is returned when assign/resolve is attempted on a case that
// is not currently 'open' -- either it was never open, or a concurrent
// request already resolved it first.
var ErrCaseNotOpen = errors.New("reconciliation case is not open")

type Case struct {
	ID                   string  `json:"id"`
	PaymentSessionID     string  `json:"paymentSessionId"`
	Operation            string  `json:"operation"`
	TriggerReason        string  `json:"triggerReason"`
	Status               string  `json:"status"`
	AssignedToOperatorID string  `json:"assignedToOperatorId"`
	AssignedAt           *string `json:"assignedAt"`
	ResolvedByOperatorID string  `json:"resolvedByOperatorId"`
	ResolutionAction     string  `json:"resolutionAction"`
	ResolutionNote       string  `json:"resolutionNote"`
	Resolution           string  `json:"resolution"`
	ResolvedAt           *string `json:"resolvedAt"`
	CreatedAt            string  `json:"createdAt"`
	UpdatedAt            string  `json:"updatedAt"`
}

const caseCols = `id, payment_session_id, operation, trigger_reason, status,
	assigned_to_operator_id, assigned_at, resolved_by_operator_id, resolution_action,
	resolution_note, resolution, resolved_at, created_at, updated_at`

func scanCase(row *sql.Row) (*Case, error) {
	var c Case
	var assignedTo, resolvedBy, resolutionAction, resolutionNote, resolution sql.NullString
	var assignedAt, resolvedAt sql.NullTime
	err := row.Scan(
		&c.ID, &c.PaymentSessionID, &c.Operation, &c.TriggerReason, &c.Status,
		&assignedTo, &assignedAt, &resolvedBy, &resolutionAction,
		&resolutionNote, &resolution, &resolvedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.AssignedToOperatorID = assignedTo.String
	c.ResolvedByOperatorID = resolvedBy.String
	c.ResolutionAction = resolutionAction.String
	c.ResolutionNote = resolutionNote.String
	c.Resolution = resolution.String
	if assignedAt.Valid {
		s := assignedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		c.AssignedAt = &s
	}
	if resolvedAt.Valid {
		s := resolvedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		c.ResolvedAt = &s
	}
	return &c, nil
}

func scanCaseRow(rows *sql.Rows) (*Case, error) {
	var c Case
	var assignedTo, resolvedBy, resolutionAction, resolutionNote, resolution sql.NullString
	var assignedAt, resolvedAt sql.NullTime
	err := rows.Scan(
		&c.ID, &c.PaymentSessionID, &c.Operation, &c.TriggerReason, &c.Status,
		&assignedTo, &assignedAt, &resolvedBy, &resolutionAction,
		&resolutionNote, &resolution, &resolvedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	c.AssignedToOperatorID = assignedTo.String
	c.ResolvedByOperatorID = resolvedBy.String
	c.ResolutionAction = resolutionAction.String
	c.ResolutionNote = resolutionNote.String
	c.Resolution = resolution.String
	if assignedAt.Valid {
		s := assignedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		c.AssignedAt = &s
	}
	if resolvedAt.Valid {
		s := resolvedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		c.ResolvedAt = &s
	}
	return &c, nil
}

func ListCases(db *sql.DB, status string) ([]*Case, error) {
	var rows *sql.Rows
	var err error
	if status != "" {
		rows, err = db.Query(`SELECT `+caseCols+` FROM wlt_reconciliation_cases WHERE status = $1 ORDER BY created_at DESC`, status)
	} else {
		rows, err = db.Query(`SELECT ` + caseCols + ` FROM wlt_reconciliation_cases ORDER BY created_at DESC LIMIT 100`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cases := make([]*Case, 0)
	for rows.Next() {
		c, err := scanCaseRow(rows)
		if err != nil {
			return nil, err
		}
		cases = append(cases, c)
	}
	return cases, rows.Err()
}

func GetCase(db *sql.DB, caseID string) (*Case, error) {
	if caseID == "" {
		return nil, fmt.Errorf("caseId is required")
	}
	row := db.QueryRow(`SELECT `+caseCols+` FROM wlt_reconciliation_cases WHERE id = $1`, caseID)
	c, err := scanCase(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

// AssignCase records which operator is investigating an open case. Assigning
// is not itself a state transition (status stays 'open') and can be
// reassigned freely -- only resolve is guarded against a non-open case.
func AssignCase(db *sql.DB, caseID, operatorID string) (*Case, error) {
	if caseID == "" {
		return nil, fmt.Errorf("caseId is required")
	}
	if operatorID == "" {
		return nil, fmt.Errorf("operatorId is required")
	}
	row := db.QueryRow(`
		UPDATE wlt_reconciliation_cases
		SET assigned_to_operator_id = $2, assigned_at = NOW(), updated_at = NOW()
		WHERE id = $1
		RETURNING `+caseCols, caseID, operatorID)
	c, err := scanCase(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

// ResolveCase transitions an open case to 'resolved'. The UPDATE is guarded
// on status = 'open' so resolving an already-resolved case (or a concurrent
// double-resolve) is rejected with ErrCaseNotOpen instead of silently
// overwriting the earlier resolution.
func ResolveCase(db *sql.DB, caseID, operatorID, resolutionAction, resolutionNote string) (*Case, error) {
	if caseID == "" {
		return nil, fmt.Errorf("caseId is required")
	}
	if operatorID == "" {
		return nil, fmt.Errorf("operatorId is required")
	}
	switch resolutionAction {
	case "confirmed_success", "confirmed_failed", "manual_adjustment", "ignored":
	default:
		return nil, fmt.Errorf("resolutionAction must be one of confirmed_success, confirmed_failed, manual_adjustment, ignored")
	}

	row := db.QueryRow(`
		UPDATE wlt_reconciliation_cases
		SET status = 'resolved', resolved_by_operator_id = $2, resolution_action = $3,
		    resolution_note = $4, resolution = $3, resolved_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'open'
		RETURNING `+caseCols, caseID, operatorID, resolutionAction, resolutionNote)
	c, err := scanCase(row)
	if err == sql.ErrNoRows {
		existing, getErr := GetCase(db, caseID)
		if getErr != nil {
			return nil, getErr
		}
		if existing == nil {
			return nil, nil
		}
		return nil, ErrCaseNotOpen
	}
	return c, err
}

// HTTP handlers

func HandleListCases(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cases, err := ListCases(db, r.URL.Query().Get("status"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reconciliationCases": cases})
	}
}

func HandleGetCase(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := GetCase(db, r.PathValue("caseId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if c == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "reconciliation case not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reconciliationCase": c})
	}
}

func HandleAssignCase(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OperatorID string `json:"operatorId"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8*1024)).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		c, err := AssignCase(db, r.PathValue("caseId"), input.OperatorID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if c == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "reconciliation case not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reconciliationCase": c})
	}
}

func HandleResolveCase(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OperatorID       string `json:"operatorId"`
			ResolutionAction string `json:"resolutionAction"`
			ResolutionNote   string `json:"resolutionNote"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8*1024)).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		c, err := ResolveCase(db, r.PathValue("caseId"), input.OperatorID, input.ResolutionAction, input.ResolutionNote)
		if errors.Is(err, ErrCaseNotOpen) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "reconciliation case is not open")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if c == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "reconciliation case not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"reconciliationCase": c})
	}
}
