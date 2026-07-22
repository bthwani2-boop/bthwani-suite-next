package refund

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/dshoutbox"
	"wlt-api/internal/ledger"
	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

var (
	ErrRefundAmountUnavailable    = errors.New("requested refund amount exceeds the remaining refundable amount")
	ErrRefundIdempotencyConflict = errors.New("refund idempotency key was already used with a different payload")
	ErrRefundMakerChecker        = errors.New("refund maker cannot review the same refund")
	ErrRefundProviderUnknown     = errors.New("refund provider result is unknown and requires reconciliation")
	ErrRefundReconcileEvidence   = errors.New("refund reconciliation requires an evidence note")
)

type GovernedRefund struct {
	ID                      string  `json:"id"`
	TenantID                string  `json:"tenantId"`
	PaymentSessionID        string  `json:"paymentSessionId"`
	OrderID                 string  `json:"orderId"`
	ClientID                string  `json:"clientId"`
	AmountMinorUnits        int64   `json:"amountMinorUnits"`
	Currency                string  `json:"currency"`
	Reason                  string  `json:"reason"`
	Status                  string  `json:"status"`
	RequestedByOperatorID   string  `json:"requestedByOperatorId"`
	ApprovedByOperatorID    string  `json:"approvedByOperatorId,omitempty"`
	RejectedByOperatorID    string  `json:"rejectedByOperatorId,omitempty"`
	DecisionReason          string  `json:"decisionReason,omitempty"`
	EligibilityReference    string  `json:"eligibilityReference"`
	IdempotencyKey          string  `json:"idempotencyKey"`
	ProviderIdempotencyKey  string  `json:"providerIdempotencyKey"`
	ProviderReference       string  `json:"providerReference,omitempty"`
	ProviderStatus          string  `json:"providerStatus,omitempty"`
	ProviderError           string  `json:"providerError,omitempty"`
	ReconciliationCaseID    string  `json:"reconciliationCaseId,omitempty"`
	Version                 int     `json:"version"`
	ProviderAttemptedAt     *string `json:"providerAttemptedAt,omitempty"`
	ResolvedAt              *string `json:"resolvedAt,omitempty"`
	CreatedAt               string  `json:"createdAt"`
	UpdatedAt               string  `json:"updatedAt"`
}

type GovernedCreateRefundInput struct {
	TenantID             string `json:"tenantId"`
	PaymentSessionID     string `json:"paymentSessionId"`
	OrderID              string `json:"orderId"`
	ClientID             string `json:"clientId"`
	AmountMinorUnits     int64  `json:"amountMinorUnits"`
	Reason               string `json:"reason"`
	EligibilityReference string `json:"eligibilityReference"`
	RequestedByOperatorID string `json:"requestedByOperatorId"`
	IdempotencyKey       string `json:"-"`
	CorrelationID        string `json:"-"`
}

type RefundDecisionInput struct {
	OperatorID   string `json:"operatorId"`
	Reason       string `json:"reason"`
	CorrelationID string `json:"-"`
}

type RefundReconciliationInput struct {
	OperatorID       string `json:"operatorId"`
	ResolutionAction string `json:"resolutionAction"`
	EvidenceNote     string `json:"evidenceNote"`
	ProviderReference string `json:"providerReference"`
	CorrelationID    string `json:"-"`
}

type RefundAuditEvent struct {
	ID                string `json:"id"`
	RefundID          string `json:"refundId"`
	TenantID          string `json:"tenantId"`
	EventType         string `json:"eventType"`
	ActorID           string `json:"actorId"`
	ActorType         string `json:"actorType"`
	FromStatus        string `json:"fromStatus,omitempty"`
	ToStatus          string `json:"toStatus"`
	Reason            string `json:"reason,omitempty"`
	CorrelationID     string `json:"correlationId,omitempty"`
	IdempotencyKey    string `json:"idempotencyKey,omitempty"`
	ProviderReference string `json:"providerReference,omitempty"`
	CreatedAt         string `json:"createdAt"`
}

