package partner

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/lib/pq"
)

type StorePublicationReadiness struct {
	StoreID              string   `json:"storeId"`
	DisplayName          string   `json:"displayName"`
	CanPublishToClient   bool     `json:"canPublishToClient"`
	IsClientVisible      bool     `json:"isClientVisible"`
	BlockedReasonCodes   []string `json:"blockedReasonCodes"`
	BlockedReasonMessage string   `json:"blockedReasonMessage,omitempty"`
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
	CanPublishStoreToClient        bool                         `json:"canPublishStoreToClient"`
	BlockedReason                  string                       `json:"blockedReason,omitempty"`
	PartnerActivationBlockedReason string                       `json:"partnerActivationBlockedReason,omitempty"`
	StorePublicationBlockedReason  string                       `json:"storePublicationBlockedReason,omitempty"`
	Checklist                      []ReadinessItem              `json:"checklist"`
	StoreSummary                   PartnerStoreReadinessSummary `json:"storeSummary"`
	Stores                         []StorePublicationReadiness  `json:"stores"`
	GeneratedAt                    time.Time                    `json:"generatedAt"`
}

func storeBlockedReasonMessage(codes []string) string {
	if len(codes) == 0 {
		return ""
	}
	labels := map[string]string{
		"STORE_INACTIVE":            "حالة الفرع غير نشطة",
		"STORE_HIDDEN":              "الفرع مخفي من لوحة التحكم",
		"STORE_NOT_SERVICEABLE":     "الفرع غير مغطى بالخدمة",
		"PARTNER_READINESS_PENDING": "جاهزية الشريك للفرع غير مكتملة",
		"CATALOG_NOT_APPROVED":      "كتالوج الفرع غير معتمد",
		"MARKETING_NOT_VISIBLE":     "الظهور التسويقي غير مفعل",
		"PARTNER_NOT_ACTIVE":        "الشريك غير نشط",
	}
	messages := make([]string, 0, len(codes))
	for _, code := range codes {
		if label, ok := labels[code]; ok {
			messages = append(messages, label)
		} else {
			messages = append(messages, code)
		}
	}
	return strings.Join(messages, "، ")
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
		SELECT store_id, display_name, store_gates_passed, is_visible,
		       blocked_reason_codes
		FROM dsh_partner_store_readiness_v
		WHERE partner_id = $1
		ORDER BY display_name ASC, store_id ASC`, partnerID)
	if err != nil {
		return AggregatedPartnerReadiness{}, err
	}
	defer rows.Close()

	partnerActive := partnerState.ActivationStatus == StatusPartnerActive ||
		partnerState.ActivationStatus == StatusClientVisible ||
		partnerState.ActivationStatus == StatusClientHidden
	stores := make([]StorePublicationReadiness, 0)
	readyCount := 0
	visibleCount := 0
	for rows.Next() {
		var item StorePublicationReadiness
		var storeGatesPassed bool
		var blockedCodes []string
		if err := rows.Scan(
			&item.StoreID,
			&item.DisplayName,
			&storeGatesPassed,
			&item.IsClientVisible,
			pq.Array(&blockedCodes),
		); err != nil {
			return AggregatedPartnerReadiness{}, err
		}
		if !partnerActive {
			blockedCodes = append(blockedCodes, "PARTNER_NOT_ACTIVE")
		}
		item.BlockedReasonCodes = blockedCodes
		item.CanPublishToClient = storeGatesPassed && partnerActive
		item.BlockedReasonMessage = storeBlockedReasonMessage(blockedCodes)
		if item.CanPublishToClient {
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
	base := ComputeReadiness(
		partnerState,
		documentCount,
		approvedDocumentCount,
		hasStore,
		allStoreGatesPassed,
		allStoreGatesPassed,
		allStoreGatesPassed,
		allStoreGatesPassed,
		allStoreGatesPassed,
		allStoreGatesPassed,
	)
	base.CanPublishStoreToClient = allStoreGatesPassed
	if !hasStore {
		base.StorePublicationBlockedReason = "لا يوجد فرع مربوط بالشريك"
	} else if readyCount < len(stores) {
		base.StorePublicationBlockedReason = fmt.Sprintf(
			"%d من %d فروع غير مستوفية لبوابات النشر",
			len(stores)-readyCount,
			len(stores),
		)
	}

	return AggregatedPartnerReadiness{
		PartnerID:                      base.PartnerID,
		CanActivate:                    base.CanActivate,
		CanActivatePartner:             base.CanActivatePartner,
		CanPublishStoreToClient:        base.CanPublishStoreToClient,
		BlockedReason:                  base.BlockedReason,
		PartnerActivationBlockedReason: base.PartnerActivationBlockedReason,
		StorePublicationBlockedReason:  base.StorePublicationBlockedReason,
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
		if !requireFieldOwnsPartner(w, db, partnerID, actorID) {
			return
		}
		writeAggregatedReadiness(w, db, partnerID)
	}
}

func HandlePartnerMeAggregatedReadiness(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		storeID := storeIDFromContext(r)
		if storeID == "" {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "no store context")
			return
		}
		var partnerID sql.NullString
		if err := db.QueryRow(`SELECT partner_id FROM dsh_stores WHERE id = $1`, storeID).Scan(&partnerID); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				sendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
				return
			}
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve partner")
			return
		}
		if !partnerID.Valid || strings.TrimSpace(partnerID.String) == "" {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "no partner linked to this store")
			return
		}
		writeAggregatedReadiness(w, db, partnerID.String)
	}
}
