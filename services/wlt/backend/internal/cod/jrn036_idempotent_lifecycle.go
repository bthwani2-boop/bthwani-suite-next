package cod

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

func applyGovernedCommissionLifecycleIdempotent(
	ctx context.Context,
	db *sql.DB,
	action string,
	commissionID string,
	operatorID string,
	reason string,
	correlationID string,
	idempotencyKey string,
) (*Commission, error) {
	action = strings.TrimSpace(action)
	commissionID = strings.TrimSpace(commissionID)
	operatorID = strings.TrimSpace(operatorID)
	reason = strings.TrimSpace(reason)
	correlationID = strings.TrimSpace(correlationID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if commissionID == "" || operatorID == "" || correlationID == "" || idempotencyKey == "" {
		return nil, fmt.Errorf(
			"commissionId, operatorId, correlationId and idempotencyKey are required",
		)
	}
	if (action == "reject" || action == "reverse") && reason == "" {
		return nil, fmt.Errorf("reason is required")
	}
	switch action {
	case "confirm", "settle", "reject", "reverse":
	default:
		return nil, fmt.Errorf("unsupported commission lifecycle action %q", action)
	}

	requestHash := hashCommissionParts(
		"commission_lifecycle",
		action,
		commissionID,
		operatorID,
		reason,
	)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	receipt, exists, err := shared.LoadJrn036MutationReceiptTx(
		ctx,
		tx,
		idempotencyKey,
		requestHash,
	)
	if err != nil {
		return nil, err
	}
	if exists {
		var commission Commission
		if err := json.Unmarshal(receipt, &commission); err != nil {
			return nil, fmt.Errorf("decode commission lifecycle idempotency receipt: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &commission, nil
	}

	commission, err := getCommissionForUpdateTx(tx, commissionID)
	if err != nil || commission == nil {
		return commission, err
	}

	var updated *Commission
	auditAction := "commission_" + action + "ed"
	switch action {
	case "confirm":
		if commission.Status != "pending" {
			return nil, ErrCommissionNotInExpectedState
		}
		row := tx.QueryRowContext(ctx, `
			UPDATE wlt_commissions
			SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
			WHERE id = $1 AND status = 'pending'
			RETURNING `+commissionCols, commission.ID)
		updated, err = scanCommission(row)
		auditAction = "commission_confirmed"

	case "settle":
		if commission.Status != "confirmed" {
			return nil, ErrCommissionNotInExpectedState
		}
		walletEffect, walletErr := commissionHasWalletEffectTx(ctx, tx, commission)
		if walletErr != nil {
			return nil, walletErr
		}
		if walletEffect {
			result, updateErr := tx.ExecContext(ctx, `
				UPDATE wlt_wallets
				SET pending_balance_minor_units = pending_balance_minor_units - $1,
				    available_balance_minor_units = available_balance_minor_units + $1,
				    settled_total_minor_units = settled_total_minor_units + $1,
				    updated_at = NOW()
				WHERE actor_type = $2
				  AND actor_id = $3
				  AND pending_balance_minor_units >= $1`,
				commission.AmountMinorUnits,
				commission.BeneficiaryActorType,
				commission.BeneficiaryActorID,
			)
			if updateErr != nil {
				return nil, updateErr
			}
			if affected, _ := result.RowsAffected(); affected != 1 {
				return nil, fmt.Errorf("commission wallet pending balance is insufficient")
			}
		}
		row := tx.QueryRowContext(ctx, `
			UPDATE wlt_commissions
			SET status = 'settled', settled_at = NOW(), updated_at = NOW()
			WHERE id = $1 AND status = 'confirmed'
			RETURNING `+commissionCols, commission.ID)
		updated, err = scanCommission(row)
		auditAction = "commission_settled"

	case "reject":
		if commission.Status != "pending" {
			return nil, ErrCommissionNotInExpectedState
		}
		walletEffect, walletErr := commissionHasWalletEffectTx(ctx, tx, commission)
		if walletErr != nil {
			return nil, walletErr
		}
		if walletEffect {
			result, updateErr := tx.ExecContext(ctx, `
				UPDATE wlt_wallets
				SET pending_balance_minor_units = pending_balance_minor_units - $1,
				    earned_total_minor_units = earned_total_minor_units - $1,
				    updated_at = NOW()
				WHERE actor_type = $2
				  AND actor_id = $3
				  AND pending_balance_minor_units >= $1
				  AND earned_total_minor_units >= $1`,
				commission.AmountMinorUnits,
				commission.BeneficiaryActorType,
				commission.BeneficiaryActorID,
			)
			if updateErr != nil {
				return nil, updateErr
			}
			if affected, _ := result.RowsAffected(); affected != 1 {
				return nil, fmt.Errorf("commission wallet balance cannot be reversed")
			}
			lines := []ledger.LedgerLine{
				{
					AccountType:      "wallet",
					ActorType:        commission.BeneficiaryActorType,
					ActorID:          commission.BeneficiaryActorID,
					DebitCredit:      "debit",
					AmountMinorUnits: commission.AmountMinorUnits,
					Currency:         commission.Currency,
				},
				{
					AccountType:      "platform_commission_receivable",
					DebitCredit:      "credit",
					AmountMinorUnits: commission.AmountMinorUnits,
					Currency:         commission.Currency,
				},
			}
			if _, postErr := ledger.PostLedgerTransaction(
				ctx,
				tx,
				"commission_rejected",
				"commission",
				commission.ID,
				lines,
				ledger.Actor{ID: operatorID, Type: "operator"},
			); postErr != nil {
				return nil, postErr
			}
		}
		row := tx.QueryRowContext(ctx, `
			UPDATE wlt_commissions
			SET status = 'rejected', rejected_at = NOW(), resolution_note = $2,
			    updated_at = NOW()
			WHERE id = $1 AND status = 'pending'
			RETURNING `+commissionCols, commission.ID, reason)
		updated, err = scanCommission(row)
		auditAction = "commission_rejected"

	case "reverse":
		if commission.Status != "settled" {
			return nil, ErrCommissionNotInExpectedState
		}
		walletEffect, walletErr := commissionHasWalletEffectTx(ctx, tx, commission)
		if walletErr != nil {
			return nil, walletErr
		}
		if walletEffect {
			result, updateErr := tx.ExecContext(ctx, `
				UPDATE wlt_wallets
				SET available_balance_minor_units = available_balance_minor_units - $1,
				    settled_total_minor_units = settled_total_minor_units - $1,
				    updated_at = NOW()
				WHERE actor_type = $2
				  AND actor_id = $3
				  AND available_balance_minor_units >= $1
				  AND settled_total_minor_units >= $1`,
				commission.AmountMinorUnits,
				commission.BeneficiaryActorType,
				commission.BeneficiaryActorID,
			)
			if updateErr != nil {
				return nil, updateErr
			}
			if affected, _ := result.RowsAffected(); affected != 1 {
				return nil, fmt.Errorf("commission available balance cannot be reversed")
			}
			lines := []ledger.LedgerLine{
				{
					AccountType:      "wallet",
					ActorType:        commission.BeneficiaryActorType,
					ActorID:          commission.BeneficiaryActorID,
					DebitCredit:      "debit",
					AmountMinorUnits: commission.AmountMinorUnits,
					Currency:         commission.Currency,
				},
				{
					AccountType:      "platform_commission_receivable",
					DebitCredit:      "credit",
					AmountMinorUnits: commission.AmountMinorUnits,
					Currency:         commission.Currency,
				},
			}
			if _, postErr := ledger.PostLedgerTransaction(
				ctx,
				tx,
				"commission_reversed",
				"commission",
				commission.ID,
				lines,
				ledger.Actor{ID: operatorID, Type: "operator"},
			); postErr != nil {
				return nil, postErr
			}
		}
		row := tx.QueryRowContext(ctx, `
			UPDATE wlt_commissions
			SET status = 'reversed', reversed_at = NOW(), resolution_note = $2,
			    updated_at = NOW()
			WHERE id = $1 AND status = 'settled'
			RETURNING `+commissionCols, commission.ID, reason)
		updated, err = scanCommission(row)
		auditAction = "commission_reversed"
	}
	if err != nil {
		return nil, err
	}
	if err := appendCommissionAudit(
		ctx,
		tx,
		commission.ID,
		auditAction,
		operatorID,
		reason,
		correlationID,
	); err != nil {
		return nil, err
	}
	if err := shared.StoreJrn036MutationReceiptTx(
		ctx,
		tx,
		idempotencyKey,
		requestHash,
		"commission_"+action,
		commission.ID,
		updated,
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updated, nil
}

func ConfirmGovernedCommissionIdempotent(
	ctx context.Context,
	db *sql.DB,
	commissionID string,
	operatorID string,
	correlationID string,
	idempotencyKey string,
) (*Commission, error) {
	return applyGovernedCommissionLifecycleIdempotent(
		ctx,
		db,
		"confirm",
		commissionID,
		operatorID,
		"",
		correlationID,
		idempotencyKey,
	)
}

func SettleGovernedCommissionIdempotent(
	ctx context.Context,
	db *sql.DB,
	commissionID string,
	operatorID string,
	correlationID string,
	idempotencyKey string,
) (*Commission, error) {
	return applyGovernedCommissionLifecycleIdempotent(
		ctx,
		db,
		"settle",
		commissionID,
		operatorID,
		"",
		correlationID,
		idempotencyKey,
	)
}

func RejectGovernedCommissionIdempotent(
	ctx context.Context,
	db *sql.DB,
	commissionID string,
	operatorID string,
	reason string,
	correlationID string,
	idempotencyKey string,
) (*Commission, error) {
	return applyGovernedCommissionLifecycleIdempotent(
		ctx,
		db,
		"reject",
		commissionID,
		operatorID,
		reason,
		correlationID,
		idempotencyKey,
	)
}

func ReverseGovernedCommissionIdempotent(
	ctx context.Context,
	db *sql.DB,
	commissionID string,
	operatorID string,
	reason string,
	correlationID string,
	idempotencyKey string,
) (*Commission, error) {
	return applyGovernedCommissionLifecycleIdempotent(
		ctx,
		db,
		"reverse",
		commissionID,
		operatorID,
		reason,
		correlationID,
		idempotencyKey,
	)
}

func writeIdempotentCommissionLifecycleResult(
	w http.ResponseWriter,
	commission *Commission,
	err error,
) {
	switch {
	case errors.Is(err, shared.ErrJrn036MutationIdempotencyConflict):
		shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
	case errors.Is(err, ErrCommissionNotInExpectedState):
		shared.SendError(w, http.StatusConflict, "INVALID_STATE", err.Error())
	case err != nil:
		shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	case commission == nil:
		shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "commission not found")
	default:
		shared.SendJSON(w, http.StatusOK, map[string]any{"commission": commission})
	}
}

func HandleConfirmGovernedCommissionIdempotent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		input, ok := decodeLifecycleInput(w, r)
		if !ok {
			return
		}
		commission, err := ConfirmGovernedCommissionIdempotent(
			r.Context(),
			db,
			r.PathValue("commissionId"),
			input.OperatorID,
			r.Header.Get("X-Correlation-ID"),
			r.Header.Get("Idempotency-Key"),
		)
		writeIdempotentCommissionLifecycleResult(w, commission, err)
	}
}

func HandleSettleGovernedCommissionIdempotent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		input, ok := decodeLifecycleInput(w, r)
		if !ok {
			return
		}
		commission, err := SettleGovernedCommissionIdempotent(
			r.Context(),
			db,
			r.PathValue("commissionId"),
			input.OperatorID,
			r.Header.Get("X-Correlation-ID"),
			r.Header.Get("Idempotency-Key"),
		)
		writeIdempotentCommissionLifecycleResult(w, commission, err)
	}
}

func HandleRejectGovernedCommissionIdempotent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		input, ok := decodeLifecycleInput(w, r)
		if !ok {
			return
		}
		commission, err := RejectGovernedCommissionIdempotent(
			r.Context(),
			db,
			r.PathValue("commissionId"),
			input.OperatorID,
			input.Reason,
			r.Header.Get("X-Correlation-ID"),
			r.Header.Get("Idempotency-Key"),
		)
		writeIdempotentCommissionLifecycleResult(w, commission, err)
	}
}

func HandleReverseGovernedCommissionIdempotent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		input, ok := decodeLifecycleInput(w, r)
		if !ok {
			return
		}
		commission, err := ReverseGovernedCommissionIdempotent(
			r.Context(),
			db,
			r.PathValue("commissionId"),
			input.OperatorID,
			input.Reason,
			r.Header.Get("X-Correlation-ID"),
			r.Header.Get("Idempotency-Key"),
		)
		writeIdempotentCommissionLifecycleResult(w, commission, err)
	}
}
