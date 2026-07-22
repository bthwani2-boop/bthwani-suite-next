package payout

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

var governedPayoutActorTypes = map[string]struct{}{
	"partner": {},
	"captain": {},
	"field":   {},
}

type governedDestinationRef struct {
	ID                   string `json:"id"`
	OwnerActorID         string `json:"ownerActorId"`
	OwnerActorType       string `json:"ownerActorType"`
	SettlementPreference string `json:"settlementPreference"`
	MaskedAccountNumber  string `json:"maskedAccountNumber"`
	MaskedIBAN           string `json:"maskedIban"`
	MaskedMobileNumber   string `json:"maskedMobileNumber"`
	BeneficiaryName      string `json:"beneficiaryName"`
	BankName             string `json:"bankName"`
	BankBranch           string `json:"bankBranch"`
	Active               bool   `json:"active"`
	UpdatedAt            string `json:"updatedAt"`
}

type governedDestinationInput struct {
	BeneficiaryName               string `json:"beneficiaryName"`
	BankName                      string `json:"bankName"`
	BankBranch                    string `json:"bankBranch"`
	AccountNumber                 string `json:"accountNumber"`
	IBAN                          string `json:"iban"`
	PayoutMobileNumber            string `json:"payoutMobileNumber"`
	SettlementPreference          string `json:"settlementPreference"`
	BankAccountHolderMatchesOwner bool   `json:"bankAccountHolderMatchesOwner"`
	BankNotes                     string `json:"bankNotes"`
	OperatorID                    string `json:"operatorId"`
}

type governedCreatePayoutInput struct {
	BeneficiaryActorID   string `json:"beneficiaryActorId"`
	BeneficiaryActorType string `json:"beneficiaryActorType"`
	PayoutDestinationID string `json:"payoutDestinationId"`
	AmountMinorUnits     int64  `json:"amountMinorUnits"`
	Currency             string `json:"currency"`
	IdempotencyKey       string `json:"idempotencyKey"`
}

type payoutReconciliationInput struct {
	OperatorID string `json:"operatorId"`
}

func normalizeGovernedOwner(actorType, actorID string) (string, string, error) {
	actorType = strings.ToLower(strings.TrimSpace(actorType))
	actorID = strings.TrimSpace(actorID)
	if _, ok := governedPayoutActorTypes[actorType]; !ok {
		return "", "", fmt.Errorf("unsupported payout owner actor type")
	}
	if actorID == "" || len(actorID) > 200 {
		return "", "", fmt.Errorf("payout owner actor id is required")
	}
	return actorType, actorID, nil
}

func governedCorrelationID(r *http.Request) (string, error) {
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		return "", fmt.Errorf("X-Correlation-ID is required")
	}
	return correlationID, nil
}

func governedPayoutHash(input governedCreatePayoutInput) string {
	sum := sha256.Sum256([]byte(strings.Join([]string{
		input.BeneficiaryActorType,
		input.BeneficiaryActorID,
		input.PayoutDestinationID,
		fmt.Sprintf("%d", input.AmountMinorUnits),
		input.Currency,
	}, "|")))
	return hex.EncodeToString(sum[:])
}

func appendPayoutAudit(ctx context.Context, tx *sql.Tx, aggregateType, aggregateID, action, actorID, actorType, reason, correlationID string, metadata any) error {
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn037_payout_audit_events
			(aggregate_type, aggregate_id, action, actor_id, actor_type, reason, correlation_id, metadata)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
		aggregateType, aggregateID, action, actorID, actorType, reason, correlationID, string(encoded))
	return err
}

