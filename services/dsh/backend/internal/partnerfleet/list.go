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
	return nil // J014: fleet connections migrated to Workforce
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
	return nil, fmt.Errorf("J014: captain memberships migrated to Workforce")
}
