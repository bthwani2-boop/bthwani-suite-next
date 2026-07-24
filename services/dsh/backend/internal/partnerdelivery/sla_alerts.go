package partnerdelivery

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

// DeliverySLAAlert is a persisted, acknowledgeable record of a task leg
// that was overdue at some detection pass -- distinct from the volatile,
// computed-on-read DeliverySLA in sla.go.
type DeliverySLAAlert struct {
	ID                    string
	TaskID                string
	OrderID               string
	StoreID               string
	Leg                   DeliverySLALeg
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

const deliverySLAAlertColumns = `
	id::text, task_id, order_id::text, store_id, leg, status, detected_at,
	acknowledged_by_actor_id, acknowledged_at, resolved_at, correlation_id,
	version, created_at, updated_at
`

func scanDeliverySLAAlert(scan func(...any) error) (*DeliverySLAAlert, error) {
	var a DeliverySLAAlert
	var leg string
	err := scan(
		&a.ID, &a.TaskID, &a.OrderID, &a.StoreID, &leg, &a.Status, &a.DetectedAt,
		&a.AcknowledgedByActorID, &a.AcknowledgedAt, &a.ResolvedAt, &a.CorrelationID,
		&a.Version, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	a.Leg = DeliverySLALeg(leg)
	return &a, nil
}

type RefreshDeliverySLAAlertsResult struct {
	Opened   int `json:"opened"`
	Resolved int `json:"resolved"`
	Active   int `json:"active"`
}

// RefreshDeliverySLAAlerts scans every partner_delivery task, opens an
// alert for any task whose current leg is overdue (per sla.go's on-read
// evaluation), and resolves alerts whose leg is no longer overdue --
// because the task advanced, or closed. The scan-and-reconcile shape
// mirrors orders.RefreshPreparationAlerts; the reconciliation itself runs
// in Go rather than as one SQL statement because a task's overdue leg
// depends on which of four timestamps is set, which is materially harder
// to express as a single declarative condition than preparation's
// single-deadline case.
func RefreshDeliverySLAAlerts(db *sql.DB, correlationID string, now time.Time) (*RefreshDeliverySLAAlertsResult, error) {
	correlationID = strings.TrimSpace(correlationID)
	if db == nil || correlationID == "" {
		return nil, ErrInvalid
	}

	tasks, err := List(db, ListFilter{Limit: 500})
	if err != nil {
		return nil, err
	}
	thresholds := DefaultDeliverySLAThresholds()

	type overdueInfo struct {
		leg     DeliverySLALeg
		orderID string
		storeID string
	}
	overdue := make(map[string]overdueInfo, len(tasks))
	for i := range tasks {
		task := &tasks[i]
		sla := EvaluateDeliverySLA(task, thresholds, now)
		if sla.State == DeliverySLAOverdue {
			overdue[task.ID] = overdueInfo{leg: sla.CurrentLeg, orderID: task.OrderID, storeID: task.StoreID}
		}
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	opened := 0
	for taskID, info := range overdue {
		res, err := tx.Exec(`
			INSERT INTO dsh_delivery_sla_alerts (task_id, order_id, store_id, leg, detected_at, correlation_id)
			VALUES ($1, $2::uuid, $3, $4, $5, $6)
			ON CONFLICT (task_id, leg) WHERE status IN ('open','acknowledged') DO NOTHING`,
			taskID, info.orderID, info.storeID, string(info.leg), now, correlationID)
		if err != nil {
			return nil, err
		}
		count, _ := res.RowsAffected()
		opened += int(count)
	}

	rows, err := tx.Query(`SELECT id, task_id, leg FROM dsh_delivery_sla_alerts WHERE status IN ('open','acknowledged')`)
	if err != nil {
		return nil, err
	}
	type openRow struct{ id, taskID, leg string }
	var toResolve []openRow
	for rows.Next() {
		var row openRow
		if err := rows.Scan(&row.id, &row.taskID, &row.leg); err != nil {
			rows.Close()
			return nil, err
		}
		info, stillOverdue := overdue[row.taskID]
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
			UPDATE dsh_delivery_sla_alerts
			SET status = 'resolved', resolved_at = $2, version = version + 1, updated_at = $2
			WHERE id = $1::uuid AND status IN ('open','acknowledged')`, row.id, now); err != nil {
			return nil, err
		}
		resolved++
	}

	var active int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM dsh_delivery_sla_alerts WHERE status IN ('open','acknowledged')`).Scan(&active); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &RefreshDeliverySLAAlertsResult{Opened: opened, Resolved: resolved, Active: active}, nil
}

// ListDeliverySLAAlerts returns alerts matching status (or all, if empty),
// newest first.
func ListDeliverySLAAlerts(db *sql.DB, status SLAAlertStatus, limit int) ([]DeliverySLAAlert, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	statusValue := strings.TrimSpace(string(status))
	rows, err := db.Query(`
		SELECT `+deliverySLAAlertColumns+`
		FROM dsh_delivery_sla_alerts
		WHERE ($1 = '' OR status = $1)
		ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'acknowledged' THEN 1 ELSE 2 END, detected_at DESC
		LIMIT $2`, statusValue, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	alerts := make([]DeliverySLAAlert, 0)
	for rows.Next() {
		alert, err := scanDeliverySLAAlert(rows.Scan)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, *alert)
	}
	return alerts, rows.Err()
}

type AcknowledgeDeliverySLAAlertInput struct {
	AlertID         string
	ActorID         string
	ExpectedVersion int
}

func AcknowledgeDeliverySLAAlert(db *sql.DB, input AcknowledgeDeliverySLAAlertInput) (*DeliverySLAAlert, error) {
	input.AlertID = strings.TrimSpace(input.AlertID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	if db == nil || input.AlertID == "" || input.ActorID == "" || input.ExpectedVersion < 1 {
		return nil, ErrInvalid
	}
	alert, err := scanDeliverySLAAlert(db.QueryRow(`
		UPDATE dsh_delivery_sla_alerts
		SET status = 'acknowledged', acknowledged_by_actor_id = $2, acknowledged_at = NOW(),
		    version = version + 1, updated_at = NOW()
		WHERE id = $1::uuid AND status = 'open' AND version = $3
		RETURNING `+deliverySLAAlertColumns,
		input.AlertID, input.ActorID, input.ExpectedVersion,
	).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrVersionConflict
	}
	return alert, err
}
