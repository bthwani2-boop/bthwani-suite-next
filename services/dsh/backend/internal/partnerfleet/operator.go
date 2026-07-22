package partnerfleet

import (
	"context"
	"database/sql"
	"fmt"
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
		SELECT id::text,
		       store_id,
		       name,
		       status,
		       COALESCE(identity_actor_id, ''),
		       COALESCE(branch_assignment, ''),
		       COALESCE(delivery_assignment, ''),
		       version
		FROM dsh_store_team_members
		WHERE store_id = $1
		  AND role = 'courier'
		ORDER BY name, id`, storeID)
	if err != nil {
		return nil, fmt.Errorf("query store fleet members: %w", err)
	}
	defer rows.Close()

	members := make([]StoreFleetMember, 0)
	for rows.Next() {
		var member StoreFleetMember
		if err := rows.Scan(
			&member.TeamMemberID,
			&member.StoreID,
			&member.CourierName,
			&member.Status,
			&member.CaptainActorID,
			&member.BranchAssignment,
			&member.DeliveryAssignment,
			&member.Version,
		); err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return members, nil
}
