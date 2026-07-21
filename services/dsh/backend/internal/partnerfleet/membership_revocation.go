package partnerfleet

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// DisconnectCaptainMembership removes the authenticated captain binding from a
// partner courier team member. The operation is optimistic, audited, and also
// revokes any redeemed connection code so the old relationship cannot be
// reused after disconnect.
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
	if captainActorID == "" || storeID == "" || teamMemberID == "" || expectedVersion <= 0 {
		return CaptainFleetMembership{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	defer tx.Rollback()

	var membership CaptainFleetMembership
	var currentVersion int
	err = tx.QueryRowContext(ctx, `
		SELECT m.id::TEXT,
		       m.store_id,
		       s.name,
		       m.name,
		       m.status,
		       COALESCE(m.branch_assignment, ''),
		       COALESCE(m.delivery_assignment, ''),
		       m.version
		FROM dsh_store_team_members m
		JOIN dsh_stores s ON s.id::TEXT = m.store_id
		WHERE m.id = $1
		  AND m.store_id = $2
		  AND m.role = 'courier'
		  AND m.identity_actor_id = $3
		FOR UPDATE OF m`, teamMemberID, storeID, captainActorID).Scan(
		&membership.TeamMemberID,
		&membership.StoreID,
		&membership.StoreName,
		&membership.CourierName,
		&membership.Status,
		&membership.BranchAssignment,
		&membership.DeliveryAssignment,
		&currentVersion,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return CaptainFleetMembership{}, ErrNotFound
	}
	if err != nil {
		return CaptainFleetMembership{}, fmt.Errorf("lock captain fleet membership: %w", err)
	}
	if currentVersion != expectedVersion {
		return CaptainFleetMembership{}, ErrVersionConflict
	}

	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_store_team_members
		SET identity_actor_id = '',
		    status = 'invited',
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $1
		  AND store_id = $2
		  AND identity_actor_id = $3
		  AND version = $4`, teamMemberID, storeID, captainActorID, expectedVersion)
	if err != nil {
		return CaptainFleetMembership{}, fmt.Errorf("disconnect captain fleet membership: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return CaptainFleetMembership{}, err
	}
	if rowsAffected != 1 {
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
		return CaptainFleetMembership{}, fmt.Errorf("revoke redeemed captain connection: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_store_team_member_actions
			(member_id, store_id, action_label, from_status, to_status, actor_id)
		VALUES ($1, $2, 'captain_disconnect', $3, 'invited', $4)`,
		teamMemberID, storeID, membership.Status, captainActorID); err != nil {
		return CaptainFleetMembership{}, fmt.Errorf("audit captain disconnect: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return CaptainFleetMembership{}, err
	}
	membership.Status = "invited"
	membership.Version = currentVersion + 1
	return membership, nil
}
