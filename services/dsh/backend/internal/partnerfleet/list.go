package partnerfleet

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type expiredConnectionProjection struct {
	ConnectionID     string
	TeamMemberID     string
	CreatedByActorID string
	CourierName      string
	MemberStatus     string
}

func expirePendingStoreCodes(ctx context.Context, db *sql.DB, storeID string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	rows, err := tx.QueryContext(ctx, `
		SELECT id::TEXT, team_member_id, created_by_actor_id
		FROM dsh_partner_courier_connection_codes
		WHERE store_id = $1 AND status = 'pending' AND expires_at <= NOW()
		FOR UPDATE`, storeID)
	if err != nil {
		return err
	}
	type expiredCode struct{ id, teamMemberID, actorID string }
	var expired []expiredCode
	for rows.Next() {
		var code expiredCode
		if err := rows.Scan(&code.id, &code.teamMemberID, &code.actorID); err != nil {
			rows.Close()
			return err
		}
		expired = append(expired, code)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()
	for _, code := range expired {
		if _, err := tx.ExecContext(ctx, `
			UPDATE dsh_partner_courier_connection_codes
			SET status = 'expired', version = version + 1, updated_at = NOW()
			WHERE id = $1 AND status = 'pending'`, code.id); err != nil {
			return err
		}
		key := "expire-read:" + code.id
		if err := insertMembershipHistory(ctx, tx, code.teamMemberID, "expire_captain_connection_code", code.actorID, "pending", "expired", key, key); err != nil {
			return err
		}
		if err := insertFleetNotification(ctx, tx, code.actorID, "partner", "partner_fleet_connection", "انتهت صلاحية كود ربط الأسطول", "انتهت صلاحية كود ربط موصل المتجر."); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func ListStoreConnections(ctx context.Context, db *sql.DB, storeID string) ([]ConnectionCode, error) {
	storeID = strings.TrimSpace(storeID)
	if storeID == "" {
		return nil, ErrInvalid
	}
	if err := expirePendingStoreCodes(ctx, db, storeID); err != nil {
		return nil, fmt.Errorf("expire pending store fleet codes: %w", err)
	}
	rows, err := db.QueryContext(ctx, `
		SELECT `+connectionSelectCols+`
		FROM dsh_partner_courier_connection_codes
		WHERE store_id = $1
		ORDER BY created_at DESC, id DESC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	connections := make([]ConnectionCode, 0)
	for rows.Next() {
		connection, scanErr := scanConnection(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		connections = append(connections, connection)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return connections, nil
}

func ListCaptainMemberships(ctx context.Context, db *sql.DB, captainActorID string) ([]CaptainFleetMembership, error) {
	captainActorID = strings.TrimSpace(captainActorID)
	if captainActorID == "" {
		return nil, ErrInvalid
	}
	rows, err := db.QueryContext(ctx, `
		SELECT m.id, m.store_id, COALESCE(s.display_name, ''), m.captain_actor_id, m.status, m.branch_assignment, m.delivery_assignment, m.version
		FROM dsh_captain_memberships m
		LEFT JOIN dsh_stores s ON m.store_id = s.id
		WHERE m.captain_actor_id = $1 AND m.status IN ('active', 'suspended')
		ORDER BY m.created_at DESC`, captainActorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	memberships := make([]CaptainFleetMembership, 0)
	for rows.Next() {
		var m CaptainFleetMembership
		if err := rows.Scan(&m.TeamMemberID, &m.StoreID, &m.StoreName, &m.CourierName, &m.Status, &m.BranchAssignment, &m.DeliveryAssignment, &m.Version); err != nil {
			return nil, err
		}
		memberships = append(memberships, m)
	}
	return memberships, rows.Err()
}
