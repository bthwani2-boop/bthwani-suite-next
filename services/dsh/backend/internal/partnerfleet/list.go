package partnerfleet

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type expiredConnectionProjection struct {
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
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, `
		UPDATE dsh_partner_courier_connection_codes AS connection
		SET status = 'expired', version = connection.version + 1, updated_at = NOW()
		FROM dsh_store_team_members AS member
		WHERE connection.store_id = $1
		  AND connection.status = 'pending'
		  AND connection.expires_at <= NOW()
		  AND member.id = connection.team_member_id
		RETURNING connection.team_member_id,
		          connection.created_by_actor_id,
		          member.name,
		          member.status`, storeID)
	if err != nil {
		return err
	}

	expired := make([]expiredConnectionProjection, 0)
	for rows.Next() {
		var item expiredConnectionProjection
		if err := rows.Scan(&item.TeamMemberID, &item.CreatedByActorID, &item.CourierName, &item.MemberStatus); err != nil {
			rows.Close()
			return err
		}
		expired = append(expired, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	if err := rows.Close(); err != nil {
		return err
	}

	for _, item := range expired {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_store_team_member_actions
				(member_id, store_id, action_label, from_status, to_status, actor_id)
			VALUES ($1, $2, 'expire_captain_connection_code', $3, $3, 'system')`,
			item.TeamMemberID, storeID, item.MemberStatus); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_notifications
				(actor_id, actor_type, topic, title, body, action_url)
			VALUES ($1, 'partner', 'partner_fleet_connection',
			        'انتهت صلاحية رمز ربط الكابتن',
			        $2,
			        '/team')`,
			item.CreatedByActorID, "انتهت صلاحية رمز الربط للموصل "+item.CourierName+" دون استخدامه."); err != nil {
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
		SELECT m.id::text,
		       m.store_id,
		       s.display_name,
		       m.name,
		       m.status,
		       COALESCE(m.branch_assignment, ''),
		       COALESCE(m.delivery_assignment, ''),
		       m.version
		FROM dsh_store_team_members m
		JOIN dsh_stores s ON s.id::text = m.store_id
		WHERE m.identity_actor_id = $1
		  AND m.role = 'courier'
		ORDER BY s.display_name, m.name, m.id`, captainActorID)
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
