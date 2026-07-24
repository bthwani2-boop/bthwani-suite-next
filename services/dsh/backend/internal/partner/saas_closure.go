package partner

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

var (
	ErrStoreOwnershipConflict = errors.New("store is owned by another partner")
	ErrOpenStoreOperations    = errors.New("store has open operational records")
)

// GovernedStoreLinkInput is the only accepted shape for a transfer. Initial
// assignment of an unowned store remains idempotent; reassignment requires a
// reason and optimistic store version.
type GovernedStoreLinkInput struct {
	StoreID              string `json:"storeId"`
	Reason               string `json:"reason"`
	ExpectedStoreVersion int    `json:"expectedStoreVersion"`
}

// LinkPartnerStoreForTenantGoverned preserves tenant isolation, prevents silent
// ownership replacement, blocks transfer while DSH operations are open, and
// records a durable before/after audit row. A transfer safely unpublishes the
// store so the new owner must pass readiness, catalog and marketing gates again.
func LinkPartnerStoreForTenantGoverned(
	db *sql.DB,
	tenantID, partnerID, actorID, correlationID string,
	input GovernedStoreLinkInput,
) ([]PartnerLinkedStore, error) {
	tenantID, err := normalizeTenantID(tenantID)
	if err != nil {
		return nil, err
	}
	partnerID = strings.TrimSpace(partnerID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.Reason = strings.TrimSpace(input.Reason)
	actorID = strings.TrimSpace(actorID)
	if partnerID == "" || input.StoreID == "" || actorID == "" {
		return nil, ErrInvalid
	}
	if err := EnsureTenantPartner(db, tenantID, partnerID); err != nil {
		return nil, err
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var currentPartnerID string
	var currentVersion int
	err = tx.QueryRow(`
		SELECT COALESCE(partner_id, ''), version
		FROM dsh_stores
		WHERE id = $1 AND tenant_id = $2
		FOR UPDATE`, input.StoreID, tenantID,
	).Scan(&currentPartnerID, &currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if currentPartnerID == partnerID {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return ListPartnerStores(db, partnerID)
	}

	isTransfer := currentPartnerID != ""
	if isTransfer {
		if len(input.Reason) < 5 {
			return nil, ErrStoreOwnershipConflict
		}
		if input.ExpectedStoreVersion <= 0 || input.ExpectedStoreVersion != currentVersion {
			return nil, ErrVersionConflict
		}

		var hasOpenOperations bool
		if err := tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1
				FROM dsh_orders
				WHERE store_id = $1
				  AND status NOT IN ('completed', 'delivered', 'cancelled', 'refunded')
			)`, input.StoreID,
		).Scan(&hasOpenOperations); err != nil {
			return nil, err
		}
		if hasOpenOperations {
			return nil, ErrOpenStoreOperations
		}
	} else {
		if input.ExpectedStoreVersion > 0 && input.ExpectedStoreVersion != currentVersion {
			return nil, ErrVersionConflict
		}
		if input.Reason == "" {
			input.Reason = "initial governed partner ownership assignment"
		}
	}

	result, err := tx.Exec(`
		UPDATE dsh_stores
		SET partner_id = $1,
		    brand_id = NULL,
		    partner_readiness = 'pending',
		    catalog_approval_status = 'draft',
		    marketing_visibility = 'hidden',
		    is_visible = false,
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3 AND version = $4`,
		partnerID, input.StoreID, tenantID, currentVersion,
	)
	if err != nil {
		return nil, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected != 1 {
		return nil, ErrVersionConflict
	}
	resultingVersion := currentVersion + 1

	_, err = tx.Exec(`
		INSERT INTO dsh_partner_store_transfer_audit (
			tenant_id, store_id, from_partner_id, to_partner_id,
			actor_id, actor_surface, reason,
			expected_store_version, resulting_store_version, correlation_id
		) VALUES ($1,$2,NULLIF($3,''),$4,$5,'control-panel',$6,$7,$8,$9)`,
		tenantID, input.StoreID, currentPartnerID, partnerID, actorID, input.Reason,
		currentVersion, resultingVersion, correlationID,
	)
	if err != nil {
		return nil, err
	}

	if currentPartnerID != "" {
		if err := recordActivationEvent(
			tx, currentPartnerID, "store_transferred_out:"+input.StoreID,
			actorID, "control-panel", input.Reason,
		); err != nil {
			return nil, err
		}
	}
	if err := recordActivationEvent(
		tx, partnerID, "store_linked:"+input.StoreID,
		actorID, "control-panel", input.Reason,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return ListPartnerStores(db, partnerID)
}

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
		"STORE_INACTIVE":             "حالة الفرع غير نشطة",
		"STORE_HIDDEN":               "الفرع مخفي من لوحة التحكم",
		"STORE_NOT_SERVICEABLE":      "الفرع غير مغطى بالخدمة",
		"PARTNER_READINESS_PENDING":  "جاهزية الشريك للفرع غير مكتملة",
		"CATALOG_NOT_APPROVED":       "كتالوج الفرع غير معتمد",
		"MARKETING_NOT_VISIBLE":      "الظهور التسويقي غير مفعل",
		"PARTNER_NOT_ACTIVE":         "الشريك غير نشط",
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

func LoadAggregatedPartnerReadiness(db *sql.DB, partnerID string) (AggregatedPartnerReadiness, error) {
	p, err := GetPartner(db, partnerID)
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

	partnerActive := p.ActivationStatus == StatusPartnerActive ||
		p.ActivationStatus == StatusClientVisible ||
		p.ActivationStatus == StatusClientHidden
	stores := make([]StorePublicationReadiness, 0)
	readyCount := 0
	visibleCount := 0
	allStoreGatesPassed := true
	for rows.Next() {
		var item StorePublicationReadiness
		var storeGatesPassed bool
		var blockedCodes []string
		if err := rows.Scan(
			&item.StoreID, &item.DisplayName, &storeGatesPassed,
			&item.IsClientVisible, pqStringArrayScanner(&blockedCodes),
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
		} else {
			allStoreGatesPassed = false
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
	if !hasStore {
		allStoreGatesPassed = false
	}
	base := ComputeReadiness(
		p, documentCount, approvedDocumentCount,
		hasStore,
		allStoreGatesPassed,
		allStoreGatesPassed,
		allStoreGatesPassed,
		allStoreGatesPassed,
		allStoreGatesPassed,
		allStoreGatesPassed,
	)
	base.CanPublishStoreToClient = hasStore && readyCount == len(stores)
	if len(stores)-readyCount > 0 {
		base.StorePublicationBlockedReason = fmt.Sprintf(
			"%d من %d فروع غير مستوفية لبوابات النشر",
			len(stores)-readyCount, len(stores),
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

// pqStringArrayScanner avoids exposing pq.Array throughout the handler surface.
// It implements sql.Scanner for a PostgreSQL text[] column.
type stringArrayScanner struct {
	destination *[]string
}

func pqStringArrayScanner(destination *[]string) *stringArrayScanner {
	return &stringArrayScanner{destination: destination}
}

func (s *stringArrayScanner) Scan(src any) error {
	if src == nil {
		*s.destination = []string{}
		return nil
	}
	text, ok := src.([]byte)
	if !ok {
		if value, stringOK := src.(string); stringOK {
			text = []byte(value)
		} else {
			return fmt.Errorf("unsupported postgres array type %T", src)
		}
	}
	value := strings.TrimSpace(string(text))
	if value == "{}" || value == "" {
		*s.destination = []string{}
		return nil
	}
	value = strings.TrimPrefix(value, "{")
	value = strings.TrimSuffix(value, "}")
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.Trim(strings.TrimSpace(part), `"`)
		if part != "" {
			result = append(result, part)
		}
	}
	*s.destination = result
	return nil
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
			sendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
			return
		}
		if !partnerID.Valid || strings.TrimSpace(partnerID.String) == "" {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "no partner linked to this store")
			return
		}
		writeAggregatedReadiness(w, db, partnerID.String)
	}
}

// Compile-time guard that the response remains JSON serializable and prevents
// accidental introduction of unsupported values into the public payload.
var _ = json.Marshaler(nil)
