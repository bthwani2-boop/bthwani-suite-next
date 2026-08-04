package partnerfleet

import (
	"context"
	"database/sql"
	"fmt"
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
	return nil, fmt.Errorf("J014: store fleet members migrated to Workforce")
}
