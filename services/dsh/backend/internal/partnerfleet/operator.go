package partnerfleet

import (
	"context"
	"database/sql"
	"strings"
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
	storeID = strings.TrimSpace(storeID)
	if storeID == "" {
		return nil, ErrInvalid
	}
	rows, err := db.QueryContext(ctx, `
		SELECT m.id, m.store_id, m.captain_actor_id, m.status, m.captain_actor_id, m.branch_assignment, m.delivery_assignment, m.version
		FROM dsh_captain_memberships m
		WHERE m.store_id = $1
		ORDER BY m.created_at DESC`, storeID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

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
