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
	codeHash := hashCode(plainCode)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	defer func() { _ = tx.Rollback() }()

	// Lock the code row for update to prevent double-redemption.
	var codeID, membershipID, storeID, codeStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT id::TEXT, team_member_id, store_id, status
		FROM dsh_partner_courier_connection_codes
		WHERE code_hash = $1
		FOR UPDATE`, codeHash).Scan(&codeID, &membershipID, &storeID, &codeStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}

	if codeStatus == "expired" {
		return CaptainFleetMembership{}, ErrExpired
	}
	if codeStatus != "pending" {
		return CaptainFleetMembership{}, ErrAlreadyBound
	}

	// Check that the captain doesn't already have an active membership
	var existingCount int
	err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_captain_memberships WHERE captain_actor_id = $1 AND status = 'active'`,
		captainActorID).Scan(&existingCount)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if existingCount > 0 {
		return CaptainFleetMembership{}, ErrAlreadyBound
	}

	// Bind captain identity and activate membership
	var m CaptainFleetMembership
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_captain_memberships
		SET captain_actor_id = $1, status = 'active', version = version + 1, updated_at = NOW()
		WHERE id = $2 AND store_id = $3 AND status = 'invited'
		RETURNING id, store_id, '', captain_actor_id, status, branch_assignment, delivery_assignment, version`,
		captainActorID, membershipID, storeID).Scan(
		&m.TeamMemberID, &m.StoreID, &m.StoreName, &m.CourierName, &m.Status, &m.BranchAssignment, &m.DeliveryAssignment, &m.Version)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrCourierIneligible
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}

	// Mark connection code as redeemed
	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'redeemed', redeemed_by_captain_actor_id = $1, redeemed_at = NOW(),
		    version = version + 1, updated_at = NOW()
		WHERE id = $2`, captainActorID, codeID)
	if err != nil {
		return CaptainFleetMembership{}, err
	}

	// Write history
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_captain_membership_history (membership_id, action_label, actor_id, from_status, to_status)
		VALUES ($1, 'captain_redeem', $2, 'invited', 'active')`, membershipID, captainActorID)
	if err != nil {
		return CaptainFleetMembership{}, err
	}

	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}
	return m, nil
}
