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

func canonicalDestinationRequestHash(tenantID, actorType, actorID string, input governedDestinationInput) string {
	canonical := struct {
		TenantID                      string `json:"tenantId"`
		ActorType                     string `json:"actorType"`
		ActorID                       string `json:"actorId"`
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
	}{
		TenantID: tenantID, ActorType: actorType, ActorID: actorID,
		BeneficiaryName: strings.TrimSpace(input.BeneficiaryName),
		BankName: strings.TrimSpace(input.BankName), BankBranch: strings.TrimSpace(input.BankBranch),
		AccountNumber: strings.TrimSpace(input.AccountNumber), IBAN: strings.TrimSpace(input.IBAN),
		PayoutMobileNumber: strings.TrimSpace(input.PayoutMobileNumber),
		SettlementPreference: strings.TrimSpace(input.SettlementPreference),
		BankAccountHolderMatchesOwner: input.BankAccountHolderMatchesOwner,
		BankNotes: strings.TrimSpace(input.BankNotes), OperatorID: strings.TrimSpace(input.OperatorID),
	}
	encoded, _ := json.Marshal(canonical)
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func validateCanonicalDestinationInput(input *governedDestinationInput) error {
	input.BeneficiaryName = strings.TrimSpace(input.BeneficiaryName)
	input.BankName = strings.TrimSpace(input.BankName)
	input.BankBranch = strings.TrimSpace(input.BankBranch)
	input.AccountNumber = strings.TrimSpace(input.AccountNumber)
	input.IBAN = strings.TrimSpace(input.IBAN)
	input.PayoutMobileNumber = strings.TrimSpace(input.PayoutMobileNumber)
	input.SettlementPreference = strings.TrimSpace(input.SettlementPreference)
	input.BankNotes = strings.TrimSpace(input.BankNotes)
	input.OperatorID = strings.TrimSpace(input.OperatorID)
	if input.SettlementPreference == "" {
		input.SettlementPreference = "bank"
	}
	if input.BeneficiaryName == "" {
		return fmt.Errorf("beneficiaryName is required")
	}
	switch input.SettlementPreference {
	case "bank":
		if input.AccountNumber == "" && input.IBAN == "" {
			return fmt.Errorf("bank payout requires accountNumber or iban")
		}
	case "mobile_money":
		if input.PayoutMobileNumber == "" {
			return fmt.Errorf("mobile-money payout requires payoutMobileNumber")
		}
	case "manual":
	default:
		return fmt.Errorf("unsupported settlementPreference")
	}
	return nil
}

func scanCanonicalDestination(tx *sql.Tx, tenantID, destinationID string) (*governedDestinationRef, error) {
	return scanGovernedDestination(tx.QueryRow(`SELECT `+governedDestinationReturning+`
		FROM wlt_payout_destinations WHERE tenant_id=$1 AND id=$2`, tenantID, destinationID))
}

// HandleUpsertCanonicalPayoutDestination is the runtime write boundary for
// typed payout destinations. Idempotency identity is tenant-local, request
// fingerprints include the typed owner, and replay can never read another
// tenant's encrypted destination.
func HandleUpsertCanonicalPayoutDestination(db *sql.DB) http.HandlerFunc {
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
		requestHash := canonicalDestinationRequestHash(tenantID, actorType, actorID, input)
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start destination transaction")
			return
		}
		defer tx.Rollback() //nolint:errcheck
		if _, err := tx.ExecContext(r.Context(), `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, tenantID+"\x1f"+idempotencyKey); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to lock destination request")
			return
		}

		var previousHash, previousDestinationID string
		err = tx.QueryRowContext(r.Context(), `SELECT request_hash,payout_destination_id
			FROM wlt_payout_destination_requests WHERE tenant_id=$1 AND idempotency_key=$2`, tenantID, idempotencyKey).Scan(&previousHash, &previousDestinationID)
		if err == nil {
			if previousHash != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used with different payout destination inputs")
				return
			}
			destination, readErr := scanCanonicalDestination(tx, tenantID, previousDestinationID)
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
			WHERE tenant_id=$1 AND owner_actor_type=$2 AND owner_actor_id=$3 AND active=true`, tenantID, actorType, actorID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to retire current payout destination")
			return
		}
		operatorID := input.OperatorID
		if operatorID == "" {
			operatorID = actorID
		}
		destination, err := scanGovernedDestination(tx.QueryRowContext(r.Context(), `
			INSERT INTO wlt_payout_destinations
				(tenant_id,partner_id,owner_actor_id,owner_actor_type,beneficiary_name,bank_name,bank_branch,
				 account_number_encrypted,iban_encrypted,payout_mobile_number_encrypted,
				 settlement_preference,bank_account_holder_matches_owner,bank_notes,
				 masked_account_number,masked_iban,masked_mobile_number,active,created_by_actor_id)
			VALUES($1,$2,$2,$3,$4,$5,$6,pgp_sym_encrypt($7,$8),pgp_sym_encrypt($9,$8),pgp_sym_encrypt($10,$8),
				$11,$12,$13,$14,$15,$16,true,$17)
			RETURNING `+governedDestinationReturning,
			tenantID, actorID, actorType, input.BeneficiaryName, input.BankName, input.BankBranch,
			input.AccountNumber, key, input.IBAN, input.PayoutMobileNumber, input.SettlementPreference,
			input.BankAccountHolderMatchesOwner, input.BankNotes, maskLast4(input.AccountNumber),
			maskLast4(input.IBAN), maskLast4(input.PayoutMobileNumber), operatorID))
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist payout destination")
			return
		}
		if _, err := tx.ExecContext(r.Context(), `INSERT INTO wlt_payout_destination_requests
			(tenant_id,partner_id,idempotency_key,request_hash,payout_destination_id,correlation_id)
			VALUES($1,$2,$3,$4,$5,$6)`, tenantID, actorID, idempotencyKey, requestHash, destination.ID, correlationID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to bind payout destination request identity")
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
