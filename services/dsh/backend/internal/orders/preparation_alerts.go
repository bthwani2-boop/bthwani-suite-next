package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type PreparationAlertKind string

type PreparationAlertStatus string

const (
	PreparationAlertDueSoon                 PreparationAlertKind = "due_soon"
	PreparationAlertOverdue                 PreparationAlertKind = "overdue"
	PreparationAlertCustomerDecisionPending PreparationAlertKind = "customer_decision_pending"

	PreparationAlertOpen         PreparationAlertStatus = "open"
	PreparationAlertAcknowledged PreparationAlertStatus = "acknowledged"
	PreparationAlertResolved     PreparationAlertStatus = "resolved"
)

type PreparationAlert struct {
	ID                      string                 `json:"id"`
	OrderID                 string                 `json:"orderId"`
	StoreID                 string                 `json:"storeId"`
	Kind                    PreparationAlertKind   `json:"kind"`
	Status                  PreparationAlertStatus `json:"status"`
	EstimateRevision        int                    `json:"estimateRevision"`
	DetectedAt              time.Time              `json:"detectedAt"`
	AcknowledgedByActorID   string                 `json:"acknowledgedByActorId"`
	AcknowledgedAt          *time.Time             `json:"acknowledgedAt"`
	ResolvedAt              *time.Time             `json:"resolvedAt"`
	ResolutionReason        string                 `json:"resolutionReason"`
	Version                 int                    `json:"version"`
	CreatedAt               time.Time              `json:"createdAt"`
	UpdatedAt               time.Time              `json:"updatedAt"`
}

type RefreshPreparationAlertsResult struct {
	Opened   int `json:"opened"`
	Resolved int `json:"resolved"`
	Active   int `json:"active"`
}

type AcknowledgePreparationAlertInput struct {
	AlertID         string
	ActorID         string
	ExpectedVersion int
	CorrelationID   string
}

type preparationAlertScanner interface {
	Scan(dest ...any) error
}

const preparationAlertColumns = `
	id::text,
	order_id::text,
	store_id,
	alert_kind,
	status,
	estimate_revision,
	detected_at,
	COALESCE(acknowledged_by_actor_id, ''),
	acknowledged_at,
	resolved_at,
	COALESCE(resolution_reason, ''),
	version,
	created_at,
	updated_at`

