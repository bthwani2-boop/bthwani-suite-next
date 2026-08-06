package partnerfleet

import (
	"context"
	"database/sql"
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
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	defer func() { _ = tx.Rollback() }()

	res, err := tx.ExecContext(ctx, `
		UPDATE dsh_captain_memberships
		SET status = 'ended', version = version + 1, updated_at = NOW()
		WHERE id = $1 AND store_id = $2 AND captain_actor_id = $3 AND version = $4 AND status = 'active'`,
		teamMemberID, storeID, captainActorID, expectedVersion)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return CaptainFleetMembership{}, ErrNotFound
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_captain_membership_history (membership_id, action_label, actor_id, from_status, to_status)
		VALUES ($1, 'captain_disconnect', $2, 'active', 'ended')`, teamMemberID, captainActorID)
	if err != nil {
		return CaptainFleetMembership{}, err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'revoked', version = version + 1, updated_at = NOW()
		WHERE team_member_id = $1 AND store_id = $2 AND status = 'redeemed'`, teamMemberID, storeID)
	if err != nil {
		return CaptainFleetMembership{}, err
	}

	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}

	return CaptainFleetMembership{
		TeamMemberID: teamMemberID,
		StoreID:      storeID,
		Status:       "ended",
		Version:      expectedVersion + 1,
	}, nil
}
