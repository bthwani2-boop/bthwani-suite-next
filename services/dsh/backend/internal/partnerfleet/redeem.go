package partnerfleet

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// RedeemCode atomically consumes one pending connection code and binds the
// authenticated captain to the intended courier row. Expired codes are also
// transitioned, audited, and notified in the same transaction before the
// caller receives ErrExpired.
func RedeemCode(ctx context.Context, db *sql.DB, captainActorID, plainCode string) (CaptainFleetMembership, error) {
	captainActorID = strings.TrimSpace(captainActorID)
	normalized := normalizeCode(plainCode)
	if db == nil || captainActorID == "" || len(normalized) < 8 {
		return CaptainFleetMembership{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	defer tx.Rollback()

	var connectionID, storeID, memberID, status, createdByActorID string
	var expiresAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT id::TEXT, store_id, team_member_id, status, expires_at, created_by_actor_id
		FROM dsh_partner_courier_connection_codes
		WHERE code_hash = $1
		FOR UPDATE`, hashCode(normalized)).Scan(
		&connectionID,
		&storeID,
		&memberID,
		&status,
		&expiresAt,
		&createdByActorID,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if status != "pending" {
		return CaptainFleetMembership{}, ErrInvalid
	}

	if !expiresAt.After(time.Now().UTC()) {
		var courierName, memberStatus string
		err = tx.QueryRowContext(ctx, `
			SELECT name, status
			FROM dsh_store_team_members
			WHERE id = $1 AND store_id = $2
			FOR UPDATE`, memberID, storeID).Scan(&courierName, &memberStatus)
		if errors.Is(err, sql.ErrNoRows) {
			return CaptainFleetMembership{}, ErrNotFound
		}
		if err != nil {
			return CaptainFleetMembership{}, err
		}

		result, err := tx.ExecContext(ctx, `
			UPDATE dsh_partner_courier_connection_codes
			SET status = 'expired', version = version + 1, updated_at = NOW()
			WHERE id::TEXT = $1 AND status = 'pending'`, connectionID)
		if err != nil {
			return CaptainFleetMembership{}, err
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return CaptainFleetMembership{}, err
		}
		if affected != 1 {
			return CaptainFleetMembership{}, ErrVersionConflict
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_store_team_member_actions
				(member_id, store_id, action_label, from_status, to_status, actor_id)
			VALUES ($1, $2, 'expire_captain_connection_code', $3, $3, 'system')`,
			memberID, storeID, memberStatus); err != nil {
			return CaptainFleetMembership{}, err
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_notifications
				(actor_id, actor_type, topic, title, body, action_url)
			VALUES ($1, 'partner', 'partner_fleet_connection',
			        'انتهت صلاحية رمز ربط الكابتن',
			        $2,
			        '/team')`,
			createdByActorID, "انتهت صلاحية رمز الربط للموصل "+courierName+" دون استخدامه."); err != nil {
			return CaptainFleetMembership{}, err
		}
		if err := tx.Commit(); err != nil {
			return CaptainFleetMembership{}, err
		}
		return CaptainFleetMembership{}, ErrExpired
	}

	if err := ensureStoreEligible(ctx, tx, storeID); err != nil {
		return CaptainFleetMembership{}, err
	}

	var role, memberStatus, existingActor, courierName, branch, deliveryAssignment string
	var memberVersion int
	err = tx.QueryRowContext(ctx, `
		SELECT role, status, identity_actor_id, name, branch_assignment, delivery_assignment, version
		FROM dsh_store_team_members
		WHERE id = $1 AND store_id = $2
		FOR UPDATE`, memberID, storeID).Scan(
		&role,
		&memberStatus,
		&existingActor,
		&courierName,
		&branch,
		&deliveryAssignment,
		&memberVersion,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if role != "courier" || memberStatus == "blocked" || memberStatus == "review-needed" {
		return CaptainFleetMembership{}, ErrCourierIneligible
	}
	if existingActor != "" && existingActor != captainActorID {
		return CaptainFleetMembership{}, ErrAlreadyBound
	}

	var otherMemberID string
	err = tx.QueryRowContext(ctx, `
		SELECT id::TEXT
		FROM dsh_store_team_members
		WHERE identity_actor_id = $1
		  AND store_id = $2
		  AND id <> $3
		LIMIT 1`, captainActorID, storeID, memberID).Scan(&otherMemberID)
	if err == nil {
		return CaptainFleetMembership{}, ErrAlreadyBound
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, err
	}

	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_store_team_members
		SET identity_actor_id = $1,
		    status = 'active',
		    invite_lifecycle = 'captain_code_redeemed',
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $2 AND store_id = $3 AND version = $4`,
		captainActorID, memberID, storeID, memberVersion)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if affected != 1 {
		return CaptainFleetMembership{}, ErrVersionConflict
	}

	result, err = tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'redeemed',
		    redeemed_by_captain_actor_id = $1,
		    redeemed_at = NOW(),
		    version = version + 1,
		    updated_at = NOW()
		WHERE id::TEXT = $2 AND status = 'pending'`, captainActorID, connectionID)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	affected, err = result.RowsAffected()
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if affected != 1 {
		return CaptainFleetMembership{}, ErrVersionConflict
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'revoked', revoked_at = NOW(), version = version + 1, updated_at = NOW()
		WHERE team_member_id = $1 AND id::TEXT <> $2 AND status = 'pending'`, memberID, connectionID); err != nil {
		return CaptainFleetMembership{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_team_member_actions
			(member_id, store_id, action_label, from_status, to_status, actor_id)
		VALUES ($1, $2, 'redeem_captain_connection_code', $3, 'active', $4)`,
		memberID, storeID, memberStatus, captainActorID); err != nil {
		return CaptainFleetMembership{}, err
	}

	var storeName string
	if err := tx.QueryRowContext(ctx, `SELECT display_name FROM dsh_stores WHERE id = $1`, storeID).Scan(&storeName); err != nil {
		return CaptainFleetMembership{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, 'captain', 'partner_fleet_membership',
		        'تم ربطك بأسطول الشريك',
		        $2,
		        '/account/partner-fleet')`,
		captainActorID, "تم تفعيل عضويتك كموصل لمتجر "+storeName+"."); err != nil {
		return CaptainFleetMembership{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, 'partner', 'partner_fleet_connection',
		        'تم ربط الكابتن بأسطول المتجر',
		        $2,
		        '/team')`,
		createdByActorID, "استهلك الكابتن رمز الربط وأصبحت عضوية "+courierName+" نشطة."); err != nil {
		return CaptainFleetMembership{}, err
	}
	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}

	return CaptainFleetMembership{
		TeamMemberID:       memberID,
		StoreID:            storeID,
		StoreName:          storeName,
		CourierName:        courierName,
		Status:             "active",
		BranchAssignment:   branch,
		DeliveryAssignment: deliveryAssignment,
		Version:            memberVersion + 1,
	}, nil
}
