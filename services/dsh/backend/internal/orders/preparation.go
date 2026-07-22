package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	DefaultPreparationMinutes = 25
	DefaultWarningMinutes     = 5
)

type PreparationSLAState string

const (
	PreparationSLANotStarted PreparationSLAState = "not_started"
	PreparationSLAOnTrack    PreparationSLAState = "on_track"
	PreparationSLADueSoon    PreparationSLAState = "due_soon"
	PreparationSLAOverdue    PreparationSLAState = "overdue"
	PreparationSLAReady      PreparationSLAState = "ready"
)

type PreparationTiming struct {
	OrderID               string              `json:"orderId"`
	AcceptedAt            *time.Time          `json:"acceptedAt"`
	PreparationStartedAt  *time.Time          `json:"preparationStartedAt"`
	EstimatedReadyAt      *time.Time          `json:"estimatedReadyAt"`
	ReadyAt               *time.Time          `json:"readyAt"`
	EstimatedMinutes      int                 `json:"estimatedPreparationMinutes"`
	WarningMinutes        int                 `json:"preparationWarningMinutes"`
	DelayReason           string              `json:"preparationDelayReason"`
	EstimateRevisionCount int                 `json:"preparationEstimateRevisionCount"`
	SLAState              PreparationSLAState `json:"preparationSlaState"`
	RemainingSeconds      int64               `json:"preparationRemainingSeconds"`
}

type StorePreparationPolicy struct {
	StoreID                   string    `json:"storeId"`
	DefaultPreparationMinutes int       `json:"defaultPreparationMinutes"`
	WarningBeforeMinutes      int       `json:"warningBeforeMinutes"`
	Version                   int       `json:"version"`
	UpdatedByActorID          string    `json:"updatedByActorId"`
	UpdatedAt                 time.Time `json:"updatedAt"`
}

type UpdateStorePreparationPolicyInput struct {
	StoreID                   string
	ActorID                   string
	ExpectedVersion           int
	DefaultPreparationMinutes int
	WarningBeforeMinutes      int
	Reason                    string
	CorrelationID             string
}

type RevisePreparationEstimateInput struct {
	OrderID          string
	StoreID          string
	ActorID          string
	RemainingMinutes int
	Reason           string
	CorrelationID    string
}

func calculatePreparationSLA(timing *PreparationTiming, now time.Time) {
	timing.RemainingSeconds = 0
	switch {
	case timing.ReadyAt != nil:
		timing.SLAState = PreparationSLAReady
	case timing.AcceptedAt == nil || timing.EstimatedReadyAt == nil:
		timing.SLAState = PreparationSLANotStarted
	default:
		remaining := timing.EstimatedReadyAt.Sub(now)
		timing.RemainingSeconds = int64(remaining.Seconds())
		if remaining <= 0 {
			timing.SLAState = PreparationSLAOverdue
			return
		}
		if remaining <= time.Duration(timing.WarningMinutes)*time.Minute {
			timing.SLAState = PreparationSLADueSoon
			return
		}
		timing.SLAState = PreparationSLAOnTrack
	}
}

func scanPreparationTiming(row *sql.Row, now time.Time) (*PreparationTiming, error) {
	var timing PreparationTiming
	if err := row.Scan(
		&timing.OrderID,
		&timing.AcceptedAt,
		&timing.PreparationStartedAt,
		&timing.EstimatedReadyAt,
		&timing.ReadyAt,
		&timing.EstimatedMinutes,
		&timing.WarningMinutes,
		&timing.DelayReason,
		&timing.EstimateRevisionCount,
	); err != nil {
		return nil, err
	}
	calculatePreparationSLA(&timing, now)
	return &timing, nil
}

func GetPreparationTiming(db *sql.DB, orderID string, now time.Time) (*PreparationTiming, error) {
	orderID = strings.TrimSpace(orderID)
	if db == nil || orderID == "" {
		return nil, ErrInvalid
	}
	timing, err := scanPreparationTiming(db.QueryRow(`
		SELECT id::text,
		       accepted_at,
		       preparation_started_at,
		       estimated_ready_at,
		       ready_at,
		       estimated_preparation_minutes,
		       preparation_warning_minutes,
		       COALESCE(preparation_delay_reason, ''),
		       preparation_estimate_revision_count
		FROM dsh_orders
		WHERE id=$1::uuid`, orderID), now)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return timing, err
}

