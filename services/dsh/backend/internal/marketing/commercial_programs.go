package marketing

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrCommercialVersionConflict = errors.New("commercial program version conflict")

var commercialStatuses = map[string]bool{
	"draft": true, "active": true, "paused": true, "archived": true,
}

var billingCycles = map[string]bool{
	"monthly": true, "quarterly": true, "annual": true,
}

type LoyaltyTier struct {
	ID                       string  `json:"id"`
	NameAr                   string  `json:"nameAr"`
	NameEn                   string  `json:"nameEn"`
	MinPoints                int64   `json:"minPoints"`
	DiscountPercent          float64 `json:"discountPercent"`
	FreeDeliveryThresholdYer int64   `json:"freeDeliveryThreshold"`
	Badge                    string  `json:"badge"`
	Status                   string  `json:"status"`
	Version                  int     `json:"version"`
	CreatedByActorID         string  `json:"createdByActorId"`
	ApprovedByActorID        string  `json:"approvedByActorId,omitempty"`
	ApprovedAt               *string `json:"approvedAt,omitempty"`
	CreatedAt                string  `json:"createdAt"`
	UpdatedAt                string  `json:"updatedAt"`
}

type SubscriptionPlan struct {
	ID                  string  `json:"id"`
	NameAr              string  `json:"nameAr"`
	NameEn              string  `json:"nameEn"`
	PriceYer            int64   `json:"priceYer"`
	BillingCycle        string  `json:"billingCycle"`
	IncludeFreeDelivery bool    `json:"includeFreeDelivery"`
	PointsMultiplier    float64 `json:"pointsMultiplier"`
	OrderCap            int     `json:"orderCap"`
	Badge               string  `json:"badge"`
	Status              string  `json:"status"`
	SubscriberCount     int64   `json:"subscriberCount"`
	WLTProductReference string  `json:"wltProductReference,omitempty"`
	Version             int     `json:"version"`
	CreatedByActorID    string  `json:"createdByActorId"`
	ApprovedByActorID   string  `json:"approvedByActorId,omitempty"`
	ApprovedAt          *string `json:"approvedAt,omitempty"`
	CreatedAt           string  `json:"createdAt"`
	UpdatedAt           string  `json:"updatedAt"`
}

type LoyaltyProgramSummary struct {
	ActiveTiers           int64 `json:"activeTiers"`
	TotalEnrolledClients  int64 `json:"totalEnrolledClients"`
	PointsIssuedThisMonth int64 `json:"pointsIssuedThisMonth"`
	IsBackedByAPI         bool  `json:"isBackedByApi"`
}

type SubscriptionsSummary struct {
	ActivePlans            int64 `json:"activePlans"`
	TotalActiveSubscribers int64 `json:"totalActiveSubscribers"`
	MRR                    int64 `json:"mrr"`
	IsBackedByAPI          bool  `json:"isBackedByApi"`
}

type ClientLoyaltyAccount struct {
	PointsBalance  int64        `json:"pointsBalance"`
	LifetimePoints int64        `json:"lifetimePoints"`
	Tier           *LoyaltyTier `json:"tier,omitempty"`
}

type ClientSubscriptionEntitlement struct {
	ID                       string           `json:"id"`
	Status                   string           `json:"status"`
	WLTSubscriptionReference string           `json:"wltSubscriptionReference,omitempty"`
	StartsAt                 *string          `json:"startsAt,omitempty"`
	EndsAt                   *string          `json:"endsAt,omitempty"`
	Plan                     SubscriptionPlan `json:"plan"`
}

type ClientBenefits struct {
	LoyaltyAccount     *ClientLoyaltyAccount          `json:"loyaltyAccount,omitempty"`
	AvailableTiers     []LoyaltyTier                  `json:"availableTiers"`
	AvailablePlans     []SubscriptionPlan             `json:"availablePlans"`
	ActiveSubscription *ClientSubscriptionEntitlement `json:"activeSubscription,omitempty"`
	Offers             []PartnerOffer                 `json:"offers"`
}

