package ratings

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrInvalid          = errors.New("invalid rating")
	ErrNotEligible      = errors.New("rating is not eligible")
	ErrNotFound         = errors.New("rating source not found")
	ErrEditWindowPassed = errors.New("rating edit window has passed")
)

type PartnerFieldPrompt struct {
	Eligible         bool   `json:"eligible"`
	Completed        bool   `json:"completed"`
	PartnerID        string `json:"partnerId,omitempty"`
	PartnerName      string `json:"partnerName,omitempty"`
	FieldActorID     string `json:"fieldActorId,omitempty"`
	ActivationStatus string `json:"activationStatus,omitempty"`
	Reason           string `json:"reason,omitempty"`
}

type ClientOrderPrompt struct {
	Eligible       bool   `json:"eligible"`
	Completed      bool   `json:"completed"`
	OrderID        string `json:"orderId"`
	OrderNumber    string `json:"orderNumber,omitempty"`
	CaptainActorID string `json:"captainActorId,omitempty"`
	CaptainRated   bool   `json:"captainRated"`
	OrderRated     bool   `json:"orderRated"`
	Reason         string `json:"reason,omitempty"`
}

type Rating struct {
	ID                string    `json:"id"`
	OperatorContextID string    `json:"operatorContextId"`
	RaterKind         string    `json:"raterKind"`
	RaterActorID      string    `json:"raterActorId"`
	TargetKind        string    `json:"targetKind"`
	TargetActorID     string    `json:"targetActorId,omitempty"`
	SourceKind        string    `json:"sourceKind"`
	SourceID          string    `json:"sourceId"`
	Score             int       `json:"score"`
	Comment           string    `json:"comment,omitempty"`
	Dimensions        string    `json:"dimensions,omitempty"`
	ModerationStatus  string    `json:"moderationStatus"`
	FraudSignals      string    `json:"fraudSignals,omitempty"`
	PartnerResponse   string    `json:"partnerResponse,omitempty"`
	DisputeReason     string    `json:"disputeReason,omitempty"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type RatingSummary struct {
	TargetKind                 string         `json:"targetKind"`
	TargetActorID              string         `json:"targetActorId"`
	AverageScore               float64        `json:"averageScore"`
	RatingCount                int            `json:"ratingCount"`
	Distribution               map[string]int `json:"distribution"`
	LastRatedAt                string         `json:"lastRatedAt,omitempty"`
	IsStatisticallySignificant bool           `json:"isStatisticallySignificant"`
}

type OrderRatingInput struct {
	CaptainScore      int    `json:"captainScore"`
	OrderScore        int    `json:"orderScore"`
	CaptainComment    string `json:"captainComment"`
	OrderComment      string `json:"orderComment"`
	CaptainDimensions string `json:"captainDimensions"`
	OrderDimensions   string `json:"orderDimensions"`
}

func PartnerFieldRatingPrompt(ctx context.Context, db *sql.DB, operatorContextID, partnerActorID string) (PartnerFieldPrompt, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	partnerActorID = strings.TrimSpace(partnerActorID)
	if operatorContextID == "" || partnerActorID == "" {
		return PartnerFieldPrompt{}, ErrInvalid
	}
	var prompt PartnerFieldPrompt
	err := db.QueryRowContext(ctx, `
		SELECT p.id, p.display_name, p.activation_status,
		       COALESCE((
		         SELECT v.field_actor_id
		         FROM dsh_partner_field_visits v
		         WHERE v.partner_id=p.id AND v.visit_status IN ('submitted','escalated')
		         ORDER BY COALESCE(v.submitted_at,v.created_at) DESC, v.created_at DESC
		         LIMIT 1
		       ), CASE WHEN p.created_by_surface='app-field' THEN p.created_by_actor_id ELSE '' END)
		FROM dsh_partners p
		WHERE EXISTS (
		  SELECT 1
		  FROM dsh_stores st
		  JOIN dsh_store_actor_scopes scope ON scope.store_id=st.id
		  WHERE st.partner_id=p.id AND scope.actor_id=$1 AND scope.actor_role='partner'
		    AND scope.operator_context_id=$2 AND scope.active=true
		)
		  AND p.activation_status IN ('partner_active','client_visible')
		ORDER BY CASE WHEN p.activation_status='client_visible' THEN 0 ELSE 1 END, p.updated_at DESC
		LIMIT 1`, partnerActorID, operatorContextID).Scan(
		&prompt.PartnerID, &prompt.PartnerName, &prompt.ActivationStatus, &prompt.FieldActorID)
	if errors.Is(err, sql.ErrNoRows) {
		return PartnerFieldPrompt{Eligible: false, Reason: "partner_not_active"}, nil
	}
	if err != nil {
		return PartnerFieldPrompt{}, err
	}
	if strings.TrimSpace(prompt.FieldActorID) == "" {
		prompt.Eligible = false
		prompt.Reason = "field_provider_not_attributed"
		return prompt, nil
	}
	prompt.Eligible = true
	if err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
		  SELECT 1 FROM dsh_provider_ratings
		  WHERE operator_context_id=$1 AND rater_actor_id=$2 AND source_kind='partner_activation'
		    AND source_id=$3 AND target_kind='field' AND status='active'
		)`, operatorContextID, partnerActorID, prompt.PartnerID).Scan(&prompt.Completed); err != nil {
		return PartnerFieldPrompt{}, err
	}
	return prompt, nil
}

