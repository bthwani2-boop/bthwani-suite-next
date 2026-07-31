package cod

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"wlt-api/internal/shared"
)

type GovernedCommissionQuery struct {
	OperatorContextID             string
	SourceID             string
	BeneficiaryActorID   string
	BeneficiaryActorType string
	Status               string
	Limit                int
}

// ListGovernedCommissions requires a OperatorContextID: the operator_context_id predicate is
// mandatory and always applied first, so no combination of the optional
// filters below can ever return another OperatorContext's commissions.
func ListGovernedCommissions(db *sql.DB, query GovernedCommissionQuery) ([]*Commission, error) {
	query.OperatorContextID = strings.TrimSpace(query.OperatorContextID)
	query.SourceID = strings.TrimSpace(query.SourceID)
	query.BeneficiaryActorID = strings.TrimSpace(query.BeneficiaryActorID)
	query.BeneficiaryActorType = strings.ToLower(strings.TrimSpace(query.BeneficiaryActorType))
	query.Status = strings.ToLower(strings.TrimSpace(query.Status))
	if query.OperatorContextID == "" {
		return nil, fmt.Errorf("operatorContextId is required")
	}
	if (query.BeneficiaryActorID == "") != (query.BeneficiaryActorType == "") {
		return nil, fmt.Errorf("beneficiaryActorId and beneficiaryActorType must be supplied together")
	}
	if query.Limit <= 0 || query.Limit > 200 {
		query.Limit = 100
	}
	conditions := make([]string, 0, 4)
	args := make([]any, 0, 5)
	appendCondition := func(column string, value any) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	appendCondition("operator_context_id", query.OperatorContextID)
	if query.SourceID != "" {
		appendCondition("source_id", query.SourceID)
	}
	if query.BeneficiaryActorID != "" {
		appendCondition("beneficiary_actor_id", query.BeneficiaryActorID)
		appendCondition("beneficiary_actor_type", query.BeneficiaryActorType)
	}
	if query.Status != "" {
		switch query.Status {
		case "pending", "confirmed", "settled", "rejected", "reversed":
		default:
			return nil, fmt.Errorf("unsupported commission status")
		}
		appendCondition("status", query.Status)
	}
	statement := `SELECT ` + commissionCols + ` FROM wlt_commissions`
	if len(conditions) > 0 {
		statement += ` WHERE ` + strings.Join(conditions, ` AND `)
	}
	args = append(args, query.Limit)
	statement += fmt.Sprintf(` ORDER BY created_at DESC, id DESC LIMIT $%d`, len(args))
	rows, err := db.Query(statement, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	commissions := make([]*Commission, 0)
	for rows.Next() {
		commission, err := scanCommissionRow(rows)
		if err != nil {
			return nil, err
		}
		commissions = append(commissions, commission)
	}
	return commissions, rows.Err()
}

func HandleListGovernedCommissions(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		values := r.URL.Query()
		sourceID := strings.TrimSpace(values.Get("sourceId"))
		if sourceID == "" {
			sourceID = strings.TrimSpace(values.Get("orderId"))
		}
		beneficiaryActorID := strings.TrimSpace(values.Get("beneficiaryActorId"))
		beneficiaryActorType := strings.TrimSpace(values.Get("beneficiaryActorType"))
		if beneficiaryActorID == "" {
			beneficiaryActorID = strings.TrimSpace(values.Get("captainId"))
			if beneficiaryActorID != "" {
				beneficiaryActorType = "captain"
			}
		}
		limit := 100
		if rawLimit := strings.TrimSpace(values.Get("limit")); rawLimit != "" {
			parsed, err := strconv.Atoi(rawLimit)
			if err != nil || parsed <= 0 || parsed > 200 {
				shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "limit must be between 1 and 200")
				return
			}
			limit = parsed
		}
		commissions, err := ListGovernedCommissions(db, GovernedCommissionQuery{
			OperatorContextID:             strings.TrimSpace(values.Get("operatorContextId")),
			SourceID:             sourceID,
			BeneficiaryActorID:   beneficiaryActorID,
			BeneficiaryActorType: beneficiaryActorType,
			Status:               values.Get("status"),
			Limit:                limit,
		})
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"commissions": commissions})
	}
}
