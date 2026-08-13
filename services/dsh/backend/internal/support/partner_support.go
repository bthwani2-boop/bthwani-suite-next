package support

import (
	"database/sql"
	"errors"
	"strings"
	"time"
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
	if err := db.QueryRow(`SELECT count(*) FROM dsh_partner_brands WHERE partner_id = $1 AND status = 'active'`, partnerID).Scan(&agg.ActiveStoresCount); err != nil {
		return PartnerAggregate{}, err
	}

	// 3. Fetch Active Orders
	// DSH uses operator_context_id for order isolation.
	if err := db.QueryRow(`SELECT count(*) FROM dsh_orders WHERE operator_context_id = $1 AND status NOT IN ('delivered', 'cancelled', 'returned')`, agg.OperatorContextID).Scan(&agg.ActiveOrdersCount); err != nil {
		return PartnerAggregate{}, err
	}

	// 4. Fetch Active Tickets
	if err := db.QueryRow(`SELECT count(*) FROM dsh_support_tickets WHERE reporter_id = $1 AND reporter_role = 'partner' AND status NOT IN ('resolved', 'closed')`, partnerID).Scan(&agg.ActiveTicketsCount); err != nil {
		return PartnerAggregate{}, err
	}

	return agg, nil
}
