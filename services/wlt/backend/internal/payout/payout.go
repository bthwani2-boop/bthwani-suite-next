package payout

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// ─── Model ─────────────────────────────────────────────────────────────────

type PayoutDestination struct {
	ID                           string `json:"id"`
	PartnerID                    string `json:"partnerId"`
	BeneficiaryName              string `json:"beneficiaryName"`
	BankName                     string `json:"bankName"`
	BankBranch                   string `json:"bankBranch"`
	AccountNumber                string `json:"accountNumber"`
	IBAN                         string `json:"iban"`
	PayoutMobileNumber           string `json:"payoutMobileNumber"`
	SettlementPreference         string `json:"settlementPreference"`
	BankAccountHolderMatchesOwner bool   `json:"bankAccountHolderMatchesOwner"`
	BankNotes                    string `json:"bankNotes"`
	// Masked fields returned to DSH for display — real values never leave WLT.
	MaskedAccountNumber  string `json:"maskedAccountNumber"`
	MaskedIBAN           string `json:"maskedIban"`
	MaskedMobileNumber   string `json:"maskedMobileNumber"`
	Active               bool   `json:"active"`
	CreatedByActorID     string `json:"createdByActorId"`
	CreatedAt            string `json:"createdAt"`
	UpdatedAt            string `json:"updatedAt"`
}

// PayoutDestinationRef is returned to DSH — contains the reference ID and
// masked display strings only; no raw financial data leaves WLT.
type PayoutDestinationRef struct {
	ID                   string `json:"id"`
	PartnerID            string `json:"partnerId"`
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

type UpsertPayoutDestinationInput struct {
	PartnerID                    string `json:"partnerId"`
	BeneficiaryName              string `json:"beneficiaryName"`
	BankName                     string `json:"bankName"`
	BankBranch                   string `json:"bankBranch"`
	AccountNumber                string `json:"accountNumber"`
	IBAN                         string `json:"iban"`
	PayoutMobileNumber           string `json:"payoutMobileNumber"`
	SettlementPreference         string `json:"settlementPreference"`
	BankAccountHolderMatchesOwner bool   `json:"bankAccountHolderMatchesOwner"`
	BankNotes                    string `json:"bankNotes"`
	CreatedByActorID             string `json:"createdByActorId"`
}

// ─── Masking helpers ────────────────────────────────────────────────────────

// maskLast4 returns a string with all but the last 4 characters replaced with
// asterisks, so raw financial identifiers are never passed back to DSH.
func maskLast4(s string) string {
	s = strings.TrimSpace(s)
	if len(s) <= 4 {
		return strings.Repeat("*", len(s))
	}
	return strings.Repeat("*", len(s)-4) + s[len(s)-4:]
}

// ─── Repository helpers ─────────────────────────────────────────────────────

const cols = `id, partner_id, beneficiary_name, bank_name, bank_branch,
	account_number, iban, payout_mobile_number, settlement_preference,
	bank_account_holder_matches_owner, bank_notes,
	masked_account_number, masked_iban, masked_mobile_number,
	active, created_by_actor_id, created_at, updated_at`

func scanDestination(rows *sql.Rows) (*PayoutDestination, error) {
	var d PayoutDestination
	err := rows.Scan(
		&d.ID, &d.PartnerID, &d.BeneficiaryName, &d.BankName, &d.BankBranch,
		&d.AccountNumber, &d.IBAN, &d.PayoutMobileNumber, &d.SettlementPreference,
		&d.BankAccountHolderMatchesOwner, &d.BankNotes,
		&d.MaskedAccountNumber, &d.MaskedIBAN, &d.MaskedMobileNumber,
		&d.Active, &d.CreatedByActorID, &d.CreatedAt, &d.UpdatedAt,
	)
	return &d, err
}

func toRef(d *PayoutDestination) PayoutDestinationRef {
	return PayoutDestinationRef{
		ID:                   d.ID,
		PartnerID:            d.PartnerID,
		SettlementPreference: d.SettlementPreference,
		MaskedAccountNumber:  d.MaskedAccountNumber,
		MaskedIBAN:           d.MaskedIBAN,
		MaskedMobileNumber:   d.MaskedMobileNumber,
		BeneficiaryName:      d.BeneficiaryName,
		BankName:             d.BankName,
		BankBranch:           d.BankBranch,
		Active:               d.Active,
		UpdatedAt:            d.UpdatedAt,
	}
}

// ─── Handlers ──────────────────────────────────────────────────────────────

// HandleUpsertPayoutDestination creates or replaces the active payout
// destination for a partner. Only DSH is an allowed caller (service-token
// guard applied in server.go). The full account numbers are stored inside WLT
// and masked display values are written alongside for DSH to read back.
func HandleUpsertPayoutDestination(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		if strings.TrimSpace(partnerID) == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId is required")
			return
		}

		var input UpsertPayoutDestinationInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
			return
		}
		input.PartnerID = partnerID

		if input.SettlementPreference == "" {
			input.SettlementPreference = "bank"
		}

		maskedAccount := maskLast4(input.AccountNumber)
		maskedIBAN := maskLast4(input.IBAN)
		maskedMobile := maskLast4(input.PayoutMobileNumber)

		// Deactivate existing active destination for this partner first.
		_, err := db.ExecContext(r.Context(), `
			UPDATE wlt_payout_destinations
			SET active = false, updated_at = now()
			WHERE partner_id = $1 AND active = true`, partnerID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "could not update payout destination")
			return
		}

		row, err := db.QueryContext(r.Context(), `
			INSERT INTO wlt_payout_destinations
				(partner_id, beneficiary_name, bank_name, bank_branch, account_number,
				 iban, payout_mobile_number, settlement_preference,
				 bank_account_holder_matches_owner, bank_notes,
				 masked_account_number, masked_iban, masked_mobile_number,
				 active, created_by_actor_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14)
			RETURNING `+cols,
			input.PartnerID, input.BeneficiaryName, input.BankName, input.BankBranch,
			input.AccountNumber, input.IBAN, input.PayoutMobileNumber, input.SettlementPreference,
			input.BankAccountHolderMatchesOwner, input.BankNotes,
			maskedAccount, maskedIBAN, maskedMobile,
			input.CreatedByActorID,
		)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "could not create payout destination")
			return
		}
		defer row.Close()
		if !row.Next() {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "payout destination not returned")
			return
		}
		dest, err := scanDestination(row)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "could not scan payout destination")
			return
		}
		shared.SendJSON(w, http.StatusCreated, toRef(dest))
	}
}

