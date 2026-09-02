package support

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

type PartnerAggregate struct {
	PartnerID            string     `json:"partnerId"`
	OperatorContextID    string     `json:"operatorContextId"`
	ActivationStatus     string     `json:"activationStatus"`
	OnboardingCaseStatus string     `json:"onboardingCaseStatus"`
	Category             string     `json:"category"`
	ArchivedAt           *time.Time `json:"archivedAt"`
	ActiveStoresCount    int        `json:"activeStoresCount"`
	ActiveOrdersCount    int        `json:"activeOrdersCount"`
	ActiveTicketsCount   int        `json:"activeTicketsCount"`
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
		SELECT operator_context_id, activation_status, onboarding_case_status, category, archived_at
		FROM dsh_partners
		WHERE id = $1
	`, partnerID).Scan(&agg.OperatorContextID, &agg.ActivationStatus, &agg.OnboardingCaseStatus, &agg.Category, &agg.ArchivedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return PartnerAggregate{}, ErrNotFound
	} else if err != nil {
		return PartnerAggregate{}, err
	}

	// 2. Fetch Active Stores
	if err := db.QueryRow(`
		SELECT count(*)
		FROM dsh_stores
		WHERE partner_id = $1 AND operator_context_id = $2
		  AND status IN ('ready', 'published', 'paused')`, partnerID, agg.OperatorContextID).Scan(&agg.ActiveStoresCount); err != nil {
		return PartnerAggregate{}, err
	}

	// 3. Fetch Active Orders
	// DSH uses operator_context_id for order isolation.
	if err := db.QueryRow(`
		SELECT count(*)
		FROM dsh_orders o
		JOIN dsh_stores s ON s.id = o.store_id
		WHERE o.operator_context_id = $1 AND s.operator_context_id = $1 AND s.partner_id = $2
		  AND o.status NOT IN ('delivered', 'returned_to_store', 'cancelled')
		  AND o.status NOT LIKE 'cancelled_%'
		  AND o.status NOT LIKE 'failed_%'`, agg.OperatorContextID, partnerID).Scan(&agg.ActiveOrdersCount); err != nil {
		return PartnerAggregate{}, err
	}

	// 4. Fetch Active Tickets
	if err := db.QueryRow(`
		SELECT count(*)
		FROM dsh_support_tickets t
		WHERE t.status NOT IN ('resolved', 'closed')
		  AND (
			(t.reporter_id = $1 AND t.reporter_role = 'partner'
			 AND (t.store_id IS NULL OR EXISTS (
				SELECT 1 FROM dsh_stores s
				WHERE s.id = t.store_id AND s.partner_id = $1 AND s.operator_context_id = $2
			 )))
			OR EXISTS (
				SELECT 1 FROM dsh_stores s
				WHERE s.id = t.store_id AND s.partner_id = $1 AND s.operator_context_id = $2
			)
		  )`, partnerID, agg.OperatorContextID).Scan(&agg.ActiveTicketsCount); err != nil {
		return PartnerAggregate{}, err
	}

	return agg, nil
}
