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
	idempotencyKey string,
	correlationID string,
) (CaptainFleetMembership, error) {
	if expectedVersion < 1 {
		return CaptainFleetMembership{}, ErrInvalid
	}
	var err error
	idempotencyKey, err = validateLifecycleKey(idempotencyKey)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	correlationID = resolveCorrelationID(correlationID, idempotencyKey)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	defer func() { _ = tx.Rollback() }()

	var currentVersion int
	var currentStatus string
	var partnerActorID string
	if err := tx.QueryRowContext(ctx, `SELECT version, status FROM dsh_captain_memberships WHERE id = $1 AND store_id = $2 AND captain_actor_id = $3 FOR UPDATE`, teamMemberID, storeID, captainActorID).Scan(&currentVersion, &currentStatus); errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	} else if err != nil {
		return CaptainFleetMembership{}, err
	}
	if currentVersion != expectedVersion || currentStatus != "active" {
		var replayCount int
		if err := tx.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM dsh_captain_membership_history
			WHERE membership_id = $1 AND action_label = 'captain_disconnect' AND idempotency_key = $2`,
			teamMemberID, idempotencyKey).Scan(&replayCount); err != nil {
			return CaptainFleetMembership{}, err
		}
		if replayCount > 0 && currentStatus == "suspended" && currentVersion == expectedVersion+1 {
			var replay CaptainFleetMembership
			if err := tx.QueryRowContext(ctx, `
				SELECT m.id, m.store_id, COALESCE(s.display_name, ''), m.captain_actor_id,
				       m.status, m.branch_assignment, m.delivery_assignment, m.version
				FROM dsh_captain_memberships m
				JOIN dsh_stores s ON s.id = m.store_id
				WHERE m.id = $1 AND m.store_id = $2 AND m.captain_actor_id = $3`,
				teamMemberID, storeID, captainActorID).Scan(
				&replay.TeamMemberID, &replay.StoreID, &replay.StoreName, &replay.CourierName,
				&replay.Status, &replay.BranchAssignment, &replay.DeliveryAssignment, &replay.Version); err != nil {
				return CaptainFleetMembership{}, err
			}
			return replay, nil
		}
		return CaptainFleetMembership{}, ErrVersionConflict
	}
	_ = tx.QueryRowContext(ctx, `SELECT COALESCE(created_by_actor_id, '') FROM dsh_partner_courier_connection_codes WHERE team_member_id = $1 AND store_id = $2 AND status = 'redeemed' ORDER BY updated_at DESC LIMIT 1`, teamMemberID, storeID).Scan(&partnerActorID)

	res, err := tx.ExecContext(ctx, `
		UPDATE dsh_captain_memberships
		SET status = 'suspended', version = version + 1, updated_at = NOW()
		WHERE id = $1 AND store_id = $2 AND captain_actor_id = $3 AND version = $4 AND status = 'active'`,
		teamMemberID, storeID, captainActorID, expectedVersion)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return CaptainFleetMembership{}, ErrVersionConflict
	}
	if err := insertMembershipHistory(ctx, tx, teamMemberID, "captain_disconnect", captainActorID, "active", "suspended", idempotencyKey, correlationID); err != nil {
		return CaptainFleetMembership{}, err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'revoked', version = version + 1, updated_at = NOW()
		WHERE team_member_id = $1 AND store_id = $2 AND status = 'redeemed'`, teamMemberID, storeID)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if err := insertFleetNotification(ctx, tx, captainActorID, "captain", "partner_fleet_membership", "تم إيقاف عضوية متجر الشريك", "تم فك عضويتك من متجر الشريك."); err != nil {
		return CaptainFleetMembership{}, err
	}
	if err := insertFleetNotification(ctx, tx, partnerActorID, "partner", "partner_fleet_membership", "فك الكابتن عضوية أسطول المتجر", "تم فك عضوية الكابتن من متجر الشريك."); err != nil {
		return CaptainFleetMembership{}, err
	}
	var membership CaptainFleetMembership
	if err := tx.QueryRowContext(ctx, `
		SELECT m.id, m.store_id, COALESCE(s.display_name, ''), m.captain_actor_id,
		       m.status, m.branch_assignment, m.delivery_assignment, m.version
		FROM dsh_captain_memberships m
		JOIN dsh_stores s ON s.id = m.store_id
		WHERE m.id = $1 AND m.store_id = $2 AND m.captain_actor_id = $3`,
		teamMemberID, storeID, captainActorID).Scan(
		&membership.TeamMemberID, &membership.StoreID, &membership.StoreName, &membership.CourierName,
		&membership.Status, &membership.BranchAssignment, &membership.DeliveryAssignment, &membership.Version); err != nil {
		return CaptainFleetMembership{}, err
	}

	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}

	return membership, nil
}