const governedRefundCols = `id, tenant_id, payment_session_id, order_id, client_id,
	amount_minor_units, currency, reason, status, requested_by_operator_id,
	COALESCE(approved_by_operator_id,''), COALESCE(rejected_by_operator_id,''),
	COALESCE(decision_reason,''), eligibility_reference, idempotency_key,
	provider_idempotency_key, COALESCE(provider_reference,''), COALESCE(provider_status,''),
	COALESCE(provider_error,''), COALESCE(reconciliation_case_id,''), version,
	provider_attempted_at, resolved_at, created_at, updated_at`

type scanner interface{ Scan(dest ...any) error }

func scanGovernedRefund(row scanner) (*GovernedRefund, error) {
	var out GovernedRefund
	var providerAttemptedAt, resolvedAt sql.NullTime
	if err := row.Scan(
		&out.ID, &out.TenantID, &out.PaymentSessionID, &out.OrderID, &out.ClientID,
		&out.AmountMinorUnits, &out.Currency, &out.Reason, &out.Status, &out.RequestedByOperatorID,
		&out.ApprovedByOperatorID, &out.RejectedByOperatorID, &out.DecisionReason,
		&out.EligibilityReference, &out.IdempotencyKey, &out.ProviderIdempotencyKey,
		&out.ProviderReference, &out.ProviderStatus, &out.ProviderError,
		&out.ReconciliationCaseID, &out.Version, &providerAttemptedAt, &resolvedAt,
		&out.CreatedAt, &out.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if providerAttemptedAt.Valid {
		value := providerAttemptedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		out.ProviderAttemptedAt = &value
	}
	if resolvedAt.Valid {
		value := resolvedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		out.ResolvedAt = &value
	}
	return &out, nil
}

func normalizeCreateInput(input GovernedCreateRefundInput) GovernedCreateRefundInput {
	input.TenantID = strings.TrimSpace(input.TenantID)
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.EligibilityReference = strings.TrimSpace(input.EligibilityReference)
	input.RequestedByOperatorID = strings.TrimSpace(input.RequestedByOperatorID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	return input
}

func appendRefundAuditTx(ctx context.Context, tx *sql.Tx, refund *GovernedRefund, eventType, actorID, actorType, fromStatus, toStatus, reason, correlationID, idempotencyKey, providerReference string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_refund_audit_events
			(refund_id, tenant_id, event_type, actor_id, actor_type, from_status, to_status,
			 reason, correlation_id, idempotency_key, provider_reference)
		VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),$7,NULLIF($8,''),NULLIF($9,''),NULLIF($10,''),NULLIF($11,''))`,
		refund.ID, refund.TenantID, eventType, actorID, actorType, fromStatus, toStatus,
		reason, correlationID, idempotencyKey, providerReference,
	)
	return err
}

func appendRefundReferenceTx(ctx context.Context, tx *sql.Tx, orderID, status string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO wlt_refund_status_refs(order_id,status) VALUES($1,$2)`, orderID, status)
	return err
}

