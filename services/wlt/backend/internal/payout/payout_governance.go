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
	"strings"

	"wlt-api/internal/shared"
)

var governedPayoutActorTypes = map[string]struct{}{
	"partner": {},
	"captain": {},
	"field":   {},
}

type governedDestinationRef struct {
	ID                            string `json:"id"`
	OwnerActorID                  string `json:"ownerActorId"`
	OwnerActorType                string `json:"ownerActorType"`
	OfficialWalletProviderKey     string `json:"officialWalletProviderKey"`
	DestinationVersion            int    `json:"destinationVersion"`
	DestinationMethod             string `json:"destinationMethod"`
	MaskedDestinationReference    string `json:"maskedDestinationReference"`
	DestinationVerificationStatus string `json:"destinationVerificationStatus"`
	BeneficiaryName               string `json:"beneficiaryName"`
	Active                        bool   `json:"active"`
	UpdatedAt                     string `json:"updatedAt"`
}

type governedCreatePayoutInput struct {
	BeneficiaryActorID   string `json:"beneficiaryActorId"`
	BeneficiaryActorType string `json:"beneficiaryActorType"`
	PayoutDestinationID  string `json:"payoutDestinationId"`
	AmountMinorUnits     int64  `json:"amountMinorUnits"`
	Currency             string `json:"currency"`
	IdempotencyKey       string `json:"idempotencyKey"`
	OperatorID           string `json:"operatorId"`
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

func governedPayoutHash(operatorContextID string, input governedCreatePayoutInput) string {
	sum := sha256.Sum256([]byte(strings.Join([]string{
		strings.TrimSpace(operatorContextID),
		input.BeneficiaryActorType,
		input.BeneficiaryActorID,
		input.PayoutDestinationID,
		fmt.Sprintf("%d", input.AmountMinorUnits),
		input.Currency,
	}, "|")))
	return hex.EncodeToString(sum[:])
}

func appendPayoutAudit(ctx context.Context, tx *sql.Tx, aggregateType, aggregateID, action, actorID, actorType, reason, correlationID string, metadata any) error {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return err
	}
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO wlt_payout_audit_events
			(operator_context_id, aggregate_type, aggregate_id, action, actor_id, actor_type, reason, correlation_id, metadata)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
		operatorContextID, aggregateType, aggregateID, action, actorID, actorType, reason, correlationID, string(encoded))
	return err
}

// scanGovernedDestinationInto reads a destination projection plus its material
// identity hash. The hash never leaves the server: it decides whether an
// incoming upsert is the same destination or a new version, and exposing it
// would leak a checksum over the plaintext reference.
func scanGovernedDestinationInto(row *sql.Row, destination *governedDestinationRef, materialHash *string) error {
	var providerKey sql.NullString
	var updatedAt string
	err := row.Scan(
		&destination.ID,
		&destination.OwnerActorID,
		&destination.OwnerActorType,
		&providerKey,
		&destination.DestinationVersion,
		&destination.DestinationMethod,
		&destination.MaskedDestinationReference,
		&destination.DestinationVerificationStatus,
		&destination.BeneficiaryName,
		&destination.Active,
		&updatedAt,
		materialHash,
	)
	destination.OfficialWalletProviderKey = providerKey.String
	destination.UpdatedAt = updatedAt
	return err
}

func scanGovernedDestination(row *sql.Row) (*governedDestinationRef, error) {
	var destination governedDestinationRef
	var materialHash string
	err := scanGovernedDestinationInto(row, &destination, &materialHash)
	return &destination, err
}

const governedDestinationReturning = `id, owner_actor_id, owner_actor_type, official_wallet_provider_key,
	destination_version, destination_method,
	masked_destination_reference, destination_verification_status, beneficiary_name, active, updated_at::text`

func requirePayoutOperatorContext(w http.ResponseWriter, r *http.Request) (string, bool) {
	operatorContextID, err := shared.RequireOperatorContext(r.Context())
	if err != nil {
		shared.SendError(w, http.StatusBadRequest, "OperatorContext_REQUIRED", err.Error())
		return "", false
	}
	return operatorContextID, true
}

func HandleGetCanonicalPayoutDestination(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := requirePayoutOperatorContext(w, r)
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
			WHERE operator_context_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true
			ORDER BY created_at DESC LIMIT 1`, operatorContextID, actorType, actorID)
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

func HandleDeactivateCanonicalPayoutDestination(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := requirePayoutOperatorContext(w, r)
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
			UPDATE wlt_payout_destinations SET active=false,superseded_at=now(),updated_at=now()
			WHERE operator_context_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true
			RETURNING id`, operatorContextID, actorType, actorID).Scan(&destinationID)
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

func HandleCreateGovernedPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := requirePayoutOperatorContext(w, r)
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
		requestHash := governedPayoutHash(operatorContextID, input)
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout transaction")
			return
		}
		defer tx.Rollback() //nolint:errcheck

		var existingHash sql.NullString
		var existingID string
		err = tx.QueryRowContext(r.Context(), `SELECT request_hash,id FROM wlt_payout_requests
			WHERE operator_context_id=$1 AND idempotency_key=$2 LIMIT 1`, operatorContextID, input.IdempotencyKey).Scan(&existingHash, &existingID)
		if err == nil {
			if !existingHash.Valid || existingHash.String != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used with a different payout intent")
				return
			}
			rows, queryErr := tx.QueryContext(r.Context(), "SELECT "+requestCols+" FROM wlt_payout_requests WHERE operator_context_id=$1 AND id=$2", operatorContextID, existingID)
			if queryErr != nil || !rows.Next() {
				if rows != nil {
					rows.Close()
				}
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

		// A payout may only be requested against the beneficiary's active,
		// verified official-wallet destination. Approval re-checks this, but
		// holding a beneficiary's funds against a destination that can never
		// be approved is itself a defect, so the request fails here first.
		var active bool
		var verificationStatus string
		err = tx.QueryRowContext(r.Context(), `SELECT active, destination_verification_status FROM wlt_payout_destinations
			WHERE operator_context_id=$1 AND id=$2 AND owner_actor_type=$3 AND owner_actor_id=$4 FOR UPDATE`,
			operatorContextID, input.PayoutDestinationID, input.BeneficiaryActorType, input.BeneficiaryActorID).Scan(&active, &verificationStatus)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusForbidden, "PAYOUT_DESTINATION_FORBIDDEN", "payout destination is not owned by the beneficiary in the trusted OperatorContext")
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
		if verificationStatus != verificationVerified {
			shared.SendError(w, http.StatusConflict, "PAYOUT_DESTINATION_UNVERIFIED", "payout destination must be a verified official wallet before funds can be requested")
			return
		}
		var available, settled, paid, held int64
		err = tx.QueryRowContext(r.Context(), `SELECT available_balance_minor_units, settled_total_minor_units, paid_total_minor_units, held_balance_minor_units FROM wlt_wallets
			WHERE operator_context_id=$1 AND actor_id=$2 AND actor_type=$3 FOR UPDATE`, operatorContextID, input.BeneficiaryActorID, input.BeneficiaryActorType).Scan(&available, &settled, &paid, &held)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusBadRequest, "NO_WALLET", "wallet not found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read wallet")
			return
		}
		withdrawable := settled - paid - held
		if available < input.AmountMinorUnits || withdrawable < input.AmountMinorUnits {
			shared.SendError(w, http.StatusConflict, "INSUFFICIENT_FUNDS", "insufficient withdrawable balance")
			return
		}
		rows, err := tx.QueryContext(r.Context(), `INSERT INTO wlt_payout_requests
			(operator_context_id,beneficiary_actor_id,beneficiary_actor_type,amount_minor_units,currency,status,
			 idempotency_key,payload_hash,payout_destination_id,request_hash,operator_id)
			VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$7,NULLIF($9,''))
			RETURNING `+requestCols,
			operatorContextID, input.BeneficiaryActorID, input.BeneficiaryActorType, input.AmountMinorUnits, input.Currency,
			input.IdempotencyKey, requestHash, input.PayoutDestinationID, strings.TrimSpace(input.OperatorID))
		if err != nil || !rows.Next() {
			if rows != nil {
				rows.Close()
			}
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
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout request")
			return
		}
		shared.SendJSON(w, http.StatusCreated, PayoutRequestResponse{PayoutRequest: created})
	}
}

func HandleListPayoutAudit(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := requirePayoutOperatorContext(w, r)
		if !ok {
			return
		}
		payoutID := strings.TrimSpace(r.PathValue("payoutId"))
		rows, err := db.QueryContext(r.Context(), `SELECT id,action,actor_id,actor_type,reason,correlation_id,metadata,created_at
			FROM wlt_payout_audit_events
			WHERE operator_context_id=$1 AND aggregate_type IN ('payout_request','payout_reconciliation') AND aggregate_id=$2
			ORDER BY created_at,id`, operatorContextID, payoutID)
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
