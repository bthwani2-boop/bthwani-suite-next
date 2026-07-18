package partnerfleet

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

func ListStoreConnections(ctx context.Context, db *sql.DB, storeID string) ([]ConnectionCode, error) {
	storeID = strings.TrimSpace(storeID)
	if storeID == "" {
		return nil, ErrInvalid
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
		SELECT m.id::text,
		       m.store_id,
		       s.name,
		       m.name,
		       m.status,
		       COALESCE(m.branch_assignment, ''),
		       COALESCE(m.delivery_assignment, ''),
		       m.version
		FROM dsh_store_team_members m
		JOIN dsh_stores s ON s.id::text = m.store_id
		WHERE m.identity_actor_id = $1
		  AND m.role = 'courier'
		ORDER BY s.name, m.name, m.id`, captainActorID)
	if err != nil {
		return nil, fmt.Errorf("query captain fleet memberships: %w", err)
	}
	defer rows.Close()

	memberships := make([]CaptainFleetMembership, 0)
	for rows.Next() {
		var membership CaptainFleetMembership
		if err := rows.Scan(
			&membership.TeamMemberID,
			&membership.StoreID,
			&membership.StoreName,
			&membership.CourierName,
			&membership.Status,
			&membership.BranchAssignment,
			&membership.DeliveryAssignment,
			&membership.Version,
		); err != nil {
			return nil, err
		}
		memberships = append(memberships, membership)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return memberships, nil
}