type CreateLoyaltyTierInput struct {
	NameAr                   string
	NameEn                   string
	MinPoints                int64
	DiscountPercent          float64
	FreeDeliveryThresholdYer int64
	Badge                    string
	ActorID                  string
	CorrelationID            string
}

type UpdateLoyaltyTierInput struct {
	NameAr                   *string
	NameEn                   *string
	MinPoints                *int64
	DiscountPercent          *float64
	FreeDeliveryThresholdYer *int64
	Badge                    *string
	Status                   *string
	ExpectedVersion          int
	ActorID                  string
	CorrelationID            string
}

type CreateSubscriptionPlanInput struct {
	NameAr              string
	NameEn              string
	PriceYer            int64
	BillingCycle        string
	IncludeFreeDelivery bool
	PointsMultiplier    float64
	OrderCap            int
	Badge               string
	WLTProductReference string
	ActorID             string
	CorrelationID       string
}

type UpdateSubscriptionPlanInput struct {
	NameAr              *string
	NameEn              *string
	PriceYer            *int64
	BillingCycle        *string
	IncludeFreeDelivery *bool
	PointsMultiplier    *float64
	OrderCap            *int
	Badge               *string
	Status              *string
	WLTProductReference *string
	ExpectedVersion     int
	ActorID             string
	CorrelationID       string
}

const loyaltyTierSelectCols = `id::TEXT, name_ar, name_en, min_points,
	discount_percent, free_delivery_threshold_yer, badge, status, version,
	created_by_actor_id, approved_by_actor_id, approved_at::TEXT,
	created_at::TEXT, updated_at::TEXT`

const subscriptionPlanSelectCols = `p.id::TEXT, p.name_ar, p.name_en, p.price_yer,
	p.billing_cycle, p.include_free_delivery, p.points_multiplier, p.order_cap,
	p.badge, p.status,
	(SELECT COUNT(*) FROM dsh_client_subscriptions s WHERE s.plan_id = p.id AND s.status = 'active'),
	p.wlt_product_reference, p.version, p.created_by_actor_id, p.approved_by_actor_id,
	p.approved_at::TEXT, p.created_at::TEXT, p.updated_at::TEXT`

func nullableString(value sql.NullString) *string {
	if !value.Valid || value.String == "" {
		return nil
	}
	v := value.String
	return &v
}

func scanLoyaltyTier(row interface{ Scan(dest ...any) error }) (LoyaltyTier, error) {
	var tier LoyaltyTier
	var approvedAt sql.NullString
	err := row.Scan(
		&tier.ID, &tier.NameAr, &tier.NameEn, &tier.MinPoints,
		&tier.DiscountPercent, &tier.FreeDeliveryThresholdYer, &tier.Badge,
		&tier.Status, &tier.Version, &tier.CreatedByActorID,
		&tier.ApprovedByActorID, &approvedAt, &tier.CreatedAt, &tier.UpdatedAt,
	)
	tier.ApprovedAt = nullableString(approvedAt)
	return tier, err
}

func scanSubscriptionPlan(row interface{ Scan(dest ...any) error }) (SubscriptionPlan, error) {
	var plan SubscriptionPlan
	var approvedAt sql.NullString
	err := row.Scan(
		&plan.ID, &plan.NameAr, &plan.NameEn, &plan.PriceYer,
		&plan.BillingCycle, &plan.IncludeFreeDelivery, &plan.PointsMultiplier,
		&plan.OrderCap, &plan.Badge, &plan.Status, &plan.SubscriberCount,
		&plan.WLTProductReference, &plan.Version, &plan.CreatedByActorID,
		&plan.ApprovedByActorID, &approvedAt, &plan.CreatedAt, &plan.UpdatedAt,
	)
	plan.ApprovedAt = nullableString(approvedAt)
	return plan, err
}

func commercialJSON(value any) []byte {
	payload, _ := json.Marshal(value)
	return payload
}

func validateTier(name string, minPoints int64, discount float64, threshold int64) error {
	if strings.TrimSpace(name) == "" || minPoints < 0 || discount < 0 || discount > 100 || threshold < 0 {
		return ErrInvalid
	}
	return nil
}