// HandleGetPayoutDestination returns the masked ref for the active payout
// destination of a partner. DSH calls this to display masked bank info.
func HandleGetPayoutDestination(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		if strings.TrimSpace(partnerID) == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId is required")
			return
		}

		rows, err := db.QueryContext(r.Context(), `
			SELECT `+cols+`
			FROM wlt_payout_destinations
			WHERE partner_id = $1 AND active = true
			ORDER BY created_at DESC
			LIMIT 1`, partnerID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "could not query payout destination")
			return
		}
		defer rows.Close()
		if !rows.Next() {
			shared.SendError(w, http.StatusNotFound, "PAYOUT_DESTINATION_NOT_FOUND", "no active payout destination found")
			return
		}
		dest, err := scanDestination(rows)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "could not scan payout destination")
			return
		}
		shared.SendJSON(w, http.StatusOK, toRef(dest))
	}
}

// HandleDeactivatePayoutDestination marks the active payout destination for a
// partner as inactive. Used when a partner is deactivated.
func HandleDeactivatePayoutDestination(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := r.PathValue("partnerId")
		if strings.TrimSpace(partnerID) == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId is required")
			return
		}

		_, err := db.ExecContext(r.Context(), `
			UPDATE wlt_payout_destinations
			SET active = false, updated_at = now()
			WHERE partner_id = $1 AND active = true`, partnerID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "could not deactivate payout destination")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
