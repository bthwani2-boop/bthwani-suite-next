package partner

import (
	"database/sql"
	"strings"
)

// ListPartnersForTenantCategory is the contract-aligned tenant list path used by
// the control-panel workspace. It keeps pagination totals consistent with both
// lifecycle-status and category filters.
func ListPartnersForTenantCategory(
	db *sql.DB,
	tenantID string,
	query PartnerListQuery,
	category string,
) ([]PartnerSummary, int, error) {
	tenantID, err := normalizeTenantID(tenantID)
	if err != nil {
		return nil, 0, err
	}
	category = strings.TrimSpace(category)
	if query.Limit <= 0 {
		query.Limit = 50
	}
	if query.Limit > 100 {
		query.Limit = 100
	}
	if query.Offset < 0 {
		query.Offset = 0
	}

	args := []any{tenantID}
	conditions := []string{"tenant_id = $1"}
	next := 2
	if query.ActivationStatus != "" {
		conditions = append(conditions, "activation_status = $"+itoa(next))
		args = append(args, query.ActivationStatus)
		next++
	}
	if category != "" {
		conditions = append(conditions, "category = $"+itoa(next))
		args = append(args, category)
		next++
	}
	if query.CreatedByActorID != "" {
		conditions = append(conditions, "created_by_actor_id = $"+itoa(next))
		args = append(args, query.CreatedByActorID)
		next++
	}
	where := " WHERE " + strings.Join(conditions, " AND ")

	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partners`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, query.Limit, query.Offset)
	rows, err := db.Query(`
		SELECT id, display_name, legal_name_ar, category, activation_status,
		       primary_phone, created_at, updated_at
		FROM dsh_partners`+where+`
		ORDER BY created_at DESC
		LIMIT $`+itoa(next)+` OFFSET $`+itoa(next+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	partners := make([]PartnerSummary, 0)
	for rows.Next() {
		var item PartnerSummary
		if err := rows.Scan(
			&item.ID, &item.DisplayName, &item.LegalNameAr, &item.Category,
			&item.ActivationStatus, &item.PrimaryPhone, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		partners = append(partners, item)
	}
	return partners, total, rows.Err()
}
