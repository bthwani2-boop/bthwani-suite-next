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
	_, err := db.ExecContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes
		SET status = 'expired', version = version + 1, updated_at = NOW()
		WHERE store_id = $1 AND status = 'pending' AND expires_at <= NOW()`, storeID)
	return err
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
		SELECT m.id, m.store_id, COALESCE(s.name, ''), COALESCE(wp.full_name_ar, ''), m.status, m.branch_assignment, m.delivery_assignment, m.version
		FROM dsh_captain_memberships m
		LEFT JOIN dsh_stores s ON m.store_id = s.id
		LEFT JOIN workforce_people wp ON m.captain_actor_id = wp.actor_id
		WHERE m.captain_actor_id = $1
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
