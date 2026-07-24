package pickup

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

type SLAAlertStatus string

const (
	SLAAlertOpen         SLAAlertStatus = "open"
	SLAAlertAcknowledged SLAAlertStatus = "acknowledged"
	SLAAlertResolved     SLAAlertStatus = "resolved"
)

// PickupSLAAlert is a persisted, acknowledgeable record of a session leg
// that was overdue at some detection pass -- distinct from the volatile,
// computed-on-read SLA in sla.go.
type PickupSLAAlert struct {
	ID                    string
	SessionID             string
	OrderID               string
	StoreID               string
	Leg                   SLALeg
	Status                SLAAlertStatus
	DetectedAt            time.Time
	AcknowledgedByActorID *string
	AcknowledgedAt        *time.Time
	ResolvedAt            *time.Time
	CorrelationID         *string
	Version               int
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

const pickupSLAAlertColumns = `
	id::text, session_id, order_id::text, store_id, leg, status, detected_at,
	acknowledged_by_actor_id, acknowledged_at, resolved_at, correlation_id,
	version, created_at, updated_at
`

func scanPickupSLAAlert(scan func(...any) error) (*PickupSLAAlert, error) {
	var a PickupSLAAlert
	var leg string
	err := scan(
		&a.ID, &a.SessionID, &a.OrderID, &a.StoreID, &leg, &a.Status, &a.DetectedAt,
		&a.AcknowledgedByActorID, &a.AcknowledgedAt, &a.ResolvedAt, &a.CorrelationID,
		&a.Version, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	a.Leg = SLALeg(leg)
	return &a, nil
}

type RefreshPickupSLAAlertsResult struct {
	Opened   int `json:"opened"`
	Resolved int `json:"resolved"`
	Active   int `json:"active"`
}

// RefreshPickupSLAAlerts scans every pickup session, opens an alert for any
// session whose current leg is overdue, and resolves alerts whose leg is no
// longer overdue. See partnerdelivery.RefreshDeliverySLAAlerts for why the
// reconciliation runs in Go rather than as one SQL statement.
func RefreshPickupSLAAlerts(db *sql.DB, correlationID string, now time.Time) (*RefreshPickupSLAAlertsResult, error) {
	correlationID = strings.TrimSpace(correlationID)
	if db == nil || correlationID == "" {
		return nil, ErrInvalid
	}

	sessions, err := List(db, ListFilter{Limit: 500})
	if err != nil {
		return nil, err
	}
	thresholds := DefaultSLAThresholds()

	type overdueInfo struct {
		leg     SLALeg
		orderID string
		storeID string
	}
	overdue := make(map[string]overdueInfo, len(sessions))
	for i := range sessions {
		session := &sessions[i]
		sla := EvaluateSLA(session, thresholds, now)
		if sla.State == SLAOverdue {
			overdue[session.ID] = overdueInfo{leg: sla.CurrentLeg, orderID: session.OrderID, storeID: session.StoreID}
		}
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	opened := 0
	for sessionID, info := range overdue {
		res, err := tx.Exec(`
			INSERT INTO dsh_pickup_sla_alerts (session_id, order_id, store_id, leg, detected_at, correlation_id)
			VALUES ($1, $2::uuid, $3, $4, $5, $6)
			ON CONFLICT (session_id, leg) WHERE status IN ('open','acknowledged') DO NOTHING`,
			sessionID, info.orderID, info.storeID, string(info.leg), now, correlationID)
		if err != nil {
			return nil, err
		}
		count, _ := res.RowsAffected()
		opened += int(count)
	}

	rows, err := tx.Query(`SELECT id, session_id, leg FROM dsh_pickup_sla_alerts WHERE status IN ('open','acknowledged')`)
	if err != nil {
		return nil, err
	}
	type openRow struct{ id, sessionID, leg string }
	var toResolve []openRow
	for rows.Next() {
		var row openRow
		if err := rows.Scan(&row.id, &row.sessionID, &row.leg); err != nil {
			rows.Close()
			return nil, err
		}
		info, stillOverdue := overdue[row.sessionID]
		if !stillOverdue || string(info.leg) != row.leg {
			toResolve = append(toResolve, row)
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	resolved := 0
	for _, row := range toResolve {
		if _, err := tx.Exec(`
			UPDATE dsh_pickup_sla_alerts
			SET status = 'resolved', resolved_at = $2, version = version + 1, updated_at = $2
			WHERE id = $1::uuid AND status IN ('open','acknowledged')`, row.id, now); err != nil {
			return nil, err
		}
		resolved++
	}

	var active int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM dsh_pickup_sla_alerts WHERE status IN ('open','acknowledged')`).Scan(&active); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &RefreshPickupSLAAlertsResult{Opened: opened, Resolved: resolved, Active: active}, nil
}

// ListPickupSLAAlerts returns alerts matching status (or all, if empty),
// newest first.
func ListPickupSLAAlerts(db *sql.DB, status SLAAlertStatus, limit int) ([]PickupSLAAlert, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	statusValue := strings.TrimSpace(string(status))
	rows, err := db.Query(`
		SELECT `+pickupSLAAlertColumns+`
		FROM dsh_pickup_sla_alerts
		WHERE ($1 = '' OR status = $1)
		ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'acknowledged' THEN 1 ELSE 2 END, detected_at DESC
		LIMIT $2`, statusValue, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	alerts := make([]PickupSLAAlert, 0)
	for rows.Next() {
		alert, err := scanPickupSLAAlert(rows.Scan)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, *alert)
	}
	return alerts, rows.Err()
}

type AcknowledgePickupSLAAlertInput struct {
	AlertID         string
	ActorID         string
	ExpectedVersion int
}

func AcknowledgePickupSLAAlert(db *sql.DB, input AcknowledgePickupSLAAlertInput) (*PickupSLAAlert, error) {
	input.AlertID = strings.TrimSpace(input.AlertID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	if db == nil || input.AlertID == "" || input.ActorID == "" || input.ExpectedVersion < 1 {
		return nil, ErrInvalid
	}
	alert, err := scanPickupSLAAlert(db.QueryRow(`
		UPDATE dsh_pickup_sla_alerts
		SET status = 'acknowledged', acknowledged_by_actor_id = $2, acknowledged_at = NOW(),
		    version = version + 1, updated_at = NOW()
		WHERE id = $1::uuid AND status = 'open' AND version = $3
		RETURNING `+pickupSLAAlertColumns,
		input.AlertID, input.ActorID, input.ExpectedVersion,
	).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrVersionConflict
	}
	return alert, err
}