func GetGovernedRefund(db *sql.DB, refundID string) (*GovernedRefund, error) {
	refundID = strings.TrimSpace(refundID)
	if refundID == "" {
		return nil, fmt.Errorf("refundId is required")
	}
	out, err := scanGovernedRefund(db.QueryRow(`SELECT `+governedRefundCols+` FROM wlt_refunds WHERE id=$1`, refundID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return out, err
}

func ListGovernedRefunds(db *sql.DB, orderID, clientID, tenantID string) ([]*GovernedRefund, error) {
	orderID = strings.TrimSpace(orderID)
	clientID = strings.TrimSpace(clientID)
	tenantID = strings.TrimSpace(tenantID)
	query := `SELECT ` + governedRefundCols + ` FROM wlt_refunds WHERE 1=1`
	args := make([]any, 0, 3)
	if tenantID != "" {
		args = append(args, tenantID)
		query += fmt.Sprintf(" AND tenant_id=$%d", len(args))
	}
	if orderID != "" {
		args = append(args, orderID)
		query += fmt.Sprintf(" AND order_id=$%d", len(args))
	}
	if clientID != "" {
		args = append(args, clientID)
		query += fmt.Sprintf(" AND client_id=$%d", len(args))
	}
	query += ` ORDER BY created_at DESC LIMIT 100`
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*GovernedRefund, 0)
	for rows.Next() {
		item, err := scanGovernedRefund(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func CreateGovernedRefund(ctx context.Context, db *sql.DB, input GovernedCreateRefundInput) (*GovernedRefund, bool, error) {
	input = normalizeCreateInput(input)
	if input.PaymentSessionID == "" || input.OrderID == "" || input.ClientID == "" || input.Reason == "" || input.EligibilityReference == "" || input.RequestedByOperatorID == "" || input.IdempotencyKey == "" {
		return nil, false, fmt.Errorf("paymentSessionId, orderId, clientId, reason, eligibilityReference, requestedByOperatorId and Idempotency-Key are required")
	}
	if input.AmountMinorUnits < 0 {
		return nil, false, fmt.Errorf("amountMinorUnits must not be negative")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

	var sessionTenant, sessionClient, sessionCurrency, sessionStatus string
	var sessionAmount int64
	var checkoutIntentID, specialRequestID sql.NullString
	if err := tx.QueryRowContext(ctx, `
		SELECT tenant_id, client_id, amount_minor_units, currency, status, checkout_intent_id, special_request_id
		FROM wlt_payment_sessions WHERE id=$1 FOR UPDATE`, input.PaymentSessionID).Scan(
		&sessionTenant, &sessionClient, &sessionAmount, &sessionCurrency, &sessionStatus, &checkoutIntentID, &specialRequestID,
	); errors.Is(err, sql.ErrNoRows) {
		return nil, false, fmt.Errorf("payment session not found")
	} else if err != nil {
		return nil, false, err
	}
	if input.TenantID == "" {
		input.TenantID = sessionTenant
	}
	if input.TenantID != sessionTenant || input.ClientID != sessionClient {
		return nil, false, ErrRefundReferenceConflict
	}
	if sessionStatus != "captured" && sessionStatus != "cod_collected" {
		return nil, false, ErrSessionNotRefundable
	}
	if sessionCurrency == "" {
		sessionCurrency = "YER"
	}

	existing, existingErr := scanGovernedRefund(tx.QueryRowContext(ctx, `
		SELECT `+governedRefundCols+` FROM wlt_refunds
		WHERE tenant_id=$1 AND payment_session_id=$2 AND idempotency_key=$3
		FOR UPDATE`, input.TenantID, input.PaymentSessionID, input.IdempotencyKey))
	if existingErr == nil {
		amountMatches := input.AmountMinorUnits == 0 || input.AmountMinorUnits == existing.AmountMinorUnits
		if !amountMatches || existing.OrderID != input.OrderID || existing.ClientID != input.ClientID || existing.Reason != input.Reason || existing.EligibilityReference != input.EligibilityReference || existing.RequestedByOperatorID != input.RequestedByOperatorID {
			return nil, false, ErrRefundIdempotencyConflict
		}
		if err := tx.Commit(); err != nil {
			return nil, false, err
		}
		return existing, true, nil
	}
	if !errors.Is(existingErr, sql.ErrNoRows) {
		return nil, false, existingErr
	}

	var reserved int64
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount_minor_units),0)
		FROM wlt_refunds
		WHERE tenant_id=$1 AND payment_session_id=$2
		  AND status IN ('requested','approved','processing','provider_unknown','completed')`, input.TenantID, input.PaymentSessionID).Scan(&reserved); err != nil {
		return nil, false, err
	}
	remaining := sessionAmount - reserved
	requestedAmount := input.AmountMinorUnits
	if requestedAmount == 0 {
		requestedAmount = remaining
	}
	if requestedAmount <= 0 || requestedAmount > remaining {
		return nil, false, ErrRefundAmountUnavailable
	}
	providerKey := "refund:" + input.TenantID + ":" + input.PaymentSessionID + ":" + input.IdempotencyKey
	created, err := scanGovernedRefund(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_refunds
			(tenant_id,payment_session_id,order_id,client_id,amount_minor_units,currency,reason,status,
			 requested_by_operator_id,eligibility_reference,idempotency_key,provider_idempotency_key)
		VALUES($1,$2,$3,$4,$5,$6,$7,'requested',$8,$9,$10,$11)
		RETURNING `+governedRefundCols,
		input.TenantID, input.PaymentSessionID, input.OrderID, input.ClientID, requestedAmount,
		sessionCurrency, input.Reason, input.RequestedByOperatorID, input.EligibilityReference,
		input.IdempotencyKey, providerKey,
	))
	if err != nil {
		return nil, false, err
	}
	if err := appendRefundAuditTx(ctx, tx, created, "refund_requested", input.RequestedByOperatorID, "operator", "", "requested", input.Reason, input.CorrelationID, input.IdempotencyKey, ""); err != nil {
		return nil, false, err
	}
	if err := appendRefundReferenceTx(ctx, tx, input.OrderID, "requested"); err != nil {
		return nil, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, false, err
	}
	return created, false, nil
}

func decideGovernedRefund(ctx context.Context, db *sql.DB, refundID string, input RefundDecisionInput, approve bool) (*GovernedRefund, error) {
	refundID = strings.TrimSpace(refundID)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if refundID == "" || input.OperatorID == "" || input.Reason == "" {
		return nil, fmt.Errorf("refundId, operatorId and reason are required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	current, err := scanGovernedRefund(tx.QueryRowContext(ctx, `SELECT `+governedRefundCols+` FROM wlt_refunds WHERE id=$1 FOR UPDATE`, refundID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if current.Status != "requested" {
		return nil, ErrRefundNotInExpectedState
	}
	if current.RequestedByOperatorID == input.OperatorID {
		return nil, ErrRefundMakerChecker
	}
	toStatus := "rejected"
	eventType := "refund_rejected"
	actorColumn := "rejected_by_operator_id"
	resolvedSQL := ", resolved_at=NOW()"
	if approve {
		toStatus = "approved"
		eventType = "refund_approved"
		actorColumn = "approved_by_operator_id"
		resolvedSQL = ""
	}
	query := `UPDATE wlt_refunds SET status=$2, ` + actorColumn + `=$3, decision_reason=$4,
		version=version+1, updated_at=NOW()` + resolvedSQL + ` WHERE id=$1 AND status='requested' RETURNING ` + governedRefundCols
	updated, err := scanGovernedRefund(tx.QueryRowContext(ctx, query, refundID, toStatus, input.OperatorID, input.Reason))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRefundNotInExpectedState
	}
	if err != nil {
		return nil, err
	}
	if err := appendRefundAuditTx(ctx, tx, updated, eventType, input.OperatorID, "operator", "requested", toStatus, input.Reason, input.CorrelationID, "", ""); err != nil {
		return nil, err
	}
	if err := appendRefundReferenceTx(ctx, tx, updated.OrderID, toStatus); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updated, nil
}

func ApproveGovernedRefund(ctx context.Context, db *sql.DB, refundID string, input RefundDecisionInput) (*GovernedRefund, error) {
	return decideGovernedRefund(ctx, db, refundID, input, true)
}

func RejectGovernedRefund(ctx context.Context, db *sql.DB, refundID string, input RefundDecisionInput) (*GovernedRefund, error) {
	return decideGovernedRefund(ctx, db, refundID, input, false)
}

func claimGovernedRefundExecution(ctx context.Context, db *sql.DB, refundID, operatorID, correlationID string) (*GovernedRefund, error) {
	operatorID = strings.TrimSpace(operatorID)
	if strings.TrimSpace(refundID) == "" || operatorID == "" {
		return nil, fmt.Errorf("refundId and operatorId are required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	claimed, err := scanGovernedRefund(tx.QueryRowContext(ctx, `
		UPDATE wlt_refunds SET status='processing', provider_status='processing', provider_error=NULL,
			provider_attempted_at=NOW(), version=version+1, updated_at=NOW()
		WHERE id=$1 AND status='approved'
		RETURNING `+governedRefundCols, refundID))
	if errors.Is(err, sql.ErrNoRows) {
		existing, getErr := GetGovernedRefund(db, refundID)
		if getErr != nil || existing == nil {
			return existing, getErr
		}
		return nil, ErrRefundNotInExpectedState
	}
	if err != nil {
		return nil, err
	}
	if err := appendRefundAuditTx(ctx, tx, claimed, "refund_provider_claimed", operatorID, "operator", "approved", "processing", "", correlationID, claimed.ProviderIdempotencyKey, ""); err != nil {
		return nil, err
	}
	if err := appendRefundReferenceTx(ctx, tx, claimed.OrderID, "processing"); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return claimed, nil
}

func isDefinitiveProviderFailure(err error) bool {
	var providerErr provider.Error
	return errors.As(err, &providerErr)
}

func markGovernedRefundProviderFailure(ctx context.Context, db *sql.DB, refund *GovernedRefund, cause error, correlationID string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	updated, err := scanGovernedRefund(tx.QueryRowContext(ctx, `
		UPDATE wlt_refunds SET status='rejected', provider_status='failed', provider_error=$2,
			resolved_at=NOW(), version=version+1, updated_at=NOW()
		WHERE id=$1 AND status='processing' RETURNING `+governedRefundCols, refund.ID, cause.Error()))
	if err != nil {
		return err
	}
	if err := appendRefundAuditTx(ctx, tx, updated, "refund_provider_failed", "provider", "provider", "processing", "rejected", cause.Error(), correlationID, updated.ProviderIdempotencyKey, ""); err != nil {
		return err
	}
	if err := appendRefundReferenceTx(ctx, tx, updated.OrderID, "rejected"); err != nil {
		return err
	}
	return tx.Commit()
}

func markGovernedRefundProviderUnknown(ctx context.Context, db *sql.DB, refund *GovernedRefund, cause error, correlationID string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var caseID string
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_reconciliation_cases(payment_session_id,operation,trigger_reason)
		VALUES($1,'refund',$2) RETURNING id`, refund.PaymentSessionID, cause.Error()).Scan(&caseID); err != nil {
		return err
	}
	updated, err := scanGovernedRefund(tx.QueryRowContext(ctx, `
		UPDATE wlt_refunds SET status='provider_unknown', provider_status='unknown', provider_error=$2,
			reconciliation_case_id=$3, version=version+1, updated_at=NOW()
		WHERE id=$1 AND status='processing' RETURNING `+governedRefundCols, refund.ID, cause.Error(), caseID))
	if err != nil {
		return err
	}
	if err := appendRefundAuditTx(ctx, tx, updated, "refund_provider_unknown", "provider", "provider", "processing", "provider_unknown", cause.Error(), correlationID, updated.ProviderIdempotencyKey, ""); err != nil {
		return err
	}
	if err := appendRefundReferenceTx(ctx, tx, updated.OrderID, "provider_unknown"); err != nil {
		return err
	}
	return tx.Commit()
}

func completedReferenceStatusTx(ctx context.Context, tx *sql.Tx, refund *GovernedRefund) (string, string, error) {
	var captured, completed int64
	if err := tx.QueryRowContext(ctx, `SELECT amount_minor_units FROM wlt_payment_sessions WHERE id=$1`, refund.PaymentSessionID).Scan(&captured); err != nil {
		return "", "", err
	}
	if err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_refunds
		WHERE tenant_id=$1 AND payment_session_id=$2 AND status='completed'`, refund.TenantID, refund.PaymentSessionID).Scan(&completed); err != nil {
		return "", "", err
	}
	if completed >= captured {
		return "completed", "refunded", nil
	}
	return "partially_refunded", "partially_refunded", nil
}

func finalizeGovernedRefundSuccess(ctx context.Context, db *sql.DB, refundID, actorID, actorType, providerReference, evidenceReason, correlationID string, allowedFrom []string) (*GovernedRefund, error) {
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, fmt.Errorf("providerReference is required")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	current, err := scanGovernedRefund(tx.QueryRowContext(ctx, `SELECT `+governedRefundCols+` FROM wlt_refunds WHERE id=$1 FOR UPDATE`, refundID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	allowed := false
	for _, state := range allowedFrom {
		if current.Status == state {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, ErrRefundNotInExpectedState
	}
	fromStatus := current.Status
	updated, err := scanGovernedRefund(tx.QueryRowContext(ctx, `
		UPDATE wlt_refunds SET status='completed', provider_status='refunded', provider_reference=$2,
			provider_error=NULL, resolved_at=NOW(), version=version+1, updated_at=NOW()
		WHERE id=$1 AND status=$3 RETURNING `+governedRefundCols, refundID, providerReference, fromStatus))
	if err != nil {
		return nil, err
	}
	lines := []ledger.LedgerLine{
		{AccountType: "platform_payable", DebitCredit: "debit", AmountMinorUnits: updated.AmountMinorUnits, Currency: updated.Currency},
		{AccountType: "provider_clearing", DebitCredit: "credit", AmountMinorUnits: updated.AmountMinorUnits, Currency: updated.Currency},
	}
	if _, err := ledger.PostLedgerTransaction(ctx, tx, "refund_completed", "refund", updated.ID, lines, ledger.Actor{ID: actorID, Type: actorType}); err != nil {
		return nil, fmt.Errorf("post refund journal: %w", err)
	}
	refundRefStatus, paymentRefStatus, err := completedReferenceStatusTx(ctx, tx, updated)
	if err != nil {
		return nil, err
	}
	if err := appendRefundReferenceTx(ctx, tx, updated.OrderID, refundRefStatus); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_payment_status_refs(order_id,status) VALUES($1,$2)`, updated.OrderID, paymentRefStatus); err != nil {
		return nil, err
	}
	var checkoutIntentID, specialRequestID sql.NullString
	if err := tx.QueryRowContext(ctx, `SELECT checkout_intent_id,special_request_id FROM wlt_payment_sessions WHERE id=$1`, updated.PaymentSessionID).Scan(&checkoutIntentID, &specialRequestID); err != nil {
		return nil, err
	}
	var checkoutPtr, specialPtr *string
	if checkoutIntentID.Valid {
		checkoutPtr = &checkoutIntentID.String
	}
	if specialRequestID.Valid {
		specialPtr = &specialRequestID.String
	}
	if err := dshoutbox.EnqueueRefund(tx, updated.ID, updated.PaymentSessionID, updated.TenantID, updated.OrderID, updated.Reason, correlationID, checkoutPtr, specialPtr); err != nil {
		return nil, err
	}
	if updated.ReconciliationCaseID != "" {
		if _, err := tx.ExecContext(ctx, `
			UPDATE wlt_reconciliation_cases SET status='resolved', resolution='confirmed_success',
				resolved_at=NOW(), updated_at=NOW() WHERE id=$1 AND status='open'`, updated.ReconciliationCaseID); err != nil {
			return nil, err
		}
	}
	if err := appendRefundAuditTx(ctx, tx, updated, "refund_completed", actorID, actorType, fromStatus, "completed", evidenceReason, correlationID, updated.ProviderIdempotencyKey, providerReference); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updated, nil
}

func CompleteGovernedRefundWithProvider(ctx context.Context, db *sql.DB, client financialProvider, refundID, operatorID, correlationID string) (*GovernedRefund, error) {
	claimed, err := claimGovernedRefundExecution(ctx, db, refundID, operatorID, correlationID)
	if err != nil || claimed == nil {
		return claimed, err
	}
	meta := provider.RequestMeta{CorrelationID: correlationID, IdempotencyKey: claimed.ProviderIdempotencyKey}
	if meta.CorrelationID == "" {
		meta.CorrelationID = "refund-" + claimed.ID
	}
	result, err := client.Post(ctx, "/financial/card/refund", map[string]any{
		"refundId": claimed.ID, "paymentSessionId": claimed.PaymentSessionID,
		"orderId": claimed.OrderID, "clientId": claimed.ClientID,
		"amountMinorUnits": claimed.AmountMinorUnits, "currency": claimed.Currency,
		"reason": claimed.Reason,
	}, meta)
	if err != nil {
		if isDefinitiveProviderFailure(err) {
			_ = markGovernedRefundProviderFailure(ctx, db, claimed, err, meta.CorrelationID)
			return nil, err
		}
		_ = markGovernedRefundProviderUnknown(ctx, db, claimed, err, meta.CorrelationID)
		return nil, ErrRefundProviderUnknown
	}
	if result.Status != "refunded" || strings.TrimSpace(result.ProviderReference) == "" {
		cause := fmt.Errorf("provider refund returned an unrecognized result")
		_ = markGovernedRefundProviderUnknown(ctx, db, claimed, cause, meta.CorrelationID)
		return nil, ErrRefundProviderUnknown
	}
	return finalizeGovernedRefundSuccess(ctx, db, claimed.ID, "wlt", "service", result.ProviderReference, "provider confirmed refunded", meta.CorrelationID, []string{"processing"})
}

func ReconcileGovernedRefund(ctx context.Context, db *sql.DB, refundID string, input RefundReconciliationInput) (*GovernedRefund, error) {
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	input.ResolutionAction = strings.TrimSpace(input.ResolutionAction)
	input.EvidenceNote = strings.TrimSpace(input.EvidenceNote)
	input.ProviderReference = strings.TrimSpace(input.ProviderReference)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.OperatorID == "" || input.EvidenceNote == "" {
		return nil, ErrRefundReconcileEvidence
	}
	switch input.ResolutionAction {
	case "confirmed_success":
		return finalizeGovernedRefundSuccess(ctx, db, refundID, input.OperatorID, "reconciler", input.ProviderReference, input.EvidenceNote, input.CorrelationID, []string{"provider_unknown"})
	case "confirmed_failed":
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return nil, err
		}
		defer tx.Rollback()
		updated, err := scanGovernedRefund(tx.QueryRowContext(ctx, `
			UPDATE wlt_refunds SET status='rejected', provider_status='failed', provider_error=$2,
				rejected_by_operator_id=$3, decision_reason=$2, resolved_at=NOW(), version=version+1, updated_at=NOW()
			WHERE id=$1 AND status='provider_unknown' RETURNING `+governedRefundCols,
			refundID, input.EvidenceNote, input.OperatorID))
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRefundNotInExpectedState
		}
		if err != nil {
			return nil, err
		}
		if updated.ReconciliationCaseID != "" {
			if _, err := tx.ExecContext(ctx, `UPDATE wlt_reconciliation_cases SET status='resolved',resolution='confirmed_failed',resolved_at=NOW(),updated_at=NOW() WHERE id=$1 AND status='open'`, updated.ReconciliationCaseID); err != nil {
				return nil, err
			}
		}
		if err := appendRefundReferenceTx(ctx, tx, updated.OrderID, "rejected"); err != nil {
			return nil, err
		}
		if err := appendRefundAuditTx(ctx, tx, updated, "refund_reconciled_failed", input.OperatorID, "reconciler", "provider_unknown", "rejected", input.EvidenceNote, input.CorrelationID, updated.ProviderIdempotencyKey, input.ProviderReference); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return updated, nil
	default:
		return nil, fmt.Errorf("resolutionAction must be confirmed_success or confirmed_failed")
	}
}

