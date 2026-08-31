package partner

import (
	"database/sql"
	"errors"
	"net/http"
	"time"

	"dsh-api/internal/store"
	"github.com/lib/pq"
)

type StorePublicationReadiness struct {
	StoreID             string   `json:"storeId"`
	DisplayName         string   `json:"displayName"`
	PublicationDecision string   `json:"publicationDecision"`
	BlockingReasons     []string `json:"blockingReasons"`
	IsClientVisible     bool     `json:"isClientVisible"`
}

type PartnerStoreReadinessSummary struct {
	TotalStores         int `json:"totalStores"`
	ReadyStores         int `json:"readyStores"`
	BlockedStores       int `json:"blockedStores"`
	ClientVisibleStores int `json:"clientVisibleStores"`
}

type AggregatedPartnerReadiness struct {
	PartnerID                      string                       `json:"partnerId"`
	CanActivate                    bool                         `json:"canActivate"`
	CanActivatePartner             bool                         `json:"canActivatePartner"`
	IntakeComplete                 bool                         `json:"intakeComplete"`
	PublicationDecision            string                       `json:"publicationDecision"`
	BlockingReasons                []string                     `json:"blockingReasons"`
	BlockedReason                  string                       `json:"blockedReason,omitempty"`
	PartnerActivationBlockedReason string                       `json:"partnerActivationBlockedReason,omitempty"`
	Checklist                      []ReadinessItem              `json:"checklist"`
	StoreSummary                   PartnerStoreReadinessSummary `json:"storeSummary"`
	Stores                         []StorePublicationReadiness  `json:"stores"`
	GeneratedAt                    time.Time                    `json:"generatedAt"`
}

// LoadAggregatedPartnerReadiness computes partner activation separately from
// publication readiness for every linked store. No first-store shortcut is
// permitted for multi-branch legal entities.
func LoadAggregatedPartnerReadiness(db *sql.DB, partnerID string) (AggregatedPartnerReadiness, error) {
	partnerState, err := GetPartner(db, partnerID)
	if err != nil {
		return AggregatedPartnerReadiness{}, err
	}
	documentCount, approvedDocumentCount, err := CountApprovedDocuments(db, partnerID)
	if err != nil {
		return AggregatedPartnerReadiness{}, err
	}

	rows, err := db.Query(`
		SELECT store_id, display_name, publication_decision,
		       blocking_reason_codes
		FROM dsh_partner_store_readiness_v
		WHERE partner_id = $1
		ORDER BY display_name ASC, store_id ASC`, partnerID)
	if err != nil {
		return AggregatedPartnerReadiness{}, err
	}
	defer func() { _ = rows.Close() }()

	stores := make([]StorePublicationReadiness, 0)
	readyCount := 0
	visibleCount := 0
	for rows.Next() {
		var item StorePublicationReadiness
		var publicationDecision string
		var blockingReasons []string
		if err := rows.Scan(
			&item.StoreID,
			&item.DisplayName,
			&publicationDecision,
			pq.Array(&blockingReasons),
		); err != nil {
			return AggregatedPartnerReadiness{}, err
		}
		item.PublicationDecision = publicationDecision
		item.BlockingReasons = blockingReasons
		item.IsClientVisible = publicationDecision == "PUBLISHED"
		if item.PublicationDecision == "PUBLISHED" {
			readyCount++
		}
		if item.IsClientVisible {
			visibleCount++
		}
		stores = append(stores, item)
	}
	if err := rows.Err(); err != nil {
		return AggregatedPartnerReadiness{}, err
	}

	hasStore := len(stores) > 0
	allStoreGatesPassed := hasStore && readyCount == len(stores)
	aggregatePublicationDecision := store.PublicationBlocked
	aggregateBlockingReasons := []string{"STORE_NOT_LINKED"}
	if hasStore {
		aggregateBlockingReasons = uniqueBlockingReasons(stores)
		if allStoreGatesPassed {
			aggregatePublicationDecision = store.PublicationPublished
		}
	}
	base := ComputeReadiness(
		partnerState,
		documentCount,
		approvedDocumentCount,
		hasStore,
		aggregatePublicationDecision,
		aggregateBlockingReasons,
	)
	return AggregatedPartnerReadiness{
		PartnerID:                      base.PartnerID,
		CanActivate:                    base.CanActivate,
		CanActivatePartner:             base.CanActivatePartner,
		IntakeComplete:                 base.IntakeComplete,
		PublicationDecision:            string(base.PublicationDecision),
		BlockingReasons:                base.BlockingReasons,
		BlockedReason:                  base.BlockedReason,
		PartnerActivationBlockedReason: base.PartnerActivationBlockedReason,
		Checklist:                      base.Checklist,
		StoreSummary: PartnerStoreReadinessSummary{
			TotalStores:         len(stores),
			ReadyStores:         readyCount,
			BlockedStores:       len(stores) - readyCount,
			ClientVisibleStores: visibleCount,
		},
		Stores:      stores,
		GeneratedAt: time.Now().UTC(),
	}, nil
}

func uniqueBlockingReasons(stores []StorePublicationReadiness) []string {
	seen := make(map[string]struct{})
	result := make([]string, 0)
	for _, item := range stores {
		for _, reason := range item.BlockingReasons {
			if _, ok := seen[reason]; ok {
				continue
			}
			seen[reason] = struct{}{}
			result = append(result, reason)
		}
	}
	return result
}

func writeAggregatedReadiness(w http.ResponseWriter, db *sql.DB, partnerID string) {
	readiness, err := LoadAggregatedPartnerReadiness(db, partnerID)
	switch {
	case errors.Is(err, ErrNotFound):
		sendError(w, http.StatusNotFound, "NOT_FOUND", "partner not found")
	case err != nil:
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute partner/store readiness")
	default:
		sendJSON(w, http.StatusOK, readiness)
	}
}

func HandleGetAggregatedReadiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeAggregatedReadiness(w, db, partnerIDFromPath(r))
	}
}

func HandleFieldGetAggregatedReadiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID, _ := actorFromContext(r)
		partnerID := partnerIDFromPath(r)
		if !requireFieldOwnsPartner(w, db, r, partnerID, actorID) {
			return
		}
		writeAggregatedReadiness(w, db, partnerID)
	}
}

func HandlePartnerMeAggregatedReadiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		partnerID := partnerIDFromContext(r)
		if partnerID == "" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "no partner context")
			return
		}
		writeAggregatedReadiness(w, db, partnerID)
	}
}
