package partnerfleet

import (
	"context"
	"database/sql"
)

// StoreFleetMember is the operator-facing, non-secret projection of a store
// courier membership. Connection codes and hashes are never exposed here.
type StoreFleetMember struct {
	TeamMemberID       string `json:"teamMemberId"`
	StoreID            string `json:"storeId"`
	CourierName        string `json:"courierName"`
	Status             string `json:"status"`
	CaptainActorID     string `json:"captainActorId,omitempty"`
	BranchAssignment   string `json:"branchAssignment"`
	DeliveryAssignment string `json:"deliveryAssignment"`
	Version            int    `json:"version"`
}

func ListStoreFleetMembers(ctx context.Context, db *sql.DB, storeID string) ([]StoreFleetMember, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT m.id, m.store_id, COALESCE(wp.full_name_ar, ''), m.status, m.captain_actor_id, m.branch_assignment, m.delivery_assignment, m.version
		FROM dsh_captain_memberships m
		LEFT JOIN workforce_people wp ON m.captain_actor_id = wp.actor_id
		WHERE m.store_id = $1
		ORDER BY m.created_at DESC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := make([]StoreFleetMember, 0)
	for rows.Next() {
		var m StoreFleetMember
		if err := rows.Scan(&m.TeamMemberID, &m.StoreID, &m.CourierName, &m.Status, &m.CaptainActorID, &m.BranchAssignment, &m.DeliveryAssignment, &m.Version); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, rows.Err()
}

// InviteCaptain creates a new placeholder membership row for a captain who will
// later redeem a one-time connection code to bind their identity.
func InviteCaptain(ctx context.Context, db *sql.DB, storeID, actorID string) (string, error) {
	var partnerID string
	err := db.QueryRowContext(ctx, `SELECT partner_id FROM dsh_stores WHERE id = $1`, storeID).Scan(&partnerID)
	if err != nil {
		return "", err
	}
	var id string
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_captain_memberships (captain_actor_id, affiliation, partner_id, store_id, status)
		VALUES ('', 'PARTNER', $1, $2, 'invited')
		RETURNING id`, partnerID, storeID).Scan(&id)
	return id, err
}

// UpdateCaptainMembershipStatus transitions a membership to a new status,
// writing a history record for every transition.
func UpdateCaptainMembershipStatus(ctx context.Context, db *sql.DB, storeID, membershipID, newStatus, actorID string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var oldStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT status FROM dsh_captain_memberships WHERE id = $1 AND store_id = $2`,
		membershipID, storeID).Scan(&oldStatus)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_captain_memberships
		SET status = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2 AND store_id = $3`, newStatus, membershipID, storeID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_captain_membership_history (membership_id, action_label, actor_id, from_status, to_status)
		VALUES ($1, 'operator_update', $2, $3, $4)`, membershipID, actorID, oldStatus, newStatus)
	if err != nil {
		return err
	}

	return tx.Commit()
}