func ListGovernedRefundAudit(db *sql.DB, refundID string) ([]RefundAuditEvent, error) {
	rows, err := db.Query(`
		SELECT id::text,refund_id,tenant_id,event_type,actor_id,actor_type,
			COALESCE(from_status,''),to_status,COALESCE(reason,''),COALESCE(correlation_id,''),
			COALESCE(idempotency_key,''),COALESCE(provider_reference,''),created_at
		FROM wlt_refund_audit_events WHERE refund_id=$1 ORDER BY created_at`, refundID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]RefundAuditEvent, 0)
	for rows.Next() {
		var item RefundAuditEvent
		if err := rows.Scan(&item.ID, &item.RefundID, &item.TenantID, &item.EventType, &item.ActorID, &item.ActorType, &item.FromStatus, &item.ToStatus, &item.Reason, &item.CorrelationID, &item.IdempotencyKey, &item.ProviderReference, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func decodeGovernedJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

func sendGovernedRefundError(w http.ResponseWriter, err error) bool {
	switch {
	case errors.Is(err, ErrRefundReferenceConflict):
		shared.SendError(w, http.StatusConflict, "REFUND_REFERENCE_CONFLICT", err.Error())
	case errors.Is(err, ErrSessionNotRefundable):
		shared.SendError(w, http.StatusConflict, "PAYMENT_SESSION_NOT_REFUNDABLE", err.Error())
	case errors.Is(err, ErrRefundAmountUnavailable):
		shared.SendError(w, http.StatusConflict, "REFUND_AMOUNT_UNAVAILABLE", err.Error())
	case errors.Is(err, ErrRefundIdempotencyConflict):
		shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
	case errors.Is(err, ErrRefundMakerChecker):
		shared.SendError(w, http.StatusForbidden, "MAKER_CHECKER_VIOLATION", err.Error())
	case errors.Is(err, ErrRefundNotInExpectedState):
		shared.SendError(w, http.StatusConflict, "INVALID_STATE", err.Error())
	case errors.Is(err, ErrRefundProviderUnknown):
		shared.SendError(w, http.StatusAccepted, "PROVIDER_RESULT_UNKNOWN", err.Error())
	case errors.Is(err, ErrRefundReconcileEvidence):
		shared.SendError(w, http.StatusBadRequest, "RECONCILIATION_EVIDENCE_REQUIRED", err.Error())
	default:
		return false
	}
	return true
}

func HandleCreateGovernedRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input GovernedCreateRefundInput
		if !decodeGovernedJSON(w, r, &input) {
			return
		}
		input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		trustedTenant := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		if trustedTenant != "" {
			if input.TenantID != "" && strings.TrimSpace(input.TenantID) != trustedTenant {
				shared.SendError(w, http.StatusForbidden, "TENANT_MISMATCH", "refund tenant does not match trusted DSH tenant")
				return
			}
			input.TenantID = trustedTenant
		}
		created, replayed, err := CreateGovernedRefund(r.Context(), db, input)
		if err != nil {
			if !sendGovernedRefundError(w, err) {
				shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			}
			return
		}
		status := http.StatusCreated
		if replayed {
			status = http.StatusOK
		}
		shared.SendJSON(w, status, map[string]any{"refund": created, "replayed": replayed})
	}
}

func HandleGetGovernedRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		item, err := GetGovernedRefund(db, r.PathValue("refundId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if item == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": item})
	}
}

func HandleListGovernedRefunds(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		items, err := ListGovernedRefunds(db, r.URL.Query().Get("orderId"), r.URL.Query().Get("clientId"), r.URL.Query().Get("tenantId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refunds": items})
	}
}

func HandleApproveGovernedRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input RefundDecisionInput
		if !decodeGovernedJSON(w, r, &input) {
			return
		}
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		item, err := ApproveGovernedRefund(r.Context(), db, r.PathValue("refundId"), input)
		if err != nil {
			if !sendGovernedRefundError(w, err) { shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error()) }
			return
		}
		if item == nil { shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found"); return }
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": item})
	}
}

func HandleRejectGovernedRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input RefundDecisionInput
		if !decodeGovernedJSON(w, r, &input) { return }
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		item, err := RejectGovernedRefund(r.Context(), db, r.PathValue("refundId"), input)
		if err != nil {
			if !sendGovernedRefundError(w, err) { shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error()) }
			return
		}
		if item == nil { shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found"); return }
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": item})
	}
}

func HandleCompleteGovernedRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct { OperatorID string `json:"operatorId"` }
		if !decodeGovernedJSON(w, r, &input) { return }
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil { shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error()); return }
		item, err := CompleteGovernedRefundWithProvider(r.Context(), db, client, r.PathValue("refundId"), input.OperatorID, r.Header.Get("X-Correlation-ID"))
		if err != nil {
			if !sendGovernedRefundError(w, err) { shared.SendProviderError(w, err) }
			return
		}
		if item == nil { shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found"); return }
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": item})
	}
}

func HandleReconcileGovernedRefund(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input RefundReconciliationInput
		if !decodeGovernedJSON(w, r, &input) { return }
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		item, err := ReconcileGovernedRefund(r.Context(), db, r.PathValue("refundId"), input)
		if err != nil {
			if !sendGovernedRefundError(w, err) { shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error()) }
			return
		}
		if item == nil { shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found"); return }
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": item})
	}
}

func HandleListGovernedRefundAudit(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		items, err := ListGovernedRefundAudit(db, r.PathValue("refundId"))
		if err != nil { shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error()); return }
		shared.SendJSON(w, http.StatusOK, map[string]any{"auditEvents": items})
	}
}
