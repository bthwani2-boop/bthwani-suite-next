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
	PayoutDestinationID  string `json:"payoutDestinationId"`
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

func governedPayoutHash(tenantID string, input governedCreatePayoutInput) string {
	sum := sha256.Sum256([]byte(strings.Join([]string{
		strings.TrimSpace(tenantID),
		input.BeneficiaryActorType,
		input.BeneficiaryActorID,
		input.PayoutDestinationID,
		fmt.Sprintf("%d", input.AmountMinorUnits),
		input.Currency,
	}, "|")))
	return hex.EncodeToString(sum[:])
}

func appendPayoutAudit(ctx context.Context, tx *sql.Tx, aggregateType, aggregateID, action, actorID, actorType, reason, correlationID string, metadata any) error {
	tenantID, err := shared.RequireTenantContext(ctx)
	if err != nil {
		return err
	}
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn037_payout_audit_events
			(tenant_id, aggregate_type, aggregate_id, action, actor_id, actor_type, reason, correlation_id, metadata)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
		tenantID, aggregateType, aggregateID, action, actorID, actorType, reason, correlationID, string(encoded))
	return err
}

func enqueuePayoutEvent(ctx context.Context, tx *sql.Tx, payoutRequestID, eventType, actorID, actorType, correlationID string, payload any) error {
	tenantID, err := shared.RequireTenantContext(ctx)
	if err != nil {
		return err
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn037_payout_outbox
			(tenant_id, payout_request_id, event_type, recipient_actor_id, recipient_actor_type, payload, correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
		ON CONFLICT (tenant_id, payout_request_id, event_type) DO NOTHING`,
		tenantID, payoutRequestID, eventType, actorID, actorType, string(encoded), correlationID)
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

func requirePayoutTenant(w http.ResponseWriter, r *http.Request) (string, bool) {
	tenantID, err := shared.RequireTenantContext(r.Context())
	if err != nil {
		shared.SendError(w, http.StatusBadRequest, "TENANT_REQUIRED", err.Error())
		return "", false
	}
	return tenantID, true
}

func HandleUpsertPayoutDestinationJRN037(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := requirePayoutTenant(w, r)
		if !ok {
			return
		}
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
		defer tx.Rollback() //nolint:errcheck
		if _, err := tx.ExecContext(r.Context(), `
			UPDATE wlt_payout_destinations
			SET active=false, updated_at=now()
			WHERE tenant_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true`, tenantID, actorType, actorID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to retire current payout destination")
			return
		}
		operatorID := strings.TrimSpace(input.OperatorID)
		if operatorID == "" {
			operatorID = actorID
		}
		row := tx.QueryRowContext(r.Context(), `
			INSERT INTO wlt_payout_destinations
				(tenant_id, partner_id, owner_actor_id, owner_actor_type, beneficiary_name, bank_name, bank_branch,
				 account_number_encrypted, iban_encrypted, payout_mobile_number_encrypted,
				 settlement_preference, bank_account_holder_matches_owner, bank_notes,
				 masked_account_number, masked_iban, masked_mobile_number, active, created_by_actor_id)
			VALUES ($1,$2,$2,$3,$4,$5,$6,
				pgp_sym_encrypt($7,$8),pgp_sym_encrypt($9,$8),pgp_sym_encrypt($10,$8),
				$11,$12,$13,$14,$15,$16,true,$17)
			RETURNING `+governedDestinationReturning,
			tenantID, actorID, actorType, strings.TrimSpace(input.BeneficiaryName), strings.TrimSpace(input.BankName), strings.TrimSpace(input.BankBranch),
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
		tenantID, ok := requirePayoutTenant(w, r)
		if !ok {
			return
		}
		actorType, actorID, err := normalizeGovernedOwner(r.PathValue("actorType"), r.PathValue("actorId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		row := db.QueryRowContext(r.Context(), `SELECT `+governedDestinationReturning+`
			FROM wlt_payout_destinations
			WHERE tenant_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true
			ORDER BY created_at DESC LIMIT 1`, tenantID, actorType, actorID)
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
		tenantID, ok := requirePayoutTenant(w, r)
		if !ok {
			return
		}
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
		defer tx.Rollback() //nolint:errcheck
		var destinationID string
		err = tx.QueryRowContext(r.Context(), `
			UPDATE wlt_payout_destinations SET active=false,updated_at=now()
			WHERE tenant_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true
			RETURNING id`, tenantID, actorType, actorID).Scan(&destinationID)
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
		tenantID, ok := requirePayoutTenant(w, r)
		if !ok {
			return
		}
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
		requestHash := governedPayoutHash(tenantID, input)
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout transaction")
			return
		}
		defer tx.Rollback() //nolint:errcheck

		var existingHash sql.NullString
		var existingID string
		err = tx.QueryRowContext(r.Context(), `SELECT request_hash,id FROM wlt_payout_requests
			WHERE tenant_id=$1 AND idempotency_key=$2 LIMIT 1`, tenantID, input.IdempotencyKey).Scan(&existingHash, &existingID)
		if err == nil {
			if !existingHash.Valid || existingHash.String != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used with a different payout intent")
				return
			}
			rows, queryErr := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE tenant_id=$1 AND id=$2", tenantID, existingID)
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
		err = tx.QueryRowContext(r.Context(), `SELECT active FROM wlt_payout_destinations
			WHERE tenant_id=$1 AND id=$2 AND owner_actor_type=$3 AND owner_actor_id=$4 FOR UPDATE`,
			tenantID, input.PayoutDestinationID, input.BeneficiaryActorType, input.BeneficiaryActorID).Scan(&active)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusForbidden, "PAYOUT_DESTINATION_FORBIDDEN", "payout destination is not owned by the beneficiary in the trusted tenant")
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
		err = tx.QueryRowContext(r.Context(), `SELECT available_balance_minor_units FROM wlt_wallets
			WHERE tenant_id=$1 AND actor_id=$2 AND actor_type=$3 FOR UPDATE`, tenantID, input.BeneficiaryActorID, input.BeneficiaryActorType).Scan(&available)
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
		result, err := tx.ExecContext(r.Context(), `UPDATE wlt_wallets
			SET available_balance_minor_units=available_balance_minor_units-$1,
			    held_balance_minor_units=held_balance_minor_units+$1,
			    updated_at=now()
			WHERE tenant_id=$2 AND actor_id=$3 AND actor_type=$4 AND available_balance_minor_units>=$1`,
			input.AmountMinorUnits, tenantID, input.BeneficiaryActorID, input.BeneficiaryActorType)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to hold payout funds")
			return
		}
		if affected, _ := result.RowsAffected(); affected != 1 {
			shared.SendError(w, http.StatusConflict, "INSUFFICIENT_FUNDS", "available balance changed before payout hold")
			return
		}
		rows, err := tx.QueryContext(r.Context(), `INSERT INTO wlt_payout_requests
			(tenant_id,beneficiary_actor_id,beneficiary_actor_type,amount_minor_units,currency,status,
			 idempotency_key,payload_hash,payout_destination_id,request_hash)
			VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$7)
			RETURNING `+requestCols,
			tenantID, input.BeneficiaryActorID, input.BeneficiaryActorType, input.AmountMinorUnits, input.Currency,
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
		tenantID, ok := requirePayoutTenant(w, r)
		if !ok {
			return
		}
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
		defer tx.Rollback() //nolint:errcheck
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
		if _, err := tx.ExecContext(r.Context(), `UPDATE wlt_payout_requests SET reconciliation_status='inquiry_pending'
			WHERE tenant_id=$1 AND id=$2 AND status IN ('provider_result_unknown','provider_pending')`, tenantID, payoutID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to claim payout reconciliation")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout reconciliation claim")
			return
		}

		providerReference := strings.TrimSpace(req.ProviderReference)
		if providerReference == "" {
			providerReference = req.ID
		}
		inquiry := provider.PayoutInquiry{Status: "unknown", ProviderReference: providerReference}
		query := url.Values{}
		query.Set("providerReference", providerReference)
		query.Set("payoutRequestId", req.ID)
		query.Set("tenantId", tenantID)
		var providerErr error
		inquiry, providerErr = client.InquirePayout(r.Context(), query)
		if providerErr != nil {
			inquiry.Status = "unknown"
			inquiry.ProviderReference = providerReference
			inquiry.ResponseCode = "PROVIDER_INQUIRY_ERROR"
		}

		finalTx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to finalize payout reconciliation")
			return
		}
		defer finalTx.Rollback() //nolint:errcheck
		current, err := lockedPayout(r.Context(), finalTx, payoutID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to reload payout request")
			return
		}
		if current.ReconciliationStatus != "inquiry_pending" {
			shared.SendError(w, http.StatusConflict, "RECONCILIATION_CONFLICT", "payout reconciliation is no longer pending")
			return
		}
		var reconciliationID string
		resultStatus := strings.ToLower(strings.TrimSpace(inquiry.Status))
		if resultStatus == "" {
			resultStatus = "unknown"
		}
		err = finalTx.QueryRowContext(r.Context(), `INSERT INTO wlt_jrn037_payout_reconciliations
			(tenant_id,payout_request_id,provider_reference,provider_status,provider_response_code,
			 queried_by_operator_id,request_snapshot,response_snapshot)
			VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) RETURNING id`,
			tenantID, payoutID, strings.TrimSpace(inquiry.ProviderReference), resultStatus,
			strings.TrimSpace(inquiry.ResponseCode), input.OperatorID,
			mustJSON(map[string]any{"payoutRequestId": payoutID, "providerReference": providerReference, "tenantId": tenantID}),
			mustJSON(inquiry)).Scan(&reconciliationID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist payout reconciliation evidence")
			return
		}

		finalStatus := current.Status
		reconciliationStatus := "open"
		eventType := "payout.reconciliation_opened"
		action := "payout.reconciliation_opened"
		if resultStatus == "succeeded" || resultStatus == "completed" {
			finalStatus = "completed"
			reconciliationStatus = "resolved"
			eventType = "payout.completed"
			action = "payout.reconciled_completed"
			if _, err := finalTx.ExecContext(r.Context(), `UPDATE wlt_wallets
				SET held_balance_minor_units=held_balance_minor_units-$1,
				    paid_total_minor_units=paid_total_minor_units+$1,updated_at=now()
				WHERE tenant_id=$2 AND actor_id=$3 AND actor_type=$4 AND held_balance_minor_units>=$1`,
				current.AmountMinorUnits, tenantID, current.BeneficiaryActorID, current.BeneficiaryActorType); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to finalize reconciled payout wallet")
				return
			}
		} else if resultStatus == "failed" || resultStatus == "declined" {
			finalStatus = "failed"
			reconciliationStatus = "resolved"
			eventType = "payout.failed"
			action = "payout.reconciled_failed"
			if _, err := finalTx.ExecContext(r.Context(), `UPDATE wlt_wallets
				SET held_balance_minor_units=held_balance_minor_units-$1,
				    available_balance_minor_units=available_balance_minor_units+$1,updated_at=now()
				WHERE tenant_id=$2 AND actor_id=$3 AND actor_type=$4 AND held_balance_minor_units>=$1`,
				current.AmountMinorUnits, tenantID, current.BeneficiaryActorID, current.BeneficiaryActorType); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to release reconciled payout wallet")
				return
			}
		}
		_, err = finalTx.ExecContext(r.Context(), `UPDATE wlt_payout_requests
			SET status=$3,reconciliation_status=$4,reconciled_at=CASE WHEN $4='resolved' THEN now() ELSE reconciled_at END,
			    reconciled_by_operator_id=$5,provider_status=$6,provider_reference=COALESCE(NULLIF($7,''),provider_reference),
			    provider_processed_at=now(),updated_at=now()
			WHERE tenant_id=$1 AND id=$2`, tenantID, payoutID, finalStatus, reconciliationStatus, input.OperatorID, resultStatus, strings.TrimSpace(inquiry.ProviderReference))
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to update reconciled payout request")
			return
		}
		if reconciliationStatus == "resolved" {
			if _, err := finalTx.ExecContext(r.Context(), `UPDATE wlt_jrn037_payout_reconciliations
				SET resolved_at=now() WHERE tenant_id=$1 AND id=$2`, tenantID, reconciliationID); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to close payout reconciliation")
				return
			}
		}
		if err := appendPayoutAudit(r.Context(), finalTx, "payout_reconciliation", payoutID, action, input.OperatorID, "operator", "", correlationID, map[string]any{
			"providerStatus": resultStatus, "providerResponseCode": inquiry.ResponseCode, "reconciliationId": reconciliationID,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout reconciliation")
			return
		}
		if err := enqueuePayoutEvent(r.Context(), finalTx, payoutID, eventType, current.BeneficiaryActorID, current.BeneficiaryActorType, correlationID, map[string]any{
			"status": finalStatus, "reconciliationStatus": reconciliationStatus,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to enqueue reconciled payout notification")
			return
		}
		if err := finalTx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout reconciliation")
			return
		}
		updated, err := GetPayoutRequest(db, payoutID)
		if err != nil || updated == nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read reconciled payout request")
			return
		}
		updated.ReconciliationStatus = reconciliationStatus
		updated.ProviderStatus = resultStatus
		updated.ProviderReference = strings.TrimSpace(inquiry.ProviderReference)
		shared.SendJSON(w, http.StatusOK, map[string]any{"payoutRequest": updated, "reconciliationId": reconciliationID})
	}
}

func HandleListPayoutAuditJRN037(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := requirePayoutTenant(w, r)
		if !ok {
			return
		}
		payoutID := strings.TrimSpace(r.PathValue("payoutId"))
		rows, err := db.QueryContext(r.Context(), `SELECT id,action,actor_id,actor_type,reason,correlation_id,metadata,created_at
			FROM wlt_jrn037_payout_audit_events
			WHERE tenant_id=$1 AND aggregate_type IN ('payout_request','payout_reconciliation') AND aggregate_id=$2
			ORDER BY created_at,id`, tenantID, payoutID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout audit")
			return
		}
		defer rows.Close()
		audit := make([]map[string]any, 0)
		for rows.Next() {
			var id, action, actorID, actorType, reason, correlationID string
			var metadata []byte
			var createdAt any
			if err := rows.Scan(&id, &action, &actorID, &actorType, &reason, &correlationID, &metadata, &createdAt); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to decode payout audit")
				return
			}
			var decoded any
			_ = json.Unmarshal(metadata, &decoded)
			audit = append(audit, map[string]any{"id": id, "action": action, "actorId": actorID, "actorType": actorType, "reason": reason, "correlationId": correlationID, "metadata": decoded, "createdAt": createdAt})
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"auditEvents": audit})
	}
}

func mustJSON(value any) string {
	encoded, _ := json.Marshal(value)
	return string(encoded)
}
