package partnerfleet

import (
	"context"
	"database/sql"
	"errors"
)

// DisconnectCaptainMembership removes only the authenticated captain's binding
// to one partner-store courier row. The team row remains as operational history,
// but it is paused and cannot be used for partner delivery until a new one-time
// connection code is redeemed. Redeemed connection records are revoked in the
// same transaction so the previous relationship cannot be treated as active.
func DisconnectCaptainMembership(
	ctx context.Context,
	db *sql.DB,
	captainActorID string,
	storeID string,
	teamMemberID string,
	expectedVersion int,
) (CaptainFleetMembership, error) {
	return CaptainFleetMembership{}, errors.New("J014: fleet connection codes migrated to Workforce")
}