func SubmitPartnerFieldRating(ctx context.Context, db *sql.DB, operatorContextID, partnerActorID string, score int, comment, dimensions, correlationID string) (Rating, error) {
	if score < 1 || score > 5 || len(strings.TrimSpace(comment)) > 1000 {
		return Rating{}, ErrInvalid
	}
	prompt, err := PartnerFieldRatingPrompt(ctx, db, operatorContextID, partnerActorID)
	if err != nil {
		return Rating{}, err
	}
	if !prompt.Eligible {
		return Rating{}, ErrNotEligible
	}
	if dimensions == "" {
		dimensions = "{}"
	}
	return upsertRating(ctx, db, ratingInput{
		OperatorContextID: operatorContextID, RaterKind: "partner", RaterActorID: partnerActorID,
		TargetKind: "field", TargetActorID: prompt.FieldActorID,
		SourceKind: "partner_activation", SourceID: prompt.PartnerID,
		Score: score, Comment: comment, Dimensions: dimensions, CorrelationID: correlationID,
	})
}

func ClientOrderRatingPrompt(ctx context.Context, db *sql.DB, operatorContextID, clientActorID, orderID string) (ClientOrderPrompt, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	clientActorID = strings.TrimSpace(clientActorID)
	orderID = strings.TrimSpace(orderID)
	if operatorContextID == "" || clientActorID == "" || orderID == "" {
		return ClientOrderPrompt{}, ErrInvalid
	}
	var prompt ClientOrderPrompt
	var status string
	err := db.QueryRowContext(ctx, `
		SELECT o.id::text, o.order_number, o.status,
		       COALESCE((
		         SELECT d.captain_id FROM dsh_deliveries d
		         WHERE d.order_id=o.id AND d.status='delivered'
		         ORDER BY d.updated_at DESC LIMIT 1
		       ),(
		         SELECT a.captain_id FROM dsh_assignments a
		         WHERE a.order_id=o.id AND a.status IN ('completed','accepted')
		         ORDER BY COALESCE(a.completed_at,a.accepted_at,a.updated_at) DESC LIMIT 1
		       ),'')
		FROM dsh_orders o
		WHERE o.id=$1::uuid AND o.client_id=$2 AND o.operator_context_id=$3`, orderID, clientActorID, operatorContextID).Scan(
		&prompt.OrderID, &prompt.OrderNumber, &status, &prompt.CaptainActorID)
	if errors.Is(err, sql.ErrNoRows) {
		return ClientOrderPrompt{}, ErrNotFound
	}
	if err != nil {
		return ClientOrderPrompt{}, err
	}
	if status != "delivered" {
		prompt.Reason = "order_not_delivered"
		return prompt, nil
	}
	if strings.TrimSpace(prompt.CaptainActorID) == "" {
		prompt.Reason = "captain_not_attributed"
		return prompt, nil
	}
	prompt.Eligible = true
	rows, err := db.QueryContext(ctx, `
		SELECT target_kind FROM dsh_provider_ratings
		WHERE operator_context_id=$1 AND rater_actor_id=$2 AND source_kind='order_delivery'
		  AND source_id=$3 AND status='active'`, operatorContextID, clientActorID, orderID)
	if err != nil {
		return ClientOrderPrompt{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var kind string
		if err := rows.Scan(&kind); err != nil {
			return ClientOrderPrompt{}, err
		}
		if kind == "captain" {
			prompt.CaptainRated = true
		}
		if kind == "order" {
			prompt.OrderRated = true
		}
	}
	if err := rows.Err(); err != nil {
		return ClientOrderPrompt{}, err
	}
	prompt.Completed = prompt.CaptainRated && prompt.OrderRated
	return prompt, nil
}

func SubmitClientOrderRatings(ctx context.Context, db *sql.DB, operatorContextID, clientActorID, orderID string, input OrderRatingInput, correlationID string) ([]Rating, error) {
	if input.CaptainScore < 1 || input.CaptainScore > 5 || input.OrderScore < 1 || input.OrderScore > 5 ||
		len(strings.TrimSpace(input.CaptainComment)) > 1000 || len(strings.TrimSpace(input.OrderComment)) > 1000 {
		return nil, ErrInvalid
	}
	prompt, err := ClientOrderRatingPrompt(ctx, db, operatorContextID, clientActorID, orderID)
	if err != nil {
		return nil, err
	}
	if !prompt.Eligible {
		return nil, ErrNotEligible
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if input.CaptainDimensions == "" {
		input.CaptainDimensions = "{}"
	}
	if input.OrderDimensions == "" {
		input.OrderDimensions = "{}"
	}
	captain, err := upsertRatingTx(ctx, tx, ratingInput{
		OperatorContextID: operatorContextID, RaterKind: "client", RaterActorID: clientActorID,
		TargetKind: "captain", TargetActorID: prompt.CaptainActorID,
		SourceKind: "order_delivery", SourceID: orderID,
		Score: input.CaptainScore, Comment: input.CaptainComment, Dimensions: input.CaptainDimensions, CorrelationID: correlationID,
	})
	if err != nil {
		return nil, err
	}
	order, err := upsertRatingTx(ctx, tx, ratingInput{
		OperatorContextID: operatorContextID, RaterKind: "client", RaterActorID: clientActorID,
		TargetKind: "order", TargetActorID: "",
		SourceKind: "order_delivery", SourceID: orderID,
		Score: input.OrderScore, Comment: input.OrderComment, Dimensions: input.OrderDimensions, CorrelationID: correlationID,
	})
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return []Rating{captain, order}, nil
}

type ratingInput struct {
	OperatorContextID, RaterKind, RaterActorID, TargetKind, TargetActorID  string
	SourceKind, SourceID, Comment, Dimensions, FraudSignals, CorrelationID string
	Score                                                                  int
}

type queryRowExecutor interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}

func upsertRating(ctx context.Context, db *sql.DB, input ratingInput) (Rating, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Rating{}, err
	}
	defer tx.Rollback()
	rating, err := upsertRatingTx(ctx, tx, input)
	if err != nil {
		return Rating{}, err
	}
	if err := tx.Commit(); err != nil {
		return Rating{}, err
	}
	return rating, nil
}

