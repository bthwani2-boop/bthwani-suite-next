package collateral

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

var (
	ErrPolicyNotConfigured        = errors.New("captain collateral policy is not configured")
	ErrPolicyDisabled             = errors.New("captain collateral policy is disabled")
	ErrInvalidInput               = errors.New("captain collateral input is invalid")
	ErrSourceNotCaptured          = errors.New("source payment is not a captured captain topup")
	ErrSourceAlreadyAllocated     = errors.New("source payment already has a collateral position")
	ErrCollateralFundsUnavailable = errors.New("captain wallet does not have enough spendable funds for collateral")
	ErrPositionNotFound           = errors.New("captain collateral position not found")
	ErrReleaseBlocked             = errors.New("captain collateral release is blocked by open financial exposure")
	ErrVersionConflict            = errors.New("captain collateral policy version conflict")
	ErrIdempotencyConflict        = errors.New("captain collateral idempotency key conflict")
)

type Policy struct {
	OperatorContextID           string    `json:"operatorContextId"`
	PolicyID                    string    `json:"policyId"`
	PolicyVersion               int64     `json:"policyVersion"`
	Enabled                     bool      `json:"enabled"`
	MinimumCollateralMinorUnits int64     `json:"minimumCollateralMinorUnits"`
	Currency                    string    `json:"currency"`
	ChangeReason                string    `json:"changeReason"`
	UpdatedByActorID            string    `json:"updatedByActorId"`
	UpdatedAt                   time.Time `json:"updatedAt"`
}

type Position struct {
	ID                         string     `json:"id"`
	CaptainID                  string     `json:"captainId"`
	Currency                   string     `json:"currency"`
	PolicyID                   string     `json:"policyId"`
	PolicyVersion              int64      `json:"policyVersion"`
	ProtectedMinimumMinorUnits int64      `json:"protectedMinimumMinorUnits"`
	RestrictedAmountMinorUnits int64      `json:"restrictedAmountMinorUnits"`
	SourcePaymentSessionID     string     `json:"sourcePaymentSessionId"`
	SourceLedgerTransactionID  string     `json:"sourceLedgerTransactionId"`
	Status                     string     `json:"status"`
	ReleaseReason              *string    `json:"releaseReason,omitempty"`
	CreatedAt                  time.Time  `json:"createdAt"`
	ReleasedAt                 *time.Time `json:"releasedAt,omitempty"`
}

type WalletSummary struct {
	CollateralReservedMinorUnits int64 `json:"collateralReservedMinorUnits"`
	AvailableMinorUnits          int64 `json:"availableMinorUnits"`
	PendingMinorUnits            int64 `json:"pendingMinorUnits"`
	HeldMinorUnits               int64 `json:"heldMinorUnits"`
	CodReservedMinorUnits        int64 `json:"codReservedMinorUnits"`
	OutstandingDebtMinorUnits    int64 `json:"outstandingDebtMinorUnits"`
	ReleasableExcessMinorUnits   int64 `json:"releasableExcessMinorUnits"`
}

type ReadResponse struct {
	Policy               *Policy       `json:"policy"`
	Wallet               WalletSummary `json:"wallet"`
	Positions            []Position    `json:"positions"`
	ReleaseBlockedReason string        `json:"releaseBlockedReason,omitempty"`
}

type upsertPolicyInput struct {
	PolicyID                    string `json:"policyId"`
	ExpectedVersion             int64  `json:"expectedVersion"`
	Enabled                     bool   `json:"enabled"`
	MinimumCollateralMinorUnits int64  `json:"minimumCollateralMinorUnits"`
	Currency                    string `json:"currency"`
	ChangeReason                string `json:"changeReason"`
	UpdatedByActorID            string `json:"updatedByActorId"`
}
type allocateInput struct {
	CaptainID          string `json:"captainId"`
	PaymentSessionID   string `json:"paymentSessionId"`
	AllocatedByActorID string `json:"allocatedByActorId"`
}
type releaseInput struct {
	CaptainID         string `json:"captainId"`
	PositionID        string `json:"positionId"`
	ReleaseReason     string `json:"releaseReason"`
	ReleasedByActorID string `json:"releasedByActorId"`
}

