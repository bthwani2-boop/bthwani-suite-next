package partnerfleet

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// RedeemCode atomically consumes one pending connection code and binds the
// authenticated captain to the intended courier row. Expired codes are also
// transitioned, audited, and notified in the same transaction before the
// caller receives ErrExpired.
func RedeemCode(ctx context.Context, db *sql.DB, captainActorID, plainCode, idempotencyKey, correlationID string) (CaptainFleetMembership, error) {
	codeHash := hashCode(plainCode)
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

	// Lock the code row for update to prevent double-redemption.
	var codeID, membershipID, storeID, codeStatus, createdByActorID, redeemedByCaptainActorID string
	var redeemIdempotencyKey sql.NullString
	var expiresAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT id::TEXT, team_member_id, store_id, status, expires_at, created_by_actor_id,
		       redeemed_by_captain_actor_id, redeem_idempotency_key
		FROM dsh_partner_courier_connection_codes
		WHERE code_hash = $1
		FOR UPDATE`, codeHash).Scan(&codeID, &membershipID, &storeID, &codeStatus, &expiresAt, &createdByActorID, &redeemedByCaptainActorID, &redeemIdempotencyKey)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}

	if codeStatus == "expired" {
		return CaptainFleetMembership{}, ErrExpired
	}
	if codeStatus == "pending" && time.Now().After(expiresAt) {
		if _, err := tx.ExecContext(ctx, `UPDATE dsh_partner_courier_connection_codes SET status = 'expired', version = version + 1, updated_at = NOW() WHERE id = $1`, codeID); err != nil {
			return CaptainFleetMembership{}, err
		}
		if err := insertMembershipHistory(ctx, tx, membershipID, "expire_captain_connection_code", captainActorID, "pending", "expired", idempotencyKey+":expire", correlationID); err != nil {
			return CaptainFleetMembership{}, err
		}
		if err := insertFleetNotification(ctx, tx, createdByActorID, "partner", "partner_fleet_connection", "انتهت صلاحية كود ربط الأسطول", "انتهت صلاحية كود ربط موصل المتجر."); err != nil {
			return CaptainFleetMembership{}, err
		}
		if err := tx.Commit(); err != nil {
			return CaptainFleetMembership{}, err
		}
		return CaptainFleetMembership{}, ErrExpired
	}
	if codeStatus != "pending" {
		if codeStatus == "redeemed" && redeemedByCaptainActorID == captainActorID && redeemIdempotencyKey.String == idempotencyKey {
			var replay CaptainFleetMembership
			err = tx.QueryRowContext(ctx, `
				SELECT m.id, m.store_id, COALESCE(s.display_name, ''), m.captain_actor_id,
				       m.status, m.branch_assignment, m.delivery_assignment, m.version
				FROM dsh_captain_memberships m
				JOIN dsh_stores s ON s.id = m.store_id
				WHERE m.id = $1 AND m.store_id = $2 AND m.captain_actor_id = $3`,
				membershipID, storeID, captainActorID).Scan(
				&replay.TeamMemberID, &replay.StoreID, &replay.StoreName, &replay.CourierName,
				&replay.Status, &replay.BranchAssignment, &replay.DeliveryAssignment, &replay.Version)
			if err != nil {
				return CaptainFleetMembership{}, err
			}
			return replay, nil
		}
		return CaptainFleetMembership{}, ErrAlreadyBound
	}

	// Check that the captain doesn't already have an active membership
	var existingCount int
	err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_captain_memberships
		WHERE captain_actor_id = $1 AND store_id = $2 AND status = 'active'`,
		captainActorID, storeID).Scan(&existingCount)
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
		RETURNING id, store_id, branch_assignment, delivery_assignment, version`,
		captainActorID, membershipID, storeID).Scan(
		&m.TeamMemberID, &m.StoreID, &m.BranchAssignment, &m.DeliveryAssignment, &m.Version)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrCourierIneligible
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	m.Status = "active"
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(display_name, '') FROM dsh_stores WHERE id = $1`, storeID).Scan(&m.StoreName); err != nil {
		return CaptainFleetMembership{}, err
	}
	m.CourierName = captainActorID

	// Mark connection code as redeemed
	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'redeemed', redeemed_by_captain_actor_id = $1, redeemed_at = NOW(),
		    redeem_idempotency_key = $3, redeem_correlation_id = $4,
		    version = version + 1, updated_at = NOW()
		WHERE id = $2`, captainActorID, codeID, idempotencyKey, correlationID)
	if err != nil {
		return CaptainFleetMembership{}, err
	}

	if err := insertMembershipHistory(ctx, tx, membershipID, "redeem_captain_connection_code", captainActorID, "invited", "active", idempotencyKey, correlationID); err != nil {
		return CaptainFleetMembership{}, err
	}
	if err := insertFleetNotification(ctx, tx, createdByActorID, "partner", "partner_fleet_membership", "تم ربط كابتن بمتجر الشريك", "تم ربط كابتن جديد بمتجر الشريك."); err != nil {
		return CaptainFleetMembership{}, err
	}
	if err := insertFleetNotification(ctx, tx, captainActorID, "captain", "partner_fleet_membership", "تم ربطك بمتجر الشريك", "تم ربط حسابك بمتجر الشريك."); err != nil {
		return CaptainFleetMembership{}, err
	}

	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}
	return m, nil
}
