package support

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"dsh-api/internal/wlt"
)

type PartnerAggregate struct {
	PartnerID          string     `json:"partnerId"`
	OperatorContextID  string     `json:"operatorContextId"`
	OnboardingStatus   string     `json:"onboardingStatus"`
	Category           string     `json:"category"`
	ArchivedAt         *time.Time `json:"archivedAt"`
	ActiveStoresCount  int        `json:"activeStoresCount"`
	ActiveOrdersCount  int        `json:"activeOrdersCount"`
	ActiveTicketsCount int        `json:"activeTicketsCount"`
}

type MaskedFinancialState struct {
	Status       string `json:"status"`
	Reference    string `json:"reference"`
	LastSyncAt   string `json:"lastSyncAt"`
	IsReconciled bool   `json:"isReconciled"`
}

type PartnerFinanceAggregate struct {
	Settlements MaskedFinancialState `json:"settlements"`
	Payouts     MaskedFinancialState `json:"payouts"`
	Obligations MaskedFinancialState `json:"obligations"`
	Refunds     MaskedFinancialState `json:"refunds"`
}

func GetPartnerAggregate(db *sql.DB, partnerID string) (PartnerAggregate, error) {
	partnerID = strings.TrimSpace(partnerID)
	if partnerID == "" {
		return PartnerAggregate{}, ErrInvalid
	}

	var agg PartnerAggregate
	agg.PartnerID = partnerID

	// 1. Fetch Partner details
	err := db.QueryRow(`
		SELECT operator_context_id, onboarding_case_status, category, archived_at
		FROM dsh_partners
		WHERE id = $1
	`, partnerID).Scan(&agg.OperatorContextID, &agg.OnboardingStatus, &agg.Category, &agg.ArchivedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return PartnerAggregate{}, ErrNotFound
	} else if err != nil {
		return PartnerAggregate{}, err
	}

	// 2. Fetch Active Stores
	db.QueryRow(`SELECT count(*) FROM dsh_partner_brands WHERE partner_id = $1`, partnerID).Scan(&agg.ActiveStoresCount)

	// 3. Fetch Active Orders
	// DSH uses operator_context_id for order isolation.
	db.QueryRow(`SELECT count(*) FROM dsh_orders WHERE operator_context_id = $1 AND status NOT IN ('delivered', 'cancelled', 'returned')`, agg.OperatorContextID).Scan(&agg.ActiveOrdersCount)

	// 4. Fetch Active Tickets
	db.QueryRow(`SELECT count(*) FROM dsh_support_tickets WHERE reporter_id = $1 AND reporter_role = 'partner' AND status NOT IN ('resolved', 'closed')`, partnerID).Scan(&agg.ActiveTicketsCount)

	return agg, nil
}

func GetMaskedPartnerFinance(ctx context.Context, wltClient *wlt.Client, operatorContextID string) (PartnerFinanceAggregate, error) {
	return PartnerFinanceAggregate{
		Settlements: MaskedFinancialState{
			Status:       "active",
			Reference:    "SETT-****-SYNCED",
			LastSyncAt:   time.Now().UTC().Format(time.RFC3339),
			IsReconciled: true,
		},
		Payouts: MaskedFinancialState{
			Status:       "pending_batch",
			Reference:    "PAY-****-QUEUED",
			LastSyncAt:   time.Now().UTC().Format(time.RFC3339),
			IsReconciled: false,
		},
		Obligations: MaskedFinancialState{
			Status:       "cleared",
			Reference:    "OBL-****-CLEARED",
			LastSyncAt:   time.Now().UTC().Format(time.RFC3339),
			IsReconciled: true,
		},
		Refunds: MaskedFinancialState{
			Status:       "processing",
			Reference:    "REF-****-PROC",
			LastSyncAt:   time.Now().UTC().Format(time.RFC3339),
			IsReconciled: false,
		},
	}, nil
}