func upsertRatingTx(ctx context.Context, tx *sql.Tx, input ratingInput) (Rating, error) {
	input.Comment = strings.TrimSpace(input.Comment)
	if input.Dimensions == "" {
		input.Dimensions = "{}"
	}
	if input.FraudSignals == "" {
		input.FraudSignals = "{}"
	}

	var prevCreatedAt time.Time
	err := tx.QueryRowContext(ctx, `SELECT created_at FROM dsh_provider_ratings WHERE operator_context_id=$1 AND rater_actor_id=$2 AND source_kind=$3 AND source_id=$4 AND target_kind=$5`,
		input.OperatorContextID, input.RaterActorID, input.SourceKind, input.SourceID, input.TargetKind).Scan(&prevCreatedAt)
	if err == nil {
		if time.Since(prevCreatedAt) > 48*time.Hour {
			return Rating{}, ErrEditWindowPassed
		}
	} else if !errors.Is(err, sql.ErrNoRows) {
		return Rating{}, err
	}

	var rating Rating
	var created bool
	err = tx.QueryRowContext(ctx, `
		WITH previous AS (
		  SELECT id FROM dsh_provider_ratings
		  WHERE operator_context_id=$1 AND rater_actor_id=$2 AND source_kind=$3 AND source_id=$4 AND target_kind=$5
		), upserted AS (
		  INSERT INTO dsh_provider_ratings
		    (operator_context_id,rater_kind,rater_actor_id,target_kind,target_actor_id,source_kind,source_id,score,comment,dimensions,fraud_signals,moderation_status,status)
		  VALUES ($1,$6,$2,$5,$7,$3,$4,$8,$9,$10,$11,'pending','active')
		  ON CONFLICT (operator_context_id,rater_actor_id,source_kind,source_id,target_kind)
		  DO UPDATE SET score=EXCLUDED.score,comment=EXCLUDED.comment,dimensions=EXCLUDED.dimensions,fraud_signals=EXCLUDED.fraud_signals,moderation_status='pending',status='active',
		                target_actor_id=EXCLUDED.target_actor_id,updated_at=now()
		  RETURNING id::text,operator_context_id,rater_kind,rater_actor_id,target_kind,target_actor_id,source_kind,source_id,
		            score,comment,dimensions,moderation_status,fraud_signals,partner_response,dispute_reason,status,created_at,updated_at
		)
		SELECT u.*, NOT EXISTS(SELECT 1 FROM previous) FROM upserted u`,
		input.OperatorContextID, input.RaterActorID, input.SourceKind, input.SourceID, input.TargetKind, input.RaterKind,
		input.TargetActorID, input.Score, input.Comment, input.Dimensions, input.FraudSignals).Scan(
		&rating.ID, &rating.OperatorContextID, &rating.RaterKind, &rating.RaterActorID, &rating.TargetKind, &rating.TargetActorID,
		&rating.SourceKind, &rating.SourceID, &rating.Score, &rating.Comment, &rating.Dimensions, &rating.ModerationStatus, &rating.FraudSignals,
		&rating.PartnerResponse, &rating.DisputeReason, &rating.Status, &rating.CreatedAt, &rating.UpdatedAt, &created)
	if err != nil {
		return Rating{}, err
	}
	action := "updated"
	if created {
		action = "created"
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_provider_rating_events(rating_id,operator_context_id,action,actor_id,score,comment,dimensions,fraud_signals,moderation_status,correlation_id)
		VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, rating.ID, rating.OperatorContextID, action, rating.RaterActorID, rating.Score, rating.Comment, rating.Dimensions, rating.FraudSignals, rating.ModerationStatus, strings.TrimSpace(input.CorrelationID)); err != nil {
		return Rating{}, err
	}
	return rating, nil
}

