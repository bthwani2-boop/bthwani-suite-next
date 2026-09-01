package support

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"
)

// PartnerOperationalStore is the canonical store readback used by support.
// Publication and blocking data come from dsh_partner_store_readiness_v; this
// package does not recreate the publication decision from individual fields.
type PartnerOperationalStore struct {
	ID                   string   `json:"id"`
	DisplayName          string   `json:"displayName"`
	Status               string   `json:"status"`
	IsVisible            bool     `json:"isVisible"`
	ServiceabilityStatus string   `json:"serviceabilityStatus"`
	PartnerReadiness     string   `json:"partnerReadiness"`
	CatalogApproval      string   `json:"catalogApprovalStatus"`
	MarketingVisibility  string   `json:"marketingVisibility"`
	PublicationDecision  string   `json:"publicationDecision"`
	BlockingReasonCodes  []string `json:"blockingReasonCodes"`
}

// PartnerOperationalOrder intentionally excludes client and payment details.
// Support receives the order identity and lifecycle state, then uses the
// canonical order routes for any separately authorized drill-down.
type PartnerOperationalOrder struct {
	ID              string    `json:"id"`
	StoreID         string    `json:"storeId"`
	Status          string    `json:"status"`
	FulfillmentMode string    `json:"fulfillmentMode"`
	Version         int       `json:"version"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// PartnerOperationalTicket is a support ticket summary. Message bodies and
// reporter identities remain behind the ticket/message authorization paths.
type PartnerOperationalTicket struct {
	ID         string    `json:"id"`
	StoreID    string    `json:"storeId"`
	OrderID    string    `json:"orderId"`
	Category   string    `json:"category"`
	Priority   string    `json:"priority"`
	Status     string    `json:"status"`
	AssignedTo string    `json:"assignedTo"`
	Version    int       `json:"version"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type PartnerOperationsReadModel struct {
	PartnerID            string                     `json:"partnerId"`
	OperatorContextID    string                     `json:"operatorContextId"`
	ActivationStatus     string                     `json:"activationStatus"`
	OnboardingCaseStatus string                     `json:"onboardingCaseStatus"`
	Category             string                     `json:"category"`
	ArchivedAt           *time.Time                 `json:"archivedAt"`
	Stores               []PartnerOperationalStore  `json:"stores"`
	Orders               []PartnerOperationalOrder  `json:"orders"`
	Tickets              []PartnerOperationalTicket `json:"tickets"`
	GeneratedAt          time.Time                  `json:"generatedAt"`
}

func GetPartnerOperationsReadModel(db *sql.DB, partnerID string) (PartnerOperationsReadModel, error) {
	partnerID = strings.TrimSpace(partnerID)
	if partnerID == "" {
		return PartnerOperationsReadModel{}, ErrInvalid
	}

	model := PartnerOperationsReadModel{
		PartnerID:   partnerID,
		Stores:      make([]PartnerOperationalStore, 0),
		Orders:      make([]PartnerOperationalOrder, 0),
		Tickets:     make([]PartnerOperationalTicket, 0),
		GeneratedAt: time.Now().UTC(),
	}
	if err := db.QueryRow(`
		SELECT operator_context_id, activation_status, onboarding_case_status, category, archived_at
		FROM dsh_partners
		WHERE id = $1`, partnerID).Scan(
		&model.OperatorContextID,
		&model.ActivationStatus,
		&model.OnboardingCaseStatus,
		&model.Category,
		&model.ArchivedAt,
	); errors.Is(err, sql.ErrNoRows) {
		return PartnerOperationsReadModel{}, ErrNotFound
	} else if err != nil {
		return PartnerOperationsReadModel{}, err
	}

	storeRows, err := db.Query(`
		SELECT readiness.store_id, readiness.display_name, readiness.status,
		       s.is_visible, s.serviceability_status, s.partner_readiness,
		       s.catalog_approval_status, s.marketing_visibility,
		       readiness.publication_decision,
		       COALESCE(readiness.blocking_reason_codes, ARRAY[]::text[])
		FROM dsh_partner_store_readiness_v readiness
		JOIN dsh_stores s
		  ON s.id = readiness.store_id
		 AND s.partner_id = readiness.partner_id
		 AND s.operator_context_id = readiness.operator_context_id
		WHERE readiness.partner_id = $1 AND readiness.operator_context_id = $2
		ORDER BY readiness.display_name ASC, readiness.store_id ASC`, partnerID, model.OperatorContextID)
	if err != nil {
		return PartnerOperationsReadModel{}, err
	}
	for storeRows.Next() {
		var item PartnerOperationalStore
		var blocking pq.StringArray
		if err := storeRows.Scan(
			&item.ID, &item.DisplayName, &item.Status, &item.IsVisible,
			&item.ServiceabilityStatus, &item.PartnerReadiness, &item.CatalogApproval,
			&item.MarketingVisibility, &item.PublicationDecision, &blocking,
		); err != nil {
			_ = storeRows.Close()
			return PartnerOperationsReadModel{}, err
		}
		item.BlockingReasonCodes = []string(blocking)
		model.Stores = append(model.Stores, item)
	}
	if err := storeRows.Err(); err != nil {
		_ = storeRows.Close()
		return PartnerOperationsReadModel{}, err
	}
	_ = storeRows.Close()

	orderRows, err := db.Query(`
		SELECT o.id::text, o.store_id, o.status, o.fulfillment_mode, o.version,
		       o.created_at, o.updated_at
		FROM dsh_orders o
		JOIN dsh_stores s ON s.id = o.store_id
		WHERE o.operator_context_id = $1
		  AND s.operator_context_id = $1
		  AND s.partner_id = $2
		ORDER BY o.updated_at DESC, o.id DESC
		LIMIT 100`, model.OperatorContextID, partnerID)
	if err != nil {
		return PartnerOperationsReadModel{}, err
	}
	for orderRows.Next() {
		var item PartnerOperationalOrder
		if err := orderRows.Scan(&item.ID, &item.StoreID, &item.Status, &item.FulfillmentMode, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
			_ = orderRows.Close()
			return PartnerOperationsReadModel{}, err
		}
		model.Orders = append(model.Orders, item)
	}
	if err := orderRows.Err(); err != nil {
		_ = orderRows.Close()
		return PartnerOperationsReadModel{}, err
	}
	_ = orderRows.Close()

	ticketRows, err := db.Query(`
		SELECT t.id::text, COALESCE(t.store_id, ''), COALESCE(t.order_id::text, ''),
		       t.category, t.priority, t.status, COALESCE(t.assigned_to, ''),
		       t.version, t.created_at, t.updated_at
		FROM dsh_support_tickets t
		LEFT JOIN dsh_orders o
		  ON o.id = t.order_id
		 AND o.operator_context_id = $2
		WHERE (
			(t.reporter_id = $1 AND t.reporter_role = 'partner'
			 AND (t.store_id IS NULL OR EXISTS (
				SELECT 1 FROM dsh_stores s
				WHERE s.id = t.store_id AND s.partner_id = $1 AND s.operator_context_id = $2
			 ))
			 AND (t.order_id IS NULL OR (o.id IS NOT NULL AND EXISTS (
				SELECT 1 FROM dsh_stores s
				WHERE s.id = o.store_id AND s.partner_id = $1 AND s.operator_context_id = $2
			 ))))
			OR EXISTS (
				SELECT 1 FROM dsh_stores s
				WHERE s.id = t.store_id AND s.partner_id = $1 AND s.operator_context_id = $2
			)
		)
		ORDER BY t.updated_at DESC, t.id DESC
		LIMIT 100`, partnerID, model.OperatorContextID)
	if err != nil {
		return PartnerOperationsReadModel{}, err
	}
	for ticketRows.Next() {
		var item PartnerOperationalTicket
		if err := ticketRows.Scan(&item.ID, &item.StoreID, &item.OrderID, &item.Category, &item.Priority, &item.Status, &item.AssignedTo, &item.Version, &item.CreatedAt, &item.UpdatedAt); err != nil {
			_ = ticketRows.Close()
			return PartnerOperationsReadModel{}, err
		}
		model.Tickets = append(model.Tickets, item)
	}
	if err := ticketRows.Err(); err != nil {
		_ = ticketRows.Close()
		return PartnerOperationsReadModel{}, err
	}
	_ = ticketRows.Close()

	return model, nil
}
