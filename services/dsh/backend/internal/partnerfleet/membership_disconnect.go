package partnerfleet

import (
	"context"
	"database/sql"
	"errors"
	"strings"
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
	captainActorID = strings.TrimSpace(captainActorID)
	storeID = strings.TrimSpace(storeID)
	teamMemberID = strings.TrimSpace(teamMemberID)
	if db == nil || captainActorID == "" || storeID == "" || teamMemberID == "" || expectedVersion < 1 {
		return CaptainFleetMembership{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	defer tx.Rollback()

	var membership CaptainFleetMembership
	var role, boundActorID string
	err = tx.QueryRowContext(ctx, `
		SELECT m.id::TEXT,
		       m.store_id,
		       s.name,
		       m.name,
		       m.status,
		       COALESCE(m.branch_assignment, ''),
		       COALESCE(m.delivery_assignment, ''),
		       m.version,
		       m.role,
		       COALESCE(m.identity_actor_id, '')
		FROM dsh_store_team_members m
		JOIN dsh_stores s ON s.id::TEXT = m.store_id
		WHERE m.id = $1 AND m.store_id = $2
		FOR UPDATE OF m`, teamMemberID, storeID).Scan(
		&membership.TeamMemberID,
		&membership.StoreID,
		&membership.StoreName,
		&membership.CourierName,
		&membership.Status,
		&membership.BranchAssignment,
		&membership.DeliveryAssignment,
		&membership.Version,
		&role,
		&boundActorID,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if role != "courier" {
		return CaptainFleetMembership{}, ErrCourierIneligible
	}
	// Return NOT_FOUND rather than disclosing another captain's membership.
	if boundActorID == "" || boundActorID != captainActorID {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if membership.Version != expectedVersion {
		return CaptainFleetMembership{}, ErrVersionConflict
	}

	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_store_team_members
		SET identity_actor_id = '',
		    status = 'paused',
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $1
		  AND store_id = $2
		  AND identity_actor_id = $3
		  AND version = $4`, teamMemberID, storeID, captainActorID, expectedVersion)
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
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'revoked',
		    revoked_at = COALESCE(revoked_at, NOW()),
		    version = version + 1,
		    updated_at = NOW()
		WHERE store_id = $1
		  AND team_member_id = $2
		  AND redeemed_by_captain_actor_id = $3
		  AND status = 'redeemed'`, storeID, teamMemberID, captainActorID); err != nil {
		return CaptainFleetMembership{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_team_member_actions
			(member_id, store_id, action_label, from_status, to_status, actor_id)
		VALUES ($1, $2, 'captain_disconnect', $3, 'paused', $4)`,
		teamMemberID, storeID, membership.Status, captainActorID); err != nil {
		return CaptainFleetMembership{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, 'captain', 'partner_fleet_membership',
		        'تم فك عضوية أسطول الشريك',
		        $2,
		        '/account/partner-fleet')`,
		captainActorID, "تم فك عضويتك كموصل لمتجر "+membership.StoreName+"."); err != nil {
		return CaptainFleetMembership{}, err
	}

	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}
	membership.Status = "paused"
	membership.Version++
	return membership, nil
}