func validatePlan(name string, price int64, cycle string, multiplier float64, cap int) error {
	if strings.TrimSpace(name) == "" || price <= 0 || !billingCycles[cycle] || multiplier < 1 || cap < 0 {
		return ErrInvalid
	}
	return nil
}

func ListLoyaltyTiers(db *sql.DB, activeOnly bool) ([]LoyaltyTier, error) {
	query := `SELECT ` + loyaltyTierSelectCols + ` FROM dsh_loyalty_tiers WHERE archived_at IS NULL`
	if activeOnly {
		query += ` AND status = 'active'`
	}
	query += ` ORDER BY min_points ASC, created_at ASC`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []LoyaltyTier{}
	for rows.Next() {
		tier, err := scanLoyaltyTier(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, tier)
	}
	return out, rows.Err()
}

func GetLoyaltyTier(db *sql.DB, id string) (LoyaltyTier, error) {
	tier, err := scanLoyaltyTier(db.QueryRow(`SELECT `+loyaltyTierSelectCols+`
		FROM dsh_loyalty_tiers WHERE id::TEXT = $1 AND archived_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return LoyaltyTier{}, ErrNotFound
	}
	return tier, err
}

func CreateLoyaltyTier(db *sql.DB, in CreateLoyaltyTierInput) (LoyaltyTier, error) {
	if err := validateTier(in.NameAr, in.MinPoints, in.DiscountPercent, in.FreeDeliveryThresholdYer); err != nil {
		return LoyaltyTier{}, err
	}
	if strings.TrimSpace(in.NameEn) == "" {
		in.NameEn = in.NameAr
	}
	tier, err := scanLoyaltyTier(db.QueryRow(`
		INSERT INTO dsh_loyalty_tiers
			(name_ar, name_en, min_points, discount_percent, free_delivery_threshold_yer, badge, created_by_actor_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING `+loyaltyTierSelectCols,
		strings.TrimSpace(in.NameAr), strings.TrimSpace(in.NameEn), in.MinPoints,
		in.DiscountPercent, in.FreeDeliveryThresholdYer, strings.TrimSpace(in.Badge), in.ActorID))
	if err != nil {
		return LoyaltyTier{}, err
	}
	_ = WriteAuditEvent(db, "loyalty_tier", tier.ID, in.ActorID, "operator", "create", "", in.CorrelationID, nil, commercialJSON(tier))
	return tier, nil
}

func UpdateLoyaltyTier(db *sql.DB, id string, in UpdateLoyaltyTierInput) (LoyaltyTier, error) {
	before, err := GetLoyaltyTier(db, id)
	if err != nil {
		return LoyaltyTier{}, err
	}
	if in.ExpectedVersion <= 0 || in.ExpectedVersion != before.Version {
		return LoyaltyTier{}, ErrCommercialVersionConflict
	}
	next := before
	if in.NameAr != nil {
		next.NameAr = strings.TrimSpace(*in.NameAr)
	}
	if in.NameEn != nil {
		next.NameEn = strings.TrimSpace(*in.NameEn)
	}
	if in.MinPoints != nil {
		next.MinPoints = *in.MinPoints
	}
	if in.DiscountPercent != nil {
		next.DiscountPercent = *in.DiscountPercent
	}
	if in.FreeDeliveryThresholdYer != nil {
		next.FreeDeliveryThresholdYer = *in.FreeDeliveryThresholdYer
	}
	if in.Badge != nil {
		next.Badge = strings.TrimSpace(*in.Badge)
	}
	if in.Status != nil {
		if !commercialStatuses[*in.Status] {
			return LoyaltyTier{}, ErrInvalid
		}
		next.Status = *in.Status
	}
	if err := validateTier(next.NameAr, next.MinPoints, next.DiscountPercent, next.FreeDeliveryThresholdYer); err != nil {
		return LoyaltyTier{}, err
	}
	if next.NameEn == "" {
		next.NameEn = next.NameAr
	}
	approvedBy := before.ApprovedByActorID
	var approvedAt any
	if next.Status == "active" {
		approvedBy = in.ActorID
		approvedAt = time.Now().UTC()
	} else if before.ApprovedAt != nil {
		approvedAt = *before.ApprovedAt
	}
	var archivedAt any
	if next.Status == "archived" {
		archivedAt = time.Now().UTC()
	}
	tier, err := scanLoyaltyTier(db.QueryRow(`
		UPDATE dsh_loyalty_tiers SET
			name_ar=$2, name_en=$3, min_points=$4, discount_percent=$5,
			free_delivery_threshold_yer=$6, badge=$7, status=$8,
			approved_by_actor_id=$9, approved_at=$10, archived_at=$11,
			version=version+1, updated_at=NOW()
		WHERE id::TEXT=$1 AND version=$12 AND archived_at IS NULL
		RETURNING `+loyaltyTierSelectCols,
		id, next.NameAr, next.NameEn, next.MinPoints, next.DiscountPercent,
		next.FreeDeliveryThresholdYer, next.Badge, next.Status, approvedBy,
		approvedAt, archivedAt, in.ExpectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return LoyaltyTier{}, ErrCommercialVersionConflict
	}
	if err != nil {
		return LoyaltyTier{}, err
	}
	_ = WriteAuditEvent(db, "loyalty_tier", tier.ID, in.ActorID, "operator", "update", "", in.CorrelationID, commercialJSON(before), commercialJSON(tier))
	return tier, nil
}

func LoyaltySummary(db *sql.DB) (LoyaltyProgramSummary, error) {
	var out LoyaltyProgramSummary
	err := db.QueryRow(`
		SELECT
			(SELECT COUNT(*) FROM dsh_loyalty_tiers WHERE status='active' AND archived_at IS NULL),
			(SELECT COUNT(*) FROM dsh_client_loyalty_accounts),
			(SELECT COALESCE(SUM(points_delta),0) FROM dsh_loyalty_ledger
			 WHERE points_delta > 0 AND created_at >= date_trunc('month', NOW()))`).
		Scan(&out.ActiveTiers, &out.TotalEnrolledClients, &out.PointsIssuedThisMonth)
	out.IsBackedByAPI = true
	return out, err
}

func ListSubscriptionPlans(db *sql.DB, activeOnly bool) ([]SubscriptionPlan, error) {
	query := `SELECT ` + subscriptionPlanSelectCols + ` FROM dsh_subscription_plans p WHERE p.archived_at IS NULL`
	if activeOnly {
		query += ` AND p.status = 'active'`
	}
	query += ` ORDER BY p.price_yer ASC, p.created_at ASC`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SubscriptionPlan{}
	for rows.Next() {
		plan, err := scanSubscriptionPlan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, plan)
	}
	return out, rows.Err()
}

func GetSubscriptionPlan(db *sql.DB, id string) (SubscriptionPlan, error) {
	plan, err := scanSubscriptionPlan(db.QueryRow(`SELECT `+subscriptionPlanSelectCols+`
		FROM dsh_subscription_plans p WHERE p.id::TEXT=$1 AND p.archived_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return SubscriptionPlan{}, ErrNotFound
	}
	return plan, err
}

func CreateSubscriptionPlan(db *sql.DB, in CreateSubscriptionPlanInput) (SubscriptionPlan, error) {
	if err := validatePlan(in.NameAr, in.PriceYer, in.BillingCycle, in.PointsMultiplier, in.OrderCap); err != nil {
		return SubscriptionPlan{}, err
	}
	if strings.TrimSpace(in.NameEn) == "" {
		in.NameEn = in.NameAr
	}
	plan, err := scanSubscriptionPlan(db.QueryRow(`
		INSERT INTO dsh_subscription_plans
			(name_ar,name_en,price_yer,billing_cycle,include_free_delivery,points_multiplier,order_cap,badge,wlt_product_reference,created_by_actor_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		RETURNING `+subscriptionPlanSelectCols,
		strings.TrimSpace(in.NameAr), strings.TrimSpace(in.NameEn), in.PriceYer,
		in.BillingCycle, in.IncludeFreeDelivery, in.PointsMultiplier, in.OrderCap,
		strings.TrimSpace(in.Badge), strings.TrimSpace(in.WLTProductReference), in.ActorID))
	if err != nil {
		return SubscriptionPlan{}, err
	}
	_ = WriteAuditEvent(db, "subscription_plan", plan.ID, in.ActorID, "operator", "create", "", in.CorrelationID, nil, commercialJSON(plan))
	return plan, nil
}

func UpdateSubscriptionPlan(db *sql.DB, id string, in UpdateSubscriptionPlanInput) (SubscriptionPlan, error) {
	before, err := GetSubscriptionPlan(db, id)
	if err != nil {
		return SubscriptionPlan{}, err
	}
	if in.ExpectedVersion <= 0 || in.ExpectedVersion != before.Version {
		return SubscriptionPlan{}, ErrCommercialVersionConflict
	}
	next := before
	if in.NameAr != nil {
		next.NameAr = strings.TrimSpace(*in.NameAr)
	}
	if in.NameEn != nil {
		next.NameEn = strings.TrimSpace(*in.NameEn)
	}
	if in.PriceYer != nil {
		next.PriceYer = *in.PriceYer
	}
	if in.BillingCycle != nil {
		next.BillingCycle = *in.BillingCycle
	}
	if in.IncludeFreeDelivery != nil {
		next.IncludeFreeDelivery = *in.IncludeFreeDelivery
	}
	if in.PointsMultiplier != nil {
		next.PointsMultiplier = *in.PointsMultiplier
	}
	if in.OrderCap != nil {
		next.OrderCap = *in.OrderCap
	}
	if in.Badge != nil {
		next.Badge = strings.TrimSpace(*in.Badge)
	}
	if in.WLTProductReference != nil {
		next.WLTProductReference = strings.TrimSpace(*in.WLTProductReference)
	}
	if in.Status != nil {
		if !commercialStatuses[*in.Status] {
			return SubscriptionPlan{}, ErrInvalid
		}
		next.Status = *in.Status
	}
	if err := validatePlan(next.NameAr, next.PriceYer, next.BillingCycle, next.PointsMultiplier, next.OrderCap); err != nil {
		return SubscriptionPlan{}, err
	}
	if next.NameEn == "" {
		next.NameEn = next.NameAr
	}
	approvedBy := before.ApprovedByActorID
	var approvedAt any
	if next.Status == "active" {
		approvedBy = in.ActorID
		approvedAt = time.Now().UTC()
	} else if before.ApprovedAt != nil {
		approvedAt = *before.ApprovedAt
	}
	var archivedAt any
	if next.Status == "archived" {
		archivedAt = time.Now().UTC()
	}
	plan, err := scanSubscriptionPlan(db.QueryRow(`
		UPDATE dsh_subscription_plans SET
			name_ar=$2,name_en=$3,price_yer=$4,billing_cycle=$5,
			include_free_delivery=$6,points_multiplier=$7,order_cap=$8,badge=$9,
			status=$10,wlt_product_reference=$11,approved_by_actor_id=$12,
			approved_at=$13,archived_at=$14,version=version+1,updated_at=NOW()
		WHERE id::TEXT=$1 AND version=$15 AND archived_at IS NULL
		RETURNING `+subscriptionPlanSelectCols,
		id, next.NameAr, next.NameEn, next.PriceYer, next.BillingCycle,
		next.IncludeFreeDelivery, next.PointsMultiplier, next.OrderCap, next.Badge,
		next.Status, next.WLTProductReference, approvedBy, approvedAt, archivedAt,
		in.ExpectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return SubscriptionPlan{}, ErrCommercialVersionConflict
	}
	if err != nil {
		return SubscriptionPlan{}, err
	}
	_ = WriteAuditEvent(db, "subscription_plan", plan.ID, in.ActorID, "operator", "update", "", in.CorrelationID, commercialJSON(before), commercialJSON(plan))
	return plan, nil
}

func SubscriptionSummary(db *sql.DB) (SubscriptionsSummary, error) {
	var out SubscriptionsSummary
	err := db.QueryRow(`
		SELECT
			(SELECT COUNT(*) FROM dsh_subscription_plans WHERE status='active' AND archived_at IS NULL),
			(SELECT COUNT(*) FROM dsh_client_subscriptions WHERE status='active'),
			(SELECT COALESCE(SUM(CASE p.billing_cycle
				WHEN 'monthly' THEN p.price_yer
				WHEN 'quarterly' THEN p.price_yer / 3
				WHEN 'annual' THEN p.price_yer / 12
				ELSE 0 END),0)
			 FROM dsh_client_subscriptions s
			 JOIN dsh_subscription_plans p ON p.id=s.plan_id
			 WHERE s.status='active')`).
		Scan(&out.ActivePlans, &out.TotalActiveSubscribers, &out.MRR)
	out.IsBackedByAPI = true
	return out, err
}

func ListPublishedPartnerOffers(db *sql.DB) ([]PartnerOffer, error) {
	rows, err := db.Query(`SELECT ` + partnerOfferSelectCols + `
		FROM dsh_partner_offers
		WHERE archived_at IS NULL AND status='published'
		  AND (active_from_date='' OR active_from_date IS NULL OR active_from_date <= CURRENT_DATE::TEXT)
		  AND (active_to_date='' OR active_to_date IS NULL OR active_to_date >= CURRENT_DATE::TEXT)
		ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PartnerOffer{}
	for rows.Next() {
		offer, err := scanPartnerOffer(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, offer)
	}
	return out, rows.Err()
}

func getClientLoyaltyAccount(db *sql.DB, actorID string) (*ClientLoyaltyAccount, error) {
	var account ClientLoyaltyAccount
	var tierID sql.NullString
	err := db.QueryRow(`SELECT points_balance,lifetime_points,tier_id::TEXT
		FROM dsh_client_loyalty_accounts WHERE client_actor_id=$1`, actorID).
		Scan(&account.PointsBalance, &account.LifetimePoints, &tierID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if tierID.Valid && tierID.String != "" {
		tier, tierErr := GetLoyaltyTier(db, tierID.String)
		if tierErr != nil && !errors.Is(tierErr, ErrNotFound) {
			return nil, tierErr
		}
		if tierErr == nil {
			account.Tier = &tier
		}
	}
	return &account, nil
}

func getActiveClientSubscription(db *sql.DB, actorID string) (*ClientSubscriptionEntitlement, error) {
	var entitlement ClientSubscriptionEntitlement
	var startsAt, endsAt sql.NullString
	var planID string
	err := db.QueryRow(`SELECT id::TEXT,status,wlt_subscription_reference,starts_at::TEXT,ends_at::TEXT,plan_id::TEXT
		FROM dsh_client_subscriptions
		WHERE client_actor_id=$1 AND status='active'
		  AND (starts_at IS NULL OR starts_at <= NOW())
		  AND (ends_at IS NULL OR ends_at > NOW())
		ORDER BY starts_at DESC NULLS LAST LIMIT 1`, actorID).
		Scan(&entitlement.ID, &entitlement.Status, &entitlement.WLTSubscriptionReference, &startsAt, &endsAt, &planID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	entitlement.StartsAt = nullableString(startsAt)
	entitlement.EndsAt = nullableString(endsAt)
	plan, err := GetSubscriptionPlan(db, planID)
	if err != nil {
		return nil, fmt.Errorf("load active subscription plan: %w", err)
	}
	entitlement.Plan = plan
	return &entitlement, nil
}

func GetClientBenefits(db *sql.DB, actorID string) (ClientBenefits, error) {
	tiers, err := ListLoyaltyTiers(db, true)
	if err != nil {
		return ClientBenefits{}, err
	}
	plans, err := ListSubscriptionPlans(db, true)
	if err != nil {
		return ClientBenefits{}, err
	}
	offers, err := ListPublishedPartnerOffers(db)
	if err != nil {
		return ClientBenefits{}, err
	}
	account, err := getClientLoyaltyAccount(db, actorID)
	if err != nil {
		return ClientBenefits{}, err
	}
	subscription, err := getActiveClientSubscription(db, actorID)
	if err != nil {
		return ClientBenefits{}, err
	}
	return ClientBenefits{
		LoyaltyAccount:     account,
		AvailableTiers:     tiers,
		AvailablePlans:     plans,
		ActiveSubscription: subscription,
		Offers:             offers,
	}, nil
}