func AcceptOrderWithPreparation(db *sql.DB, orderID, actorID string) (*Order, error) {
	orderID = strings.TrimSpace(orderID)
	actorID = strings.TrimSpace(actorID)
	if db == nil || orderID == "" || actorID == "" {
		return nil, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var storeID string
	var current OrderStatus
	if err := tx.QueryRow(`
		SELECT store_id, status
		FROM dsh_orders
		WHERE id=$1::uuid
		FOR UPDATE`, orderID).Scan(&storeID, &current); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if current != StatusPending {
		return nil, fmt.Errorf("%w: cannot accept from %s", ErrConflict, current)
	}

	var preparationMinutes, warningMinutes int
	if err := tx.QueryRow(`
		SELECT COALESCE(default_preparation_minutes, $2),
		       COALESCE(warning_before_minutes, $3)
		FROM (SELECT $1::text AS store_id) requested
		LEFT JOIN dsh_store_order_preparation_policies policy USING (store_id)`,
		storeID,
		DefaultPreparationMinutes,
		DefaultWarningMinutes,
	).Scan(&preparationMinutes, &warningMinutes); err != nil {
		return nil, err
	}

	result, err := tx.Exec(`
		UPDATE dsh_orders
		SET status=$2,
		    accepted_at=NOW(),
		    estimated_ready_at=NOW()+make_interval(mins => $3),
		    estimated_preparation_minutes=$3,
		    preparation_warning_minutes=$4,
		    preparation_delay_reason=NULL,
		    updated_at=NOW()
		WHERE id=$1::uuid AND status=$5`,
		orderID,
		string(StatusStoreAccepted),
		preparationMinutes,
		warningMinutes,
		string(StatusPending),
	)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, ErrConflict
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_order_status_events(order_id, actor_role, from_status, to_status, note)
		VALUES($1::uuid,'partner',$2,$3,$4)`,
		orderID,
		string(StatusPending),
		string(StatusStoreAccepted),
		fmt.Sprintf("accepted with preparation estimate %d minutes", preparationMinutes),
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetOrder(db, orderID)
}

func MarkPreparingWithTiming(db *sql.DB, orderID, actorID string) (*Order, error) {
	return transitionPreparationStatus(
		db,
		orderID,
		actorID,
		StatusStoreAccepted,
		StatusPreparing,
		"preparation_started_at=COALESCE(preparation_started_at,NOW())",
		"preparation started",
	)
}

func MarkReadyWithTiming(db *sql.DB, orderID, actorID string) (*Order, error) {
	return transitionPreparationStatus(
		db,
		orderID,
		actorID,
		StatusPreparing,
		StatusReadyForPickup,
		"ready_at=COALESCE(ready_at,NOW())",
		"order ready for pickup",
	)
}

func transitionPreparationStatus(
	db *sql.DB,
	orderID,
	actorID string,
	from,
	to OrderStatus,
	timestampAssignment,
	note string,
) (*Order, error) {
	orderID = strings.TrimSpace(orderID)
	actorID = strings.TrimSpace(actorID)
	if db == nil || orderID == "" || actorID == "" {
		return nil, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := fmt.Sprintf(`
		UPDATE dsh_orders
		SET status=$2, %s, updated_at=NOW()
		WHERE id=$1::uuid AND status=$3`, timestampAssignment)
	result, err := tx.Exec(query, orderID, string(to), string(from))
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		var exists bool
		if scanErr := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM dsh_orders WHERE id=$1::uuid)`, orderID).Scan(&exists); scanErr != nil {
			return nil, scanErr
		}
		if !exists {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("%w: cannot transition from current state to %s", ErrConflict, to)
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_order_status_events(order_id, actor_role, from_status, to_status, note)
		VALUES($1::uuid,'partner',$2,$3,$4)`, orderID, string(from), string(to), note); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetOrder(db, orderID)
}

func RevisePreparationEstimate(db *sql.DB, input RevisePreparationEstimateInput) (*PreparationTiming, error) {
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if db == nil || input.OrderID == "" || input.StoreID == "" || input.ActorID == "" ||
		input.RemainingMinutes < 5 || input.RemainingMinutes > 180 ||
		len(input.Reason) < 3 || input.CorrelationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var currentStatus OrderStatus
	var currentEstimate time.Time
	var warningMinutes int
	var actualStoreID string
	if err := tx.QueryRow(`
		SELECT status, estimated_ready_at, preparation_warning_minutes, store_id
		FROM dsh_orders
		WHERE id=$1::uuid
		FOR UPDATE`, input.OrderID).Scan(
		&currentStatus,
		&currentEstimate,
		&warningMinutes,
		&actualStoreID,
	); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if actualStoreID != input.StoreID {
		return nil, ErrNotFound
	}
	if currentStatus != StatusStoreAccepted && currentStatus != StatusPreparing {
		return nil, ErrConflict
	}

	var existing bool
	if err := tx.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM dsh_order_preparation_estimate_events
			WHERE order_id=$1::uuid AND correlation_id=$2
		)`, input.OrderID, input.CorrelationID).Scan(&existing); err != nil {
		return nil, err
	}
	if existing {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetPreparationTiming(db, input.OrderID, time.Now())
	}

	newWarningMinutes := warningMinutes
	if newWarningMinutes >= input.RemainingMinutes {
		newWarningMinutes = input.RemainingMinutes - 1
	}
	var revisedEstimate time.Time
	if err := tx.QueryRow(`SELECT NOW()+make_interval(mins => $1)`, input.RemainingMinutes).Scan(&revisedEstimate); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		UPDATE dsh_orders
		SET estimated_ready_at=$2,
		    estimated_preparation_minutes=$3,
		    preparation_warning_minutes=$4,
		    preparation_delay_reason=$5,
		    preparation_estimate_revision_count=preparation_estimate_revision_count+1,
		    updated_at=NOW()
		WHERE id=$1::uuid`,
		input.OrderID,
		revisedEstimate,
		input.RemainingMinutes,
		newWarningMinutes,
		input.Reason,
	); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_order_preparation_estimate_events(
			order_id,store_id,actor_id,from_estimated_ready_at,to_estimated_ready_at,
			remaining_minutes,reason,correlation_id)
		VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8)`,
		input.OrderID,
		input.StoreID,
		input.ActorID,
		currentEstimate,
		revisedEstimate,
		input.RemainingMinutes,
		input.Reason,
		input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_operational_outbox_events(event_type,entity_type,entity_id,payload,correlation_id)
		VALUES('order.preparation_estimate_revised','order',$1,$2::jsonb,$3)`,
		input.OrderID,
		fmt.Sprintf(`{"orderId":%q,"storeId":%q,"estimatedReadyAt":%q,"reason":%q}`,
			input.OrderID,
			input.StoreID,
			revisedEstimate.UTC().Format(time.RFC3339),
			input.Reason,
		),
		input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetPreparationTiming(db, input.OrderID, time.Now())
}

func GetStorePreparationPolicy(db *sql.DB, storeID string) (*StorePreparationPolicy, error) {
	storeID = strings.TrimSpace(storeID)
	if db == nil || storeID == "" {
		return nil, ErrInvalid
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_store_order_preparation_policies(store_id)
		VALUES($1)
		ON CONFLICT(store_id) DO NOTHING`, storeID); err != nil {
		return nil, err
	}
	var policy StorePreparationPolicy
	if err := db.QueryRow(`
		SELECT store_id,default_preparation_minutes,warning_before_minutes,version,
		       COALESCE(updated_by_actor_id,''),updated_at
		FROM dsh_store_order_preparation_policies
		WHERE store_id=$1`, storeID).Scan(
		&policy.StoreID,
		&policy.DefaultPreparationMinutes,
		&policy.WarningBeforeMinutes,
		&policy.Version,
		&policy.UpdatedByActorID,
		&policy.UpdatedAt,
	); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	return &policy, nil
}

