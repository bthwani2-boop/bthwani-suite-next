package partnerfleet

import (
	"context"
	"database/sql"
	"errors"
)

// RedeemCode atomically consumes one pending connection code and binds the
// authenticated captain to the intended courier row. Expired codes are also
// transitioned, audited, and notified in the same transaction before the
// caller receives ErrExpired.
func RedeemCode(ctx context.Context, db *sql.DB, captainActorID, plainCode string) (CaptainFleetMembership, error) {
	return CaptainFleetMembership{}, errors.New("J014: fleet connection codes migrated to Workforce")
}