func scanPreparationAlert(scanner preparationAlertScanner) (*PreparationAlert, error) {
	var alert PreparationAlert
	if err := scanner.Scan(
		&alert.ID,
		&alert.OrderID,
		&alert.StoreID,
		&alert.Kind,
		&alert.Status,
		&alert.EstimateRevision,
		&alert.DetectedAt,
		&alert.AcknowledgedByActorID,
		&alert.AcknowledgedAt,
		&alert.ResolvedAt,
		&alert.ResolutionReason,
		&alert.Version,
		&alert.CreatedAt,
		&alert.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &alert, nil
}

func RefreshPreparationAlerts(
	db *sql.DB,
	actorID,
	correlationID string,
	now time.Time,
) (*RefreshPreparationAlertsResult, error) {
	actorID = strings.TrimSpace(actorID)
	correlationID = strings.TrimSpace(correlationID)
	if db == nil || actorID == "" || correlationID == "" || now.IsZero() {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	resolvedResult, err := tx.Exec(`
		UPDATE dsh_order_preparation_alerts a
		SET status='resolved',
		    resolved_at=$1,
		    resolution_reason='alert condition no longer active',
		    version=version+1,
		    updated_at=$1
		WHERE a.status IN ('open','acknowledged')
		  AND NOT EXISTS (
			SELECT 1
			FROM dsh_orders o
			WHERE o.id=a.order_id
			  AND o.status IN ('store_accepted','preparing')
			  AND (
				(a.alert_kind='overdue' AND o.estimated_ready_at IS NOT NULL AND o.estimated_ready_at <= $1)
				OR
				(a.alert_kind='due_soon'
				 AND o.estimated_ready_at IS NOT NULL
				 AND o.estimated_ready_at > $1
				 AND o.estimated_ready_at <= $1 + make_interval(mins => o.preparation_warning_minutes))
				OR
				(a.alert_kind='customer_decision_pending' AND EXISTS (
					SELECT 1
					FROM dsh_order_preparation_issues pi
					WHERE pi.order_id=o.id
					  AND pi.status='open'
					  AND pi.customer_decision='pending'
				))
			  )
		  )`, now)
	if err != nil {
		return nil, err
	}
	resolvedCount64, _ := resolvedResult.RowsAffected()

	opened := 0
	insertKinds := []struct {
		kind      PreparationAlertKind
		condition string
	}{
		{
			kind: PreparationAlertOverdue,
			condition: `o.estimated_ready_at IS NOT NULL AND o.estimated_ready_at <= $1`,
		},
		{
			kind: PreparationAlertDueSoon,
			condition: `o.estimated_ready_at IS NOT NULL
				AND o.estimated_ready_at > $1
				AND o.estimated_ready_at <= $1 + make_interval(mins => o.preparation_warning_minutes)`,
		},
		{
			kind: PreparationAlertCustomerDecisionPending,
			condition: `EXISTS (
				SELECT 1
				FROM dsh_order_preparation_issues pi
				WHERE pi.order_id=o.id
				  AND pi.status='open'
				  AND pi.customer_decision='pending'
			)`,
		},
	}

	for _, candidate := range insertKinds {
		query := fmt.Sprintf(`
			INSERT INTO dsh_order_preparation_alerts(
				order_id,store_id,alert_kind,estimate_revision,detected_at,correlation_id)
			SELECT
				o.id,
				o.store_id,
				$2,
				o.preparation_estimate_revision_count,
				$1,
				$3 || ':' || $2 || ':' || o.id::text || ':' || o.preparation_estimate_revision_count::text
			FROM dsh_orders o
			WHERE o.status IN ('store_accepted','preparing')
			  AND %s
			ON CONFLICT (order_id,alert_kind,estimate_revision)
				WHERE status IN ('open','acknowledged')
			DO NOTHING`, candidate.condition)
		result, execErr := tx.Exec(query, now, string(candidate.kind), correlationID)
		if execErr != nil {
			return nil, execErr
		}
		count, _ := result.RowsAffected()
		opened += int(count)
	}

	if _, err := tx.Exec(`
		INSERT INTO dsh_operational_outbox_events(
			event_type,entity_type,entity_id,payload,correlation_id)
		SELECT
			'order.preparation_alert_opened',
			'order',
			a.order_id::text,
			jsonb_build_object(
				'alertId', a.id::text,
				'orderId', a.order_id::text,
				'storeId', a.store_id,
				'kind', a.alert_kind,
				'estimateRevision', a.estimate_revision,
				'detectedAt', a.detected_at
			),
			a.correlation_id
		FROM dsh_order_preparation_alerts a
		WHERE a.correlation_id LIKE $1 || ':%'
		ON CONFLICT DO NOTHING`, correlationID); err != nil {
		return nil, err
	}

	var active int
	if err := tx.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_order_preparation_alerts
		WHERE status IN ('open','acknowledged')`).Scan(&active); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &RefreshPreparationAlertsResult{
		Opened:   opened,
		Resolved: int(resolvedCount64),
		Active:   active,
	}, nil
}

func ListPreparationAlerts(
	db *sql.DB,
	status PreparationAlertStatus,
	limit int,
) ([]PreparationAlert, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	statusValue := strings.TrimSpace(string(status))
	if statusValue != "" &&
		status != PreparationAlertOpen &&
		status != PreparationAlertAcknowledged &&
		status != PreparationAlertResolved {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT `+preparationAlertColumns+`
		FROM dsh_order_preparation_alerts
		WHERE ($1='' OR status=$1)
		ORDER BY
			CASE status WHEN 'open' THEN 0 WHEN 'acknowledged' THEN 1 ELSE 2 END,
			CASE alert_kind WHEN 'overdue' THEN 0 WHEN 'customer_decision_pending' THEN 1 ELSE 2 END,
			detected_at DESC
		LIMIT $2`, statusValue, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	alerts := make([]PreparationAlert, 0)
	for rows.Next() {
		alert, scanErr := scanPreparationAlert(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		alerts = append(alerts, *alert)
	}
	return alerts, rows.Err()
}

func AcknowledgePreparationAlert(
	db *sql.DB,
	input AcknowledgePreparationAlertInput,
) (*PreparationAlert, error) {
	input.AlertID = strings.TrimSpace(input.AlertID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if db == nil || input.AlertID == "" || input.ActorID == "" ||
		input.ExpectedVersion < 1 || input.CorrelationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	alert, err := scanPreparationAlert(tx.QueryRow(`
		UPDATE dsh_order_preparation_alerts
		SET status='acknowledged',
		    acknowledged_by_actor_id=$2,
		    acknowledged_at=NOW(),
		    version=version+1,
		    updated_at=NOW()
		WHERE id=$1::uuid AND status='open' AND version=$3
		RETURNING `+preparationAlertColumns,
		input.AlertID,
		input.ActorID,
		input.ExpectedVersion,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_operational_outbox_events(
			event_type,entity_type,entity_id,payload,correlation_id)
		VALUES(
			'order.preparation_alert_acknowledged',
			'order',
			$1,
			jsonb_build_object(
				'alertId',$2,
				'orderId',$1,
				'kind',$3,
				'acknowledgedByActorId',$4,
				'version',$5
			),
			$6
		)`,
		alert.OrderID,
		alert.ID,
		string(alert.Kind),
		input.ActorID,
		alert.Version,
		input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return alert, nil
}