func UpdateStorePreparationPolicy(db *sql.DB, input UpdateStorePreparationPolicyInput) (*StorePreparationPolicy, error) {
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if db == nil || input.StoreID == "" || input.ActorID == "" || input.ExpectedVersion < 1 ||
		input.DefaultPreparationMinutes < 5 || input.DefaultPreparationMinutes > 180 ||
		input.WarningBeforeMinutes < 1 || input.WarningBeforeMinutes >= input.DefaultPreparationMinutes ||
		len(input.Reason) < 3 || input.CorrelationID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`
		INSERT INTO dsh_store_order_preparation_policies(store_id)
		VALUES($1)
		ON CONFLICT(store_id) DO NOTHING`, input.StoreID); err != nil {
		return nil, err
	}

	var fromDefault, fromWarning, fromVersion int
	if err := tx.QueryRow(`
		SELECT default_preparation_minutes,warning_before_minutes,version
		FROM dsh_store_order_preparation_policies
		WHERE store_id=$1
		FOR UPDATE`, input.StoreID).Scan(&fromDefault, &fromWarning, &fromVersion); err != nil {
		return nil, err
	}
	if fromVersion != input.ExpectedVersion {
		return nil, ErrConflict
	}

	var existing bool
	if err := tx.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM dsh_store_order_preparation_policy_events
			WHERE store_id=$1 AND correlation_id=$2
		)`, input.StoreID, input.CorrelationID).Scan(&existing); err != nil {
		return nil, err
	}
	if existing {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetStorePreparationPolicy(db, input.StoreID)
	}

	toVersion := fromVersion + 1
	if _, err := tx.Exec(`
		UPDATE dsh_store_order_preparation_policies
		SET default_preparation_minutes=$2,
		    warning_before_minutes=$3,
		    version=$4,
		    updated_by_actor_id=$5,
		    updated_at=NOW()
		WHERE store_id=$1 AND version=$6`,
		input.StoreID,
		input.DefaultPreparationMinutes,
		input.WarningBeforeMinutes,
		toVersion,
		input.ActorID,
		fromVersion,
	); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_store_order_preparation_policy_events(
			store_id,actor_id,from_default_minutes,to_default_minutes,
			from_warning_minutes,to_warning_minutes,from_version,to_version,reason,correlation_id)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		input.StoreID,
		input.ActorID,
		fromDefault,
		input.DefaultPreparationMinutes,
		fromWarning,
		input.WarningBeforeMinutes,
		fromVersion,
		toVersion,
		input.Reason,
		input.CorrelationID,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetStorePreparationPolicy(db, input.StoreID)
}
