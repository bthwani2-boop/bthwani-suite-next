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

// HandleUpsertPayoutDestinationGoverned is the canonical partner payout
// destination mutation. It binds every retry to the same request fingerprint,
// serializes concurrent writes for one partner/key pair, and returns the
// original masked reference for an identical replay.
func HandleUpsertPayoutDestinationGoverned(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := strings.TrimSpace(r.PathValue("partnerId"))
		idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
		if partnerID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId is required")
			return
		}
		if len(idempotencyKey) < 8 {
			shared.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
			return
		}
		if correlationID == "" {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_ID_REQUIRED", "X-Correlation-ID is required")
			return
		}

		var input UpsertPayoutDestinationInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
			return
		}
		input.PartnerID = partnerID
		normalizePayoutDestinationInput(&input)
		if err := validatePayoutDestinationInput(input); err != nil {
			shared.SendError(w, http.StatusUnprocessableEntity, "PAYOUT_DESTINATION_INVALID", err.Error())
			return
		}

		requestHash := payoutDestinationRequestHash(input)
		key, err := payoutEncryptionKey()
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "payout encryption is not configured")
			return
		}

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to start payout transaction")
			return
		}
		defer tx.Rollback() //nolint:errcheck

		// The advisory transaction lock closes the no-row race before the request
		// reservation exists. The durable primary key remains the final invariant.
		if _, err := tx.ExecContext(r.Context(),
			`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
			partnerID+"\x00"+idempotencyKey,
		); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to lock payout request")
			return
		}

		var previousHash, previousDestinationID string
		err = tx.QueryRowContext(r.Context(), `
			SELECT request_hash, payout_destination_id
			FROM wlt_payout_destination_requests
			WHERE partner_id = $1 AND idempotency_key = $2`,
			partnerID, idempotencyKey,
		).Scan(&previousHash, &previousDestinationID)
		if err == nil {
			if previousHash != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was already used with a different payout request")
				return
			}
			destination, readErr := readPayoutDestinationTx(r, tx, previousDestinationID)
			if readErr != nil {
				shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "stored payout replay target is unavailable")
				return
			}
			if err := tx.Commit(); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to complete payout replay")
				return
			}
			shared.SendJSON(w, http.StatusOK, toRef(destination))
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to inspect payout replay")
			return
		}

		if _, err = tx.ExecContext(r.Context(), `
			UPDATE wlt_payout_destinations
			SET active = false, updated_at = now()
			WHERE partner_id = $1 AND active = true`, partnerID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to retire the previous payout destination")
			return
		}

		maskedAccount := maskLast4(input.AccountNumber)
		maskedIBAN := maskLast4(input.IBAN)
		maskedMobile := maskLast4(input.PayoutMobileNumber)
		rows, err := tx.QueryContext(r.Context(), `
			INSERT INTO wlt_payout_destinations
				(partner_id, beneficiary_name, bank_name, bank_branch,
				 account_number_encrypted, iban_encrypted, payout_mobile_number_encrypted,
				 settlement_preference, bank_account_holder_matches_owner, bank_notes,
				 masked_account_number, masked_iban, masked_mobile_number,
				 active, created_by_actor_id)
			VALUES ($1,$2,$3,$4,
			        pgp_sym_encrypt($5, $6), pgp_sym_encrypt($7, $6), pgp_sym_encrypt($8, $6),
			        $9,$10,$11,$12,$13,$14,true,$15)
			RETURNING `+cols,
			input.PartnerID, input.BeneficiaryName, input.BankName, input.BankBranch,
			input.AccountNumber, key, input.IBAN, input.PayoutMobileNumber,
			input.SettlementPreference, input.BankAccountHolderMatchesOwner, input.BankNotes,
			maskedAccount, maskedIBAN, maskedMobile, input.CreatedByActorID,
		)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to create payout destination")
			return
		}
		if !rows.Next() {
			rows.Close()
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "payout destination was not returned")
			return
		}
		destination, err := scanDestination(rows)
		rows.Close()
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to read payout destination")
			return
		}

		if _, err = tx.ExecContext(r.Context(), `
			INSERT INTO wlt_payout_destination_requests
				(partner_id, idempotency_key, request_hash, payout_destination_id, correlation_id)
			VALUES ($1,$2,$3,$4,$5)`,
			partnerID, idempotencyKey, requestHash, destination.ID, correlationID,
		); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to bind payout request identity")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "failed to commit payout destination")
			return
		}
		shared.SendJSON(w, http.StatusCreated, toRef(destination))
	}
}

func normalizePayoutDestinationInput(input *UpsertPayoutDestinationInput) {
	input.PartnerID = strings.TrimSpace(input.PartnerID)
	input.BeneficiaryName = strings.TrimSpace(input.BeneficiaryName)
	input.BankName = strings.TrimSpace(input.BankName)
	input.BankBranch = strings.TrimSpace(input.BankBranch)
	input.AccountNumber = strings.TrimSpace(input.AccountNumber)
	input.IBAN = strings.TrimSpace(input.IBAN)
	input.PayoutMobileNumber = strings.TrimSpace(input.PayoutMobileNumber)
	input.SettlementPreference = strings.TrimSpace(input.SettlementPreference)
	input.BankNotes = strings.TrimSpace(input.BankNotes)
	input.CreatedByActorID = strings.TrimSpace(input.CreatedByActorID)
}

func validatePayoutDestinationInput(input UpsertPayoutDestinationInput) error {
	if input.PartnerID == "" || input.BeneficiaryName == "" || input.CreatedByActorID == "" {
		return fmt.Errorf("partner, beneficiary, and creating actor are required")
	}
	switch input.SettlementPreference {
	case "bank":
		if input.BankName == "" || input.AccountNumber == "" {
			return fmt.Errorf("bank name and account number are required for bank settlement")
		}
	case "mobile_money":
		if input.PayoutMobileNumber == "" {
			return fmt.Errorf("mobile payout number is required for mobile-money settlement")
		}
	case "manual":
		// Manual settlement still retains a named beneficiary but no account is required.
	default:
		return fmt.Errorf("unsupported settlement preference")
	}
	return nil
}

func payoutDestinationRequestHash(input UpsertPayoutDestinationInput) string {
	canonical := struct {
		PartnerID                     string `json:"partnerId"`
		BeneficiaryName               string `json:"beneficiaryName"`
		BankName                     string `json:"bankName"`
		BankBranch                   string `json:"bankBranch"`
		AccountNumber                string `json:"accountNumber"`
		IBAN                         string `json:"iban"`
		PayoutMobileNumber           string `json:"payoutMobileNumber"`
		SettlementPreference         string `json:"settlementPreference"`
		BankAccountHolderMatchesOwner bool   `json:"bankAccountHolderMatchesOwner"`
		BankNotes                    string `json:"bankNotes"`
		CreatedByActorID             string `json:"createdByActorId"`
	}{
		PartnerID: input.PartnerID, BeneficiaryName: input.BeneficiaryName,
		BankName: input.BankName, BankBranch: input.BankBranch,
		AccountNumber: input.AccountNumber, IBAN: input.IBAN,
		PayoutMobileNumber: input.PayoutMobileNumber,
		SettlementPreference: input.SettlementPreference,
		BankAccountHolderMatchesOwner: input.BankAccountHolderMatchesOwner,
		BankNotes: input.BankNotes, CreatedByActorID: input.CreatedByActorID,
	}
	encoded, _ := json.Marshal(canonical)
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func readPayoutDestinationTx(r *http.Request, tx *sql.Tx, destinationID string) (*PayoutDestination, error) {
	rows, err := tx.QueryContext(r.Context(), `SELECT `+cols+` FROM wlt_payout_destinations WHERE id = $1`, destinationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, sql.ErrNoRows
	}
	return scanDestination(rows)
}