func enqueuePayoutEvent(ctx context.Context, tx *sql.Tx, payoutRequestID, eventType, actorID, actorType, correlationID string, payload any) error {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn037_payout_outbox
			(payout_request_id, event_type, recipient_actor_id, recipient_actor_type, payload, correlation_id)
		VALUES ($1,$2,$3,$4,$5::jsonb,$6)
		ON CONFLICT (payout_request_id, event_type) DO NOTHING`,
		payoutRequestID, eventType, actorID, actorType, string(encoded), correlationID)
	return err
}

func scanGovernedDestination(row *sql.Row) (*governedDestinationRef, error) {
	var destination governedDestinationRef
	var updatedAt string
	err := row.Scan(
		&destination.ID,
		&destination.OwnerActorID,
		&destination.OwnerActorType,
		&destination.SettlementPreference,
		&destination.MaskedAccountNumber,
		&destination.MaskedIBAN,
		&destination.MaskedMobileNumber,
		&destination.BeneficiaryName,
		&destination.BankName,
		&destination.BankBranch,
		&destination.Active,
		&updatedAt,
	)
	destination.UpdatedAt = updatedAt
	return &destination, err
}

const governedDestinationReturning = `id, owner_actor_id, owner_actor_type, settlement_preference,
	masked_account_number, masked_iban, masked_mobile_number, beneficiary_name,
	bank_name, bank_branch, active, updated_at::text`

func HandleUpsertPayoutDestinationJRN037(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorType, actorID, err := normalizeGovernedOwner(r.PathValue("actorType"), r.PathValue("actorId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		var input governedDestinationInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout destination body is invalid")
			return
		}
		input.SettlementPreference = strings.TrimSpace(input.SettlementPreference)
		if input.SettlementPreference == "" {
			input.SettlementPreference = "bank"
		}
		if input.SettlementPreference != "bank" && input.SettlementPreference != "mobile_money" && input.SettlementPreference != "manual" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "unsupported settlementPreference")
			return
		}
		if strings.TrimSpace(input.BeneficiaryName) == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "beneficiaryName is required")
			return
		}
		if input.SettlementPreference == "bank" && strings.TrimSpace(input.AccountNumber) == "" && strings.TrimSpace(input.IBAN) == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "bank payout requires accountNumber or iban")
			return
		}
		if input.SettlementPreference == "mobile_money" && strings.TrimSpace(input.PayoutMobileNumber) == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "mobile-money payout requires payoutMobileNumber")
			return
		}
		key, err := payoutEncryptionKey()
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "payout encryption is not configured")
			return
		}
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start destination transaction")
			return
		}
		defer tx.Rollback()
		if _, err := tx.ExecContext(r.Context(), `
			UPDATE wlt_payout_destinations
			SET active = false, updated_at = now()
			WHERE owner_actor_type = $1 AND owner_actor_id = $2 AND active = true`, actorType, actorID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to retire current payout destination")
			return
		}
		operatorID := strings.TrimSpace(input.OperatorID)
		if operatorID == "" {
			operatorID = actorID
		}
		row := tx.QueryRowContext(r.Context(), `
			INSERT INTO wlt_payout_destinations
				(partner_id, owner_actor_id, owner_actor_type, beneficiary_name, bank_name, bank_branch,
				 account_number_encrypted, iban_encrypted, payout_mobile_number_encrypted,
				 settlement_preference, bank_account_holder_matches_owner, bank_notes,
				 masked_account_number, masked_iban, masked_mobile_number, active, created_by_actor_id)
			VALUES ($1,$1,$2,$3,$4,$5,
				pgp_sym_encrypt($6,$7), pgp_sym_encrypt($8,$7), pgp_sym_encrypt($9,$7),
				$10,$11,$12,$13,$14,$15,true,$16)
			RETURNING `+governedDestinationReturning,
			actorID, actorType, strings.TrimSpace(input.BeneficiaryName), strings.TrimSpace(input.BankName), strings.TrimSpace(input.BankBranch),
			strings.TrimSpace(input.AccountNumber), key, strings.TrimSpace(input.IBAN), strings.TrimSpace(input.PayoutMobileNumber),
			input.SettlementPreference, input.BankAccountHolderMatchesOwner, strings.TrimSpace(input.BankNotes),
			maskLast4(input.AccountNumber), maskLast4(input.IBAN), maskLast4(input.PayoutMobileNumber), operatorID)
		destination, err := scanGovernedDestination(row)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist payout destination")
			return
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_destination", destination.ID, "destination.upserted", operatorID, actorType, "", correlationID, map[string]any{
			"ownerActorId": actorID, "ownerActorType": actorType, "settlementPreference": destination.SettlementPreference,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout destination")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout destination")
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"payoutDestination": destination})
	}
}

func HandleGetPayoutDestinationJRN037(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorType, actorID, err := normalizeGovernedOwner(r.PathValue("actorType"), r.PathValue("actorId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		row := db.QueryRowContext(r.Context(), `SELECT `+governedDestinationReturning+`
			FROM wlt_payout_destinations
			WHERE owner_actor_type = $1 AND owner_actor_id = $2 AND active = true
			ORDER BY created_at DESC LIMIT 1`, actorType, actorID)
		destination, err := scanGovernedDestination(row)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusNotFound, "PAYOUT_DESTINATION_NOT_FOUND", "no active payout destination found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout destination")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"payoutDestination": destination})
	}
}

func HandleDeactivatePayoutDestinationJRN037(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorType, actorID, err := normalizeGovernedOwner(r.PathValue("actorType"), r.PathValue("actorId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start destination transaction")
			return
		}
		defer tx.Rollback()
		var destinationID string
		err = tx.QueryRowContext(r.Context(), `
			UPDATE wlt_payout_destinations SET active = false, updated_at = now()
			WHERE owner_actor_type = $1 AND owner_actor_id = $2 AND active = true
			RETURNING id`, actorType, actorID).Scan(&destinationID)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusNotFound, "PAYOUT_DESTINATION_NOT_FOUND", "no active payout destination found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to deactivate payout destination")
			return
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_destination", destinationID, "destination.deactivated", actorID, actorType, "", correlationID, map[string]any{
			"ownerActorId": actorID, "ownerActorType": actorType,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout destination")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout destination deactivation")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func HandleCreatePayoutRequestJRN037(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		var input governedCreatePayoutInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout request body is invalid")
			return
		}
		input.BeneficiaryActorType, input.BeneficiaryActorID, err = normalizeGovernedOwner(input.BeneficiaryActorType, input.BeneficiaryActorID)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		input.PayoutDestinationID = strings.TrimSpace(input.PayoutDestinationID)
		input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
		input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
		if input.PayoutDestinationID == "" || input.IdempotencyKey == "" || input.Currency == "" || input.AmountMinorUnits <= 0 {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutDestinationId, positive amountMinorUnits, currency and idempotencyKey are required")
			return
		}
		requestHash := governedPayoutHash(input)
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout transaction")
			return
		}
		defer tx.Rollback()

		var existingHash sql.NullString
		var existingID string
		err = tx.QueryRowContext(r.Context(), `SELECT request_hash, id FROM wlt_payout_requests WHERE idempotency_key = $1 LIMIT 1`, input.IdempotencyKey).Scan(&existingHash, &existingID)
		if err == nil {
			if !existingHash.Valid || existingHash.String != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used with a different payout intent")
				return
			}
			rows, queryErr := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1", existingID)
			if queryErr != nil || !rows.Next() {
				if rows != nil { rows.Close() }
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read idempotent payout request")
				return
			}
			existing, scanErr := scanPayoutRequest(rows)
			rows.Close()
			if scanErr != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode idempotent payout request")
				return
			}
			existing.PayoutDestinationID = input.PayoutDestinationID
			shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: existing})
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to verify payout idempotency")
			return
		}

		var active bool
		err = tx.QueryRowContext(r.Context(), `
			SELECT active FROM wlt_payout_destinations
			WHERE id = $1 AND owner_actor_type = $2 AND owner_actor_id = $3
			FOR UPDATE`, input.PayoutDestinationID, input.BeneficiaryActorType, input.BeneficiaryActorID).Scan(&active)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusForbidden, "PAYOUT_DESTINATION_FORBIDDEN", "payout destination is not owned by the beneficiary")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to verify payout destination")
			return
		}
		if !active {
			shared.SendError(w, http.StatusConflict, "PAYOUT_DESTINATION_INACTIVE", "payout destination is inactive")
			return
		}
		var available int64
		err = tx.QueryRowContext(r.Context(), `
			SELECT available_balance_minor_units FROM wlt_wallets
			WHERE actor_id = $1 AND actor_type = $2 FOR UPDATE`, input.BeneficiaryActorID, input.BeneficiaryActorType).Scan(&available)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusBadRequest, "NO_WALLET", "wallet not found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read wallet")
			return
		}
		if available < input.AmountMinorUnits {
			shared.SendError(w, http.StatusConflict, "INSUFFICIENT_FUNDS", "insufficient available balance")
			return
		}
		result, err := tx.ExecContext(r.Context(), `
			UPDATE wlt_wallets
			SET available_balance_minor_units = available_balance_minor_units - $1,
			    held_balance_minor_units = held_balance_minor_units + $1,
			    updated_at = now()
			WHERE actor_id = $2 AND actor_type = $3 AND available_balance_minor_units >= $1`,
			input.AmountMinorUnits, input.BeneficiaryActorID, input.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to hold payout funds")
			return
		}
		if affected, _ := result.RowsAffected(); affected != 1 {
			shared.SendError(w, http.StatusConflict, "INSUFFICIENT_FUNDS", "available balance changed before payout hold")
			return
		}
		rows, err := tx.QueryContext(r.Context(), `
			INSERT INTO wlt_payout_requests
				(beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, status,
				 idempotency_key, payload_hash, payout_destination_id, request_hash)
			VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$6)
			RETURNING `+requestCols,
			input.BeneficiaryActorID, input.BeneficiaryActorType, input.AmountMinorUnits, input.Currency,
			input.IdempotencyKey, requestHash, input.PayoutDestinationID)
		if err != nil || !rows.Next() {
			if rows != nil { rows.Close() }
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to create payout request")
			return
		}
		created, scanErr := scanPayoutRequest(rows)
		rows.Close()
		if scanErr != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode payout request")
			return
		}
		created.PayoutDestinationID = input.PayoutDestinationID
		created.ReconciliationStatus = "not_required"
		if err := appendPayoutAudit(r.Context(), tx, "payout_request", created.ID, "payout.requested", input.BeneficiaryActorID, input.BeneficiaryActorType, "", correlationID, map[string]any{
			"payoutDestinationId": input.PayoutDestinationID, "amountMinorUnits": input.AmountMinorUnits, "currency": input.Currency,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout request")
			return
		}
		if err := enqueuePayoutEvent(r.Context(), tx, created.ID, "payout.requested", input.BeneficiaryActorID, input.BeneficiaryActorType, correlationID, map[string]any{
			"status": "pending", "amountMinorUnits": input.AmountMinorUnits, "currency": input.Currency,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to enqueue payout notification")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout request")
			return
		}
		shared.SendJSON(w, http.StatusCreated, PayoutRequestResponse{PayoutRequest: created})
	}
}

func HandleReconcilePayoutRequestJRN037(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		var input payoutReconciliationInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil || strings.TrimSpace(input.OperatorID) == "" {
			shared.SendError(w, http.StatusBadRequest, "OPERATOR_REQUIRED", "operatorId is required")
			return
		}
		input.OperatorID = strings.TrimSpace(input.OperatorID)
		payoutID := strings.TrimSpace(r.PathValue("payoutId"))
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout reconciliation")
			return
		}
		defer tx.Rollback()
		req, err := lockedPayout(r.Context(), tx, payoutID)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout request not found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout request")
			return
		}
		if req.Status != "provider_result_unknown" && req.Status != "provider_pending" {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", "only an unresolved provider payout can be reconciled")
			return
		}
		if req.ApprovedByOperatorID == "" || req.ProcessedByOperatorID == "" || input.OperatorID == req.ApprovedByOperatorID || input.OperatorID == req.ProcessedByOperatorID {
			shared.SendError(w, http.StatusForbidden, "MAKER_CHECKER_VIOLATION", "reconciliation operator must differ from payout approver and processor")
			return
		}
		if _, err := tx.ExecContext(r.Context(), `
			UPDATE wlt_payout_requests SET reconciliation_status = 'inquiry_pending'
			WHERE id = $1 AND status IN ('provider_result_unknown','provider_pending')`, payoutID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to claim payout reconciliation")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout reconciliation claim")
			return
		}

		providerResult, providerErr := client.Get(r.Context(), "/financial/payout/status/"+url.PathEscape(payoutID), provider.RequestMetaFromHTTP(r, "wlt-payout-reconciliation"))
		if providerErr != nil {
			_, _ = db.ExecContext(r.Context(), `UPDATE wlt_payout_requests SET reconciliation_status = 'required' WHERE id = $1 AND status IN ('provider_result_unknown','provider_pending')`, payoutID)
			shared.SendProviderError(w, providerErr)
			return
		}
		providerStatus := strings.ToLower(strings.TrimSpace(providerResult.Status))
		finalTx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to finalize payout reconciliation")
			return
		}
		defer finalTx.Rollback()
		current, err := lockedPayout(r.Context(), finalTx, payoutID)
		if err != nil {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", "payout changed during reconciliation")
			return
		}
		resolutionAction := ""
		inquiryStatus := "unknown"
		if providerStatus == "succeeded" || providerStatus == "processed" {
			if providerResult.ProviderReference == "" {
				shared.SendError(w, http.StatusBadGateway, "PROVIDER_INVALID_RESPONSE", "provider success is missing a reference")
				return
			}
			_, err = finalTx.ExecContext(r.Context(), `
				UPDATE wlt_payout_requests
				SET status = 'processing', provider_reference = $2, provider_status = $3,
				    provider_processed_at = now(), reconciliation_status = 'resolved_success',
				    reconciled_at = now(), reconciled_by_operator_id = $4
				WHERE id = $1 AND status IN ('provider_result_unknown','provider_pending')`,
				payoutID, providerResult.ProviderReference, providerStatus, input.OperatorID)
			inquiryStatus = "succeeded"
			resolutionAction = "confirmed_success"
		} else if providerStatus == "failed" || providerStatus == "declined" {
			result, releaseErr := finalTx.ExecContext(r.Context(), `
				UPDATE wlt_wallets
				SET available_balance_minor_units = available_balance_minor_units + $1,
				    held_balance_minor_units = held_balance_minor_units - $1,
				    updated_at = now()
				WHERE actor_id = $2 AND actor_type = $3 AND held_balance_minor_units >= $1`,
				current.AmountMinorUnits, current.BeneficiaryActorID, current.BeneficiaryActorType)
			if releaseErr != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to release reconciled payout hold")
				return
			}
			if affected, _ := result.RowsAffected(); affected != 1 {
				shared.SendError(w, http.StatusConflict, "HELD_BALANCE_MISMATCH", "held wallet balance cannot be released")
				return
			}
			_, err = finalTx.ExecContext(r.Context(), `
				UPDATE wlt_payout_requests
				SET status = 'failed', failed_at = now(), provider_status = $2,
				    failure_reason = 'provider inquiry confirmed failure',
				    reconciliation_status = 'resolved_failed', reconciled_at = now(),
				    reconciled_by_operator_id = $3, failed_by_operator_id = $3, operator_id = $3
				WHERE id = $1 AND status IN ('provider_result_unknown','provider_pending')`,
				payoutID, providerStatus, input.OperatorID)
			inquiryStatus = "failed"
			resolutionAction = "confirmed_failed"
		} else {
			_, _ = finalTx.ExecContext(r.Context(), `
				UPDATE wlt_payout_requests SET reconciliation_status = 'required'
				WHERE id = $1 AND status IN ('provider_result_unknown','provider_pending')`, payoutID)
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist payout reconciliation result")
			return
		}
		payload, _ := json.Marshal(providerResult)
		if _, err := finalTx.ExecContext(r.Context(), `
			INSERT INTO wlt_jrn037_payout_reconciliations
				(payout_request_id, provider_reference, inquiry_status, provider_status,
				 provider_payload, operator_id, correlation_id, resolution_action, resolved_at)
			VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,CASE WHEN $8 = '' THEN NULL ELSE now() END)`,
			payoutID, providerResult.ProviderReference, inquiryStatus, providerStatus, string(payload), input.OperatorID, correlationID, resolutionAction); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to retain payout reconciliation evidence")
			return
		}
		if err := appendPayoutAudit(r.Context(), finalTx, "payout_reconciliation", payoutID, "payout.reconciled", input.OperatorID, "operator", resolutionAction, correlationID, map[string]any{
			"providerStatus": providerStatus, "providerReference": providerResult.ProviderReference, "inquiryStatus": inquiryStatus,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout reconciliation")
			return
		}
		if resolutionAction != "" {
			eventType := "payout.reconciled"
			if resolutionAction == "confirmed_failed" { eventType = "payout.failed" }
			if err := enqueuePayoutEvent(r.Context(), finalTx, payoutID, eventType, current.BeneficiaryActorID, current.BeneficiaryActorType, correlationID, map[string]any{
				"providerStatus": providerStatus, "resolutionAction": resolutionAction,
			}); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to enqueue reconciliation notification")
				return
			}
		}
		if err := finalTx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout reconciliation")
			return
		}
		if resolutionAction == "" {
			shared.SendError(w, http.StatusConflict, "PROVIDER_RESULT_UNKNOWN", "provider inquiry did not return a final payout result")
			return
		}
		HandleGetPayoutRequestWithProviderProof(db)(w, r)
	}
}

func HandleListPayoutAuditJRN037(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payoutID := strings.TrimSpace(r.PathValue("payoutId"))
		if payoutID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
			return
		}
		rows, err := db.QueryContext(r.Context(), `
			SELECT id, aggregate_type, aggregate_id, action, actor_id, actor_type,
			       reason, correlation_id, metadata, created_at
			FROM wlt_jrn037_payout_audit_events
			WHERE aggregate_id = $1
			ORDER BY created_at ASC, id ASC`, payoutID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout audit")
			return
		}
		defer rows.Close()
		events := make([]map[string]any, 0)
		for rows.Next() {
			var id, aggregateType, aggregateID, action, actorID, actorType, reason, correlationID, createdAt string
			var metadata json.RawMessage
			if err := rows.Scan(&id, &aggregateType, &aggregateID, &action, &actorID, &actorType, &reason, &correlationID, &metadata, &createdAt); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode payout audit")
				return
			}
			events = append(events, map[string]any{
				"id": id, "aggregateType": aggregateType, "aggregateId": aggregateID,
				"action": action, "actorId": actorID, "actorType": actorType,
				"reason": reason, "correlationId": correlationID, "metadata": metadata, "createdAt": createdAt,
			})
		}
		if err := rows.Err(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed while reading payout audit")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"auditEvents": events})
	}
}