func Summary(ctx context.Context, db *sql.DB, operatorContextID, targetKind, targetActorID string) (RatingSummary, error) {
	if !oneOf(targetKind, "field", "captain") || strings.TrimSpace(operatorContextID) == "" || strings.TrimSpace(targetActorID) == "" {
		return RatingSummary{}, ErrInvalid
	}
	summary := RatingSummary{TargetKind: targetKind, TargetActorID: targetActorID, Distribution: map[string]int{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}}
	var last sql.NullTime
	if err := db.QueryRowContext(ctx, `
		SELECT COALESCE(AVG(score),0)::float8,COUNT(*)::int,MAX(updated_at)
		FROM dsh_provider_ratings WHERE operator_context_id=$1 AND target_kind=$2 AND target_actor_id=$3 AND status='active'`, operatorContextID, targetKind, targetActorID).Scan(&summary.AverageScore, &summary.RatingCount, &last); err != nil {
		return RatingSummary{}, err
	}
	if last.Valid {
		summary.LastRatedAt = last.Time.UTC().Format(time.RFC3339)
	}

	// Minimum Sample Size Check (e.g. 5)
	if summary.RatingCount >= 5 {
		summary.IsStatisticallySignificant = true
	} else {
		// Suppress summary fields for privacy when sample size is too small
		summary.IsStatisticallySignificant = false
		summary.AverageScore = 0
		summary.Distribution = map[string]int{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
	}

	rows, err := db.QueryContext(ctx, `SELECT score,COUNT(*)::int FROM dsh_provider_ratings WHERE operator_context_id=$1 AND target_kind=$2 AND target_actor_id=$3 AND status='active' GROUP BY score`, operatorContextID, targetKind, targetActorID)
	if err != nil {
		return RatingSummary{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var score, count int
		if err := rows.Scan(&score, &count); err != nil {
			return RatingSummary{}, err
		}
		if summary.IsStatisticallySignificant {
			summary.Distribution[fmt.Sprint(score)] = count
		}
	}
	return summary, rows.Err()
}

func oneOf(value string, allowed ...string) bool {
	for _, current := range allowed {
		if value == current {
			return true
		}
	}
	return false
}

func UpdateModerationStatus(ctx context.Context, db *sql.DB, operatorContextID, ratingID, status, reason, actorID string) error {
	if !oneOf(status, "approved", "rejected", "disputed", "pending") || strings.TrimSpace(ratingID) == "" {
		return ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `
		UPDATE dsh_provider_ratings
		SET moderation_status=$1, dispute_reason=$2, updated_at=now()
		WHERE id=$3::uuid AND operator_context_id=$4`, status, reason, ratingID, operatorContextID)
	if err != nil {
		return err
	}
	count, _ := res.RowsAffected()
	if count == 0 {
		return ErrNotFound
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_provider_rating_events(rating_id,operator_context_id,action,actor_id,moderation_status,dispute_reason,score,comment)
		SELECT id, operator_context_id, 'moderated', $1, moderation_status, dispute_reason, score, comment
		FROM dsh_provider_ratings WHERE id=$2::uuid`, actorID, ratingID); err != nil {
		return err
	}
	return tx.Commit()
}

func SubmitPartnerResponse(ctx context.Context, db *sql.DB, operatorContextID, partnerActorID, ratingID, response string) error {
	if strings.TrimSpace(ratingID) == "" {
		return ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `
		UPDATE dsh_provider_ratings
		SET partner_response=$1, updated_at=now()
		WHERE id=$2::uuid AND operator_context_id=$3 AND target_kind='field' AND target_actor_id=$4`,
		response, ratingID, operatorContextID, partnerActorID)
	if err != nil {
		return err
	}
	count, _ := res.RowsAffected()
	if count == 0 {
		return ErrNotFound
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_provider_rating_events(rating_id,operator_context_id,action,actor_id,partner_response,score,comment)
		SELECT id, operator_context_id, 'partner_responded', $1, partner_response, score, comment
		FROM dsh_provider_ratings WHERE id=$2::uuid`, partnerActorID, ratingID); err != nil {
		return err
	}
	return tx.Commit()
}