const positionColumns = `id, captain_id, currency, policy_id, policy_version,
	protected_minimum_minor_units, restricted_amount_minor_units,
	source_payment_session_id, source_ledger_transaction_id, status,
	release_reason, created_at, released_at`

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return ErrInvalidInput
	}
	return nil
}
func normalizePolicyInput(input upsertPolicyInput) (upsertPolicyInput, error) {
	input.PolicyID = strings.TrimSpace(input.PolicyID)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.ChangeReason = strings.TrimSpace(input.ChangeReason)
	input.UpdatedByActorID = strings.TrimSpace(input.UpdatedByActorID)
	if input.PolicyID == "" || input.ExpectedVersion < 0 || input.MinimumCollateralMinorUnits < 0 || len(input.Currency) != 3 || input.ChangeReason == "" || input.UpdatedByActorID == "" {
		return input, ErrInvalidInput
	}
	return input, nil
}
func normalizeAllocationInput(input allocateInput) (allocateInput, error) {
	input.CaptainID = strings.TrimSpace(input.CaptainID)
	input.PaymentSessionID = strings.TrimSpace(input.PaymentSessionID)
	input.AllocatedByActorID = strings.TrimSpace(input.AllocatedByActorID)
	if input.CaptainID == "" || input.PaymentSessionID == "" || input.AllocatedByActorID == "" {
		return input, ErrInvalidInput
	}
	return input, nil
}
func normalizeReleaseInput(input releaseInput) (releaseInput, error) {
	input.CaptainID = strings.TrimSpace(input.CaptainID)
	input.PositionID = strings.TrimSpace(input.PositionID)
	input.ReleaseReason = strings.TrimSpace(input.ReleaseReason)
	input.ReleasedByActorID = strings.TrimSpace(input.ReleasedByActorID)
	if input.CaptainID == "" || input.PositionID == "" || input.ReleaseReason == "" || input.ReleasedByActorID == "" {
		return input, ErrInvalidInput
	}
	return input, nil
}
func scanPolicy(row interface{ Scan(...any) error }) (*Policy, error) {
	var p Policy
	err := row.Scan(&p.OperatorContextID, &p.PolicyID, &p.PolicyVersion, &p.Enabled, &p.MinimumCollateralMinorUnits, &p.Currency, &p.ChangeReason, &p.UpdatedByActorID, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &p, err
}
func scanPosition(row interface{ Scan(...any) error }) (*Position, error) {
	var p Position
	var reason sql.NullString
	var released sql.NullTime
	err := row.Scan(&p.ID, &p.CaptainID, &p.Currency, &p.PolicyID, &p.PolicyVersion, &p.ProtectedMinimumMinorUnits, &p.RestrictedAmountMinorUnits, &p.SourcePaymentSessionID, &p.SourceLedgerTransactionID, &p.Status, &reason, &p.CreatedAt, &released)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if reason.Valid {
		p.ReleaseReason = &reason.String
	}
	if released.Valid {
		p.ReleasedAt = &released.Time
	}
	return &p, nil
}
func policyTx(ctx context.Context, tx *sql.Tx, contextID string, lock bool) (*Policy, error) {
	suffix := ""
	if lock {
		suffix = " FOR UPDATE"
	}
	return scanPolicy(tx.QueryRowContext(ctx, `SELECT operator_context_id,policy_id,policy_version,enabled,minimum_collateral_minor_units,currency,change_reason,updated_by_actor_id,updated_at FROM wlt_captain_collateral_policies WHERE operator_context_id=$1`+suffix, contextID))
}

func UpsertPolicy(ctx context.Context, db *sql.DB, input upsertPolicyInput) (*Policy, error) {
	contextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	input, err = normalizePolicyInput(input)
	if err != nil {
		return nil, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "captain-collateral-policy:"+contextID); err != nil {
		return nil, err
	}
	current, err := policyTx(ctx, tx, contextID, true)
	if err != nil {
		return nil, err
	}
	var result *Policy
	if current == nil {
		if input.ExpectedVersion != 0 {
			return nil, ErrVersionConflict
		}
		result, err = scanPolicy(tx.QueryRowContext(ctx, `INSERT INTO wlt_captain_collateral_policies(operator_context_id,policy_id,policy_version,enabled,minimum_collateral_minor_units,currency,change_reason,updated_by_actor_id) VALUES($1,$2,1,$3,$4,$5,$6,$7) RETURNING operator_context_id,policy_id,policy_version,enabled,minimum_collateral_minor_units,currency,change_reason,updated_by_actor_id,updated_at`, contextID, input.PolicyID, input.Enabled, input.MinimumCollateralMinorUnits, input.Currency, input.ChangeReason, input.UpdatedByActorID))
	} else {
		if current.PolicyVersion != input.ExpectedVersion {
			return nil, ErrVersionConflict
		}
		result, err = scanPolicy(tx.QueryRowContext(ctx, `UPDATE wlt_captain_collateral_policies SET policy_id=$2,policy_version=policy_version+1,enabled=$3,minimum_collateral_minor_units=$4,currency=$5,change_reason=$6,updated_by_actor_id=$7,updated_at=NOW() WHERE operator_context_id=$1 RETURNING operator_context_id,policy_id,policy_version,enabled,minimum_collateral_minor_units,currency,change_reason,updated_by_actor_id,updated_at`, contextID, input.PolicyID, input.Enabled, input.MinimumCollateralMinorUnits, input.Currency, input.ChangeReason, input.UpdatedByActorID))
	}
	if err != nil {
		return nil, fmt.Errorf("write captain collateral policy: %w", err)
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return result, nil
}

func sourceMatchesTopUp(ctx context.Context, tx *sql.Tx, contextID, captainID, sessionID string) (int64, string, string, error) {
	var purpose, actorType, status, currency, ledgerID string
	var amount int64
	err := tx.QueryRowContext(ctx, `SELECT financial_purpose,COALESCE(topup_actor_type,''),status,amount_minor_units,currency,COALESCE(capture_ledger_transaction_id,'') FROM wlt_payment_sessions WHERE operator_context_id=$1 AND id=$2 AND client_id=$3 FOR SHARE`, contextID, sessionID, captainID).Scan(&purpose, &actorType, &status, &amount, &currency, &ledgerID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ``, ``, ErrSourceNotCaptured
	}
	if err != nil {
		return 0, ``, ``, err
	}
	if purpose != `captain_topup` || actorType != `captain` || status != `captured` || amount <= 0 || currency == `` || ledgerID == `` {
		return 0, ``, ``, ErrSourceNotCaptured
	}
	var valid bool
	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FILTER(WHERE a.account_type='wallet' AND a.actor_type='captain' AND a.actor_id=$3 AND l.debit_credit='credit' AND l.amount_minor_units=$4 AND l.currency=$5)=1 AND COUNT(*) FILTER(WHERE a.account_type='provider_clearing' AND l.debit_credit='debit' AND l.amount_minor_units=$4 AND l.currency=$5)=1 FROM wlt_ledger_lines l JOIN wlt_ledger_accounts a ON a.id=l.account_id AND a.operator_context_id=l.operator_context_id JOIN wlt_ledger_transactions t ON t.id=l.ledger_transaction_id AND t.operator_context_id=l.operator_context_id WHERE l.operator_context_id=$1 AND l.ledger_transaction_id=$2 AND t.transaction_type='cash_in_topup' AND t.reference_type='payment_session' AND t.reference_id=$6`, contextID, ledgerID, captainID, amount, currency, sessionID).Scan(&valid)
	if err != nil {
		return 0, ``, ``, fmt.Errorf("verify captain topup ledger source: %w", err)
	}
	if !valid {
		return 0, ``, ``, ErrSourceNotCaptured
	}
	return amount, strings.ToUpper(currency), ledgerID, nil
}
func positionTx(ctx context.Context, tx *sql.Tx, contextID, positionID string, lock bool) (*Position, error) {
	suffix := ""
	if lock {
		suffix = " FOR UPDATE"
	}
	return scanPosition(tx.QueryRowContext(ctx, `SELECT `+positionColumns+` FROM wlt_captain_collateral_positions WHERE operator_context_id=$1 AND id=$2`+suffix, contextID, positionID))
}

func Allocate(ctx context.Context, db *sql.DB, idempotencyKey string, input allocateInput) (*Position, error) {
	contextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	input, err = normalizeAllocationInput(input)
	if err != nil {
		return nil, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == `` {
		return nil, ErrInvalidInput
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var op, pid, eventCaptain string
	err = tx.QueryRowContext(ctx, `SELECT operation,position_id,captain_id FROM wlt_captain_collateral_events WHERE operator_context_id=$1 AND idempotency_key=$2 FOR SHARE`, contextID, idempotencyKey).Scan(&op, &pid, &eventCaptain)
	if err == nil {
		if op != `allocate` || eventCaptain != input.CaptainID {
			return nil, ErrIdempotencyConflict
		}
		p, e := positionTx(ctx, tx, contextID, pid, false)
		if e != nil || p == nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return p, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	policy, err := policyTx(ctx, tx, contextID, true)
	if err != nil {
		return nil, err
	}
	if policy == nil {
		return nil, ErrPolicyNotConfigured
	}
	if !policy.Enabled {
		return nil, ErrPolicyDisabled
	}
	amount, currency, ledgerID, err := sourceMatchesTopUp(ctx, tx, contextID, input.CaptainID, input.PaymentSessionID)
	if err != nil {
		return nil, err
	}
	var existing string
	err = tx.QueryRowContext(ctx, `SELECT id FROM wlt_captain_collateral_positions WHERE operator_context_id=$1 AND source_payment_session_id=$2 FOR SHARE`, contextID, input.PaymentSessionID).Scan(&existing)
	if err == nil {
		return nil, ErrSourceAlreadyAllocated
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	var walletID, walletCurrency string
	var available int64
	err = tx.QueryRowContext(ctx, `SELECT id,currency,available_balance_minor_units FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2 FOR UPDATE`, contextID, input.CaptainID).Scan(&walletID, &walletCurrency, &available)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCollateralFundsUnavailable
	}
	if err != nil {
		return nil, err
	}
	if walletCurrency != currency || policy.Currency != currency || available < amount {
		return nil, ErrCollateralFundsUnavailable
	}
	if _, err = tx.ExecContext(ctx, `UPDATE wlt_wallets SET collateral_reserved_balance_minor_units=collateral_reserved_balance_minor_units+$2,updated_at=NOW() WHERE id=$1`, walletID, amount); err != nil {
		return nil, err
	}
	p, err := scanPosition(tx.QueryRowContext(ctx, `INSERT INTO wlt_captain_collateral_positions(operator_context_id,captain_id,currency,policy_id,policy_version,protected_minimum_minor_units,restricted_amount_minor_units,source_payment_session_id,source_ledger_transaction_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING `+positionColumns, contextID, input.CaptainID, currency, policy.PolicyID, policy.PolicyVersion, policy.MinimumCollateralMinorUnits, amount, input.PaymentSessionID, ledgerID))
	if err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO wlt_captain_collateral_events(operator_context_id,captain_id,position_id,operation,idempotency_key,amount_minor_units,currency,actor_id,reason) VALUES($1,$2,$3,'allocate',$4,$5,$6,$7,$8)`, contextID, input.CaptainID, p.ID, idempotencyKey, amount, currency, input.AllocatedByActorID, `captured captain topup allocated as protected collateral`); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return p, nil
}

func releaseBlock(ctx context.Context, tx *sql.Tx, contextID, captainID string) (string, error) {
	var pending, held, cod int64
	if err := tx.QueryRowContext(ctx, `SELECT pending_balance_minor_units,held_balance_minor_units,COALESCE(cod_reserved_balance_minor_units,0) FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`, contextID, captainID).Scan(&pending, &held, &cod); err != nil {
		return ``, err
	}
	if pending > 0 {
		return `WLT_COLLATERAL_RELEASE_PENDING_FUNDS`, nil
	}
	if held > 0 {
		return `WLT_COLLATERAL_RELEASE_HELD_FUNDS`, nil
	}
	if cod > 0 {
		return `WLT_COLLATERAL_RELEASE_COD_RESERVATION_OPEN`, nil
	}
	var debt int64
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(SUM(outstanding_amount_minor_units),0) FROM wlt_provider_debts WHERE operator_context_id=$1 AND provider_actor_type='captain' AND provider_actor_id=$2 AND status IN ('open','partially_settled')`, contextID, captainID).Scan(&debt); err != nil {
		return ``, err
	}
	if debt > 0 {
		return `WLT_COLLATERAL_RELEASE_PROVIDER_DEBT_OPEN`, nil
	}
	return ``, nil
}
func Release(ctx context.Context, db *sql.DB, idempotencyKey string, input releaseInput) (*Position, error) {
	contextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	input, err = normalizeReleaseInput(input)
	if err != nil {
		return nil, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == `` {
		return nil, ErrInvalidInput
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var op, pid, eventCaptain string
	err = tx.QueryRowContext(ctx, `SELECT operation,position_id,captain_id FROM wlt_captain_collateral_events WHERE operator_context_id=$1 AND idempotency_key=$2 FOR SHARE`, contextID, idempotencyKey).Scan(&op, &pid, &eventCaptain)
	if err == nil {
		if op != `release` || pid != input.PositionID || eventCaptain != input.CaptainID {
			return nil, ErrIdempotencyConflict
		}
		p, e := positionTx(ctx, tx, contextID, pid, false)
		if e != nil || p == nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return p, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	policy, err := policyTx(ctx, tx, contextID, true)
	if err != nil {
		return nil, err
	}
	if policy == nil {
		return nil, ErrPolicyNotConfigured
	}
	if !policy.Enabled {
		return nil, ErrPolicyDisabled
	}
	p, err := positionTx(ctx, tx, contextID, input.PositionID, true)
	if err != nil {
		return nil, err
	}
	if p == nil || p.CaptainID != input.CaptainID || p.Status != `active` {
		return nil, ErrPositionNotFound
	}
	if reason, e := releaseBlock(ctx, tx, contextID, input.CaptainID); e != nil {
		return nil, e
	} else if reason != `` {
		return nil, fmt.Errorf("%w: %s", ErrReleaseBlocked, reason)
	}
	var walletID string
	var reserved int64
	if err = tx.QueryRowContext(ctx, `SELECT id,collateral_reserved_balance_minor_units FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2 FOR UPDATE`, contextID, input.CaptainID).Scan(&walletID, &reserved); err != nil {
		return nil, err
	}
	if reserved < p.RestrictedAmountMinorUnits || reserved-p.RestrictedAmountMinorUnits < policy.MinimumCollateralMinorUnits {
		return nil, fmt.Errorf("%w: protected minimum would be breached", ErrReleaseBlocked)
	}
	if _, err = tx.ExecContext(ctx, `UPDATE wlt_wallets SET collateral_reserved_balance_minor_units=collateral_reserved_balance_minor_units-$2,updated_at=NOW() WHERE id=$1`, walletID, p.RestrictedAmountMinorUnits); err != nil {
		return nil, err
	}
	p, err = scanPosition(tx.QueryRowContext(ctx, `UPDATE wlt_captain_collateral_positions SET status='released',release_reason=$3,released_at=NOW() WHERE operator_context_id=$1 AND id=$2 AND status='active' RETURNING `+positionColumns, contextID, input.PositionID, input.ReleaseReason))
	if err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO wlt_captain_collateral_events(operator_context_id,captain_id,position_id,operation,idempotency_key,amount_minor_units,currency,actor_id,reason) VALUES($1,$2,$3,'release',$4,$5,$6,$7,$8)`, contextID, input.CaptainID, p.ID, idempotencyKey, p.RestrictedAmountMinorUnits, p.Currency, input.ReleasedByActorID, input.ReleaseReason); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return p, nil
}

func Read(ctx context.Context, db *sql.DB, captainID string) (*ReadResponse, error) {
	contextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	captainID = strings.TrimSpace(captainID)
	if captainID == `` || len(captainID) > 200 {
		return nil, ErrInvalidInput
	}
	policy, err := scanPolicy(db.QueryRowContext(ctx, `SELECT operator_context_id,policy_id,policy_version,enabled,minimum_collateral_minor_units,currency,change_reason,updated_by_actor_id,updated_at FROM wlt_captain_collateral_policies WHERE operator_context_id=$1`, contextID))
	if err != nil {
		return nil, err
	}
	var wallet WalletSummary
	err = db.QueryRowContext(ctx, `SELECT collateral_reserved_balance_minor_units,available_balance_minor_units,pending_balance_minor_units,held_balance_minor_units,COALESCE(cod_reserved_balance_minor_units,0),COALESCE((SELECT SUM(outstanding_amount_minor_units) FROM wlt_provider_debts d WHERE d.operator_context_id=w.operator_context_id AND d.provider_actor_type='captain' AND d.provider_actor_id=w.actor_id AND d.currency=w.currency AND d.status IN ('open','partially_settled')),0),CASE WHEN pending_balance_minor_units=0 AND held_balance_minor_units=0 AND COALESCE(cod_reserved_balance_minor_units,0)=0 AND NOT EXISTS(SELECT 1 FROM wlt_provider_debts d WHERE d.operator_context_id=w.operator_context_id AND d.provider_actor_type='captain' AND d.provider_actor_id=w.actor_id AND d.currency=w.currency AND d.status IN ('open','partially_settled')) THEN GREATEST(collateral_reserved_balance_minor_units-COALESCE((SELECT minimum_collateral_minor_units FROM wlt_captain_collateral_policies cp WHERE cp.operator_context_id=w.operator_context_id AND cp.enabled),0),0) ELSE 0 END FROM wlt_wallets w WHERE w.operator_context_id=$1 AND w.actor_type='captain' AND w.actor_id=$2`, contextID, captainID).Scan(&wallet.CollateralReservedMinorUnits, &wallet.AvailableMinorUnits, &wallet.PendingMinorUnits, &wallet.HeldMinorUnits, &wallet.CodReservedMinorUnits, &wallet.OutstandingDebtMinorUnits, &wallet.ReleasableExcessMinorUnits)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrPositionNotFound
	}
	if err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx, `SELECT `+positionColumns+` FROM wlt_captain_collateral_positions WHERE operator_context_id=$1 AND captain_id=$2 ORDER BY created_at DESC`, contextID, captainID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	positions := make([]Position, 0)
	for rows.Next() {
		p, e := scanPosition(rows)
		if e != nil {
			return nil, e
		}
		positions = append(positions, *p)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	response := &ReadResponse{Policy: policy, Wallet: wallet, Positions: positions}
	if wallet.PendingMinorUnits > 0 {
		response.ReleaseBlockedReason = `WLT_COLLATERAL_RELEASE_PENDING_FUNDS`
	} else if wallet.HeldMinorUnits > 0 {
		response.ReleaseBlockedReason = `WLT_COLLATERAL_RELEASE_HELD_FUNDS`
	} else if wallet.CodReservedMinorUnits > 0 {
		response.ReleaseBlockedReason = `WLT_COLLATERAL_RELEASE_COD_RESERVATION_OPEN`
	} else if wallet.OutstandingDebtMinorUnits > 0 {
		response.ReleaseBlockedReason = `WLT_COLLATERAL_RELEASE_PROVIDER_DEBT_OPEN`
	}
	return response, nil
}

func HandleGet(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response, err := Read(r.Context(), db, r.PathValue(`captainId`))
		if errors.Is(err, ErrInvalidInput) {
			shared.SendError(w, http.StatusBadRequest, `INVALID_CAPTAIN_ID`, `captainId is invalid`)
			return
		}
		if errors.Is(err, ErrPositionNotFound) {
			shared.SendError(w, http.StatusNotFound, `NOT_FOUND`, `captain wallet not found`)
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, `WLT_COLLATERAL_READ_FAILED`, `captain collateral read failed`)
			return
		}
		w.Header().Set(`Cache-Control`, `private, no-store`)
		shared.SendJSON(w, http.StatusOK, response)
	}
}
func HandleUpsertPolicy(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input upsertPolicyInput
		if decodeJSON(w, r, &input) != nil {
			shared.SendError(w, 400, `INVALID_REQUEST`, `captain collateral policy request is invalid`)
			return
		}
		p, err := UpsertPolicy(r.Context(), db, input)
		switch {
		case errors.Is(err, ErrInvalidInput):
			shared.SendError(w, 400, `INVALID_REQUEST`, `captain collateral policy request is invalid`)
		case errors.Is(err, ErrVersionConflict):
			shared.SendError(w, 409, `VERSION_CONFLICT`, `captain collateral policy version is stale`)
		case err != nil:
			shared.SendError(w, 500, `WLT_COLLATERAL_POLICY_FAILED`, `captain collateral policy update failed`)
		default:
			shared.SendJSON(w, 200, map[string]any{`policy`: p})
		}
	}
}
func HandleAllocate(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input allocateInput
		if decodeJSON(w, r, &input) != nil {
			shared.SendError(w, 400, `INVALID_REQUEST`, `captain collateral allocation request is invalid`)
			return
		}
		p, err := Allocate(r.Context(), db, r.Header.Get(`Idempotency-Key`), input)
		switch {
		case errors.Is(err, ErrInvalidInput):
			shared.SendError(w, 400, `INVALID_REQUEST`, `captain collateral allocation request is invalid`)
		case errors.Is(err, ErrPolicyNotConfigured):
			shared.SendError(w, 503, `WLT_COLLATERAL_POLICY_NOT_CONFIGURED`, `captain collateral policy is not configured`)
		case errors.Is(err, ErrPolicyDisabled):
			shared.SendError(w, 409, `WLT_COLLATERAL_POLICY_DISABLED`, `captain collateral policy is disabled`)
		case errors.Is(err, ErrSourceNotCaptured):
			shared.SendError(w, 409, `SOURCE_NOT_CAPTURED`, `only a captured captain Cash-In can fund collateral`)
		case errors.Is(err, ErrSourceAlreadyAllocated):
			shared.SendError(w, 409, `SOURCE_ALREADY_ALLOCATED`, `the Cash-In already has a collateral position`)
		case errors.Is(err, ErrCollateralFundsUnavailable):
			shared.SendError(w, 409, `COLLATERAL_FUNDS_UNAVAILABLE`, `the captain wallet does not have enough spendable funds`)
		case errors.Is(err, ErrIdempotencyConflict):
			shared.SendError(w, 409, `IDEMPOTENCY_CONFLICT`, `the idempotency key was used for another collateral operation`)
		case err != nil:
			shared.SendError(w, 500, `WLT_COLLATERAL_ALLOCATION_FAILED`, `captain collateral allocation failed`)
		default:
			shared.SendJSON(w, 200, map[string]any{`position`: p})
		}
	}
}
func HandleRelease(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input releaseInput
		if decodeJSON(w, r, &input) != nil {
			shared.SendError(w, 400, `INVALID_REQUEST`, `captain collateral release request is invalid`)
			return
		}
		p, err := Release(r.Context(), db, r.Header.Get(`Idempotency-Key`), input)
		switch {
		case errors.Is(err, ErrInvalidInput):
			shared.SendError(w, 400, `INVALID_REQUEST`, `captain collateral release request is invalid`)
		case errors.Is(err, ErrPolicyNotConfigured):
			shared.SendError(w, 503, `WLT_COLLATERAL_POLICY_NOT_CONFIGURED`, `captain collateral policy is not configured`)
		case errors.Is(err, ErrPolicyDisabled):
			shared.SendError(w, 409, `WLT_COLLATERAL_POLICY_DISABLED`, `captain collateral policy is disabled`)
		case errors.Is(err, ErrPositionNotFound):
			shared.SendError(w, 404, `NOT_FOUND`, `active captain collateral position not found`)
		case errors.Is(err, ErrReleaseBlocked):
			shared.SendError(w, 409, `COLLATERAL_RELEASE_BLOCKED`, err.Error())
		case errors.Is(err, ErrIdempotencyConflict):
			shared.SendError(w, 409, `IDEMPOTENCY_CONFLICT`, `the idempotency key was used for another collateral operation`)
		case err != nil:
			shared.SendError(w, 500, `WLT_COLLATERAL_RELEASE_FAILED`, `captain collateral release failed`)
		default:
			shared.SendJSON(w, 200, map[string]any{`position`: p})
		}
	}
}
