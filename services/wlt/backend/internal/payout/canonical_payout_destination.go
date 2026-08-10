package payout

import (
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

func canonicalDestinationRequestHash(operatorContextID, actorType, actorID string, input governedDestinationInput) string {
	canonical := struct {
		OperatorContextID    string `json:"operatorContextId"`
		ActorType            string `json:"actorType"`
		ActorID              string `json:"actorId"`
		BeneficiaryName      string `json:"beneficiaryName"`
		DestinationMethod    string `json:"destinationMethod"`
		DestinationReference string `json:"destinationReference"`
		OperatorID           string `json:"operatorId"`
	}{
		OperatorContextID: operatorContextID, ActorType: actorType, ActorID: actorID,
		BeneficiaryName: strings.TrimSpace(input.BeneficiaryName),
		DestinationMethod: strings.TrimSpace(input.DestinationMethod),
		DestinationReference: strings.TrimSpace(input.DestinationReference),
		OperatorID: strings.TrimSpace(input.OperatorID),
	}
	encoded, _ := json.Marshal(canonical)
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func validateCanonicalDestinationInput(input *governedDestinationInput) error {
	input.BeneficiaryName = strings.TrimSpace(input.BeneficiaryName)
	input.DestinationMethod = strings.TrimSpace(input.DestinationMethod)
	input.DestinationReference = strings.TrimSpace(input.DestinationReference)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	if input.DestinationMethod == "" {
		input.DestinationMethod = "bank"
	}
	if input.BeneficiaryName == "" {
		return fmt.Errorf("beneficiaryName is required")
	}
	switch input.DestinationMethod {
	case "bank", "mobile_money":
		if input.DestinationReference == "" {
			return fmt.Errorf("destinationReference is required for non-manual payout methods")
		}
	case "manual":
	default:
		return fmt.Errorf("unsupported destinationMethod")
	}
	return nil
}

func scanCanonicalDestination(tx *sql.Tx, operatorContextID, destinationID string) (*governedDestinationRef, error) {
	return scanGovernedDestination(tx.QueryRow(`SELECT `+governedDestinationReturning+`
		FROM wlt_payout_destinations WHERE operator_context_id=$1 AND id=$2`, operatorContextID, destinationID))
}

// HandleUpsertCanonicalPayoutDestination is the runtime write boundary for
// typed payout destinations. Idempotency identity is OperatorContext-local, request
// fingerprints include the typed owner, and replay can never read another
// OperatorContext's encrypted destination.
func HandleUpsertCanonicalPayoutDestination(db *sql.DB) http.HandlerFunc {
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
		idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		if len(idempotencyKey) < 8 {
			shared.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
			return
		}
		var input governedDestinationInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout destination body is invalid")
			return
		}
		if err := validateCanonicalDestinationInput(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		key, err := payoutEncryptionKey()
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "payout encryption is not configured")
			return
		}
		requestHash := canonicalDestinationRequestHash(operatorContextID, actorType, actorID, input)
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start destination transaction")
			return
		}
		defer tx.Rollback() //nolint:errcheck
		if _, err := tx.ExecContext(r.Context(), `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, operatorContextID+"\x1f"+idempotencyKey); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to lock destination request")
			return
		}

		var previousHash, previousDestinationID string
		err = tx.QueryRowContext(r.Context(), `SELECT request_hash,payout_destination_id
			FROM wlt_payout_destination_requests WHERE operator_context_id=$1 AND idempotency_key=$2`, operatorContextID, idempotencyKey).Scan(&previousHash, &previousDestinationID)
		if err == nil {
			if previousHash != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used with different payout destination inputs")
				return
			}
			destination, readErr := scanCanonicalDestination(tx, operatorContextID, previousDestinationID)
			if readErr != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "stored payout destination replay target is unavailable")
				return
			}
			if err := tx.Commit(); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to complete destination replay")
				return
			}
			shared.SendJSON(w, http.StatusOK, map[string]any{"payoutDestination": destination})
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to inspect destination replay")
			return
		}

		if _, err := tx.ExecContext(r.Context(), `UPDATE wlt_payout_destinations
			SET active=false,updated_at=now()
			WHERE operator_context_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true`, operatorContextID, actorType, actorID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to retire current payout destination")
			return
		}
		operatorID := input.OperatorID
		if operatorID == "" {
			operatorID = actorID
		}
		destination, err := scanGovernedDestination(tx.QueryRowContext(r.Context(), `
			INSERT INTO wlt_payout_destinations
				(operator_context_id,partner_id,owner_actor_id,owner_actor_type,beneficiary_name,
				 destination_reference_encrypted,
				 destination_method,masked_destination_reference,destination_verification_status,active,created_by_actor_id)
			VALUES($1,$2,$2,$3,$4,
				pgp_sym_encrypt($5,$6),
				$7,$8,'unverified',true,$9)
			RETURNING `+governedDestinationReturning,
			operatorContextID, actorID, actorType, input.BeneficiaryName,
			input.DestinationReference, key,
			input.DestinationMethod, maskLast4(input.DestinationReference), operatorID))
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist payout destination")
			return
		}
		if _, err := tx.ExecContext(r.Context(), `INSERT INTO wlt_payout_destination_requests
			(operator_context_id,partner_id,idempotency_key,request_hash,payout_destination_id,correlation_id)
			VALUES($1,$2,$3,$4,$5,$6)`, operatorContextID, actorID, idempotencyKey, requestHash, destination.ID, correlationID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to bind payout destination request identity")
			return
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_destination", destination.ID, "destination.upserted", operatorID, actorType, "", correlationID, map[string]any{
			"ownerActorId": actorID, "ownerActorType": actorType, "destinationMethod": destination.DestinationMethod,
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
