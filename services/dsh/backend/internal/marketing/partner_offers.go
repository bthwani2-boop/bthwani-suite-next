package marketing

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	"dsh-api/internal/coupons"
)

var ErrRejectionReasonRequired = errors.New("rejection reason required")
var ErrCouponLinkRequired = errors.New("active coupon link required")

type PartnerOffer struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	PartnerName      string `json:"partnerName"`
	StoreID          string `json:"storeId"`
	StoreLabel       string `json:"storeLabel"`
	ProductID        string `json:"productId"`
	ProductLabel     string `json:"productLabel"`
	Category         string `json:"category"`
	OfferType        string `json:"offerType"`
	CouponID         string `json:"couponId,omitempty"`
	Status           string `json:"status"`
	Source           string `json:"source"`
	ValueLabel       string `json:"valueLabel"`
	Eligibility      string `json:"eligibility"`
	ActiveFromDate   string `json:"activeFromDate,omitempty"`
	ActiveToDate     string `json:"activeToDate,omitempty"`
	RejectionReason  string `json:"rejectionReason,omitempty"`
	MarginRiskNote   string `json:"marginRiskNote,omitempty"`
	Version          int    `json:"version"`
	LinkedCampaignID string `json:"linkedCampaignId,omitempty"`
	CreatedBy        string `json:"createdBy"`
	CreatedBySurface string `json:"createdBySurface"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

func partnerOfferJSON(o PartnerOffer) []byte {
	b, _ := json.Marshal(o)
	return b
}

var partnerOfferTypes = map[string]bool{"discount": true, "free-delivery": true, "bundle": true, "buy-x-get-y": true, "coupon": true}
var partnerOfferStatuses = map[string]bool{
	"inbound": true, "review": true, "marketing-ready": true, "published": true,
	"paused": true, "rejected": true, "archived": true,
}

var partnerOfferSelectCols = `id::TEXT, title, partner_name, store_id::TEXT, store_label,
	       product_id, product_label, category, offer_type, COALESCE(coupon_id::TEXT,''),
	       status, source, value_label, eligibility, active_from_date, active_to_date,
	       rejection_reason, margin_risk_note, version,
	       COALESCE(linked_campaign_id::TEXT, ''), COALESCE(created_by,''), created_by_surface,
	       created_at::TEXT, updated_at::TEXT`

func scanPartnerOffer(row interface{ Scan(dest ...any) error }) (PartnerOffer, error) {
	var o PartnerOffer
	err := row.Scan(&o.ID, &o.Title, &o.PartnerName, &o.StoreID, &o.StoreLabel,
		&o.ProductID, &o.ProductLabel, &o.Category, &o.OfferType, &o.CouponID,
		&o.Status, &o.Source, &o.ValueLabel, &o.Eligibility,
		&o.ActiveFromDate, &o.ActiveToDate, &o.RejectionReason, &o.MarginRiskNote,
		&o.Version, &o.LinkedCampaignID, &o.CreatedBy, &o.CreatedBySurface,
		&o.CreatedAt, &o.UpdatedAt)
	return o, err
}

func ListPartnerOffers(db *sql.DB) ([]PartnerOffer, error) {
	rows, err := db.Query(`SELECT ` + partnerOfferSelectCols + `
		FROM dsh_partner_offers WHERE archived_at IS NULL ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PartnerOffer{}
	for rows.Next() {
		o, err := scanPartnerOffer(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func ListPartnerOffersByStore(db *sql.DB, storeID string) ([]PartnerOffer, error) {
	rows, err := db.Query(`SELECT `+partnerOfferSelectCols+`
		FROM dsh_partner_offers
		WHERE archived_at IS NULL AND store_id::TEXT=$1 ORDER BY created_at DESC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PartnerOffer{}
	for rows.Next() {
		o, err := scanPartnerOffer(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func getPartnerOffer(db *sql.DB, id string) (PartnerOffer, error) {
	o, err := scanPartnerOffer(db.QueryRow(`SELECT `+partnerOfferSelectCols+`
		FROM dsh_partner_offers WHERE id::TEXT=$1 AND archived_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return PartnerOffer{}, ErrNotFound
	}
	return o, err
}

type CreatePartnerOfferInput struct {
	Title            string
	PartnerName      string
	StoreID          string
	StoreLabel       string
	ProductID        string
	ProductLabel     string
	Category         string
	OfferType        string
	ValueLabel       string
	Eligibility      string
	CreatedBy        string
	CreatedBySurface string
	CorrelationID    string
}

func CreatePartnerOffer(db *sql.DB, in CreatePartnerOfferInput) (PartnerOffer, error) {
	if strings.TrimSpace(in.Title) == "" || strings.TrimSpace(in.ValueLabel) == "" || strings.TrimSpace(in.StoreID) == "" {
		return PartnerOffer{}, ErrInvalid
	}
	if in.OfferType == "" {
		in.OfferType = "discount"
	}
	if in.Eligibility == "" {
		in.Eligibility = "all"
	}
	if in.CreatedBySurface == "" {
		in.CreatedBySurface = "app-partner"
	}
	if !partnerOfferTypes[in.OfferType] {
		return PartnerOffer{}, ErrInvalid
	}
	o, err := scanPartnerOffer(db.QueryRow(`
		INSERT INTO dsh_partner_offers
			(title,partner_name,store_id,store_label,product_id,product_label,category,
			offer_type,status,source,value_label,eligibility,created_by,created_by_surface)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'inbound','partner',$9,$10,$11,$12)
		RETURNING `+partnerOfferSelectCols,
		strings.TrimSpace(in.Title), in.PartnerName, in.StoreID, in.StoreLabel,
		in.ProductID, in.ProductLabel, in.Category, in.OfferType,
		strings.TrimSpace(in.ValueLabel), in.Eligibility, in.CreatedBy, in.CreatedBySurface))
	if err != nil {
		return PartnerOffer{}, err
	}
	_ = WriteAuditEvent(db, "partner_offer", o.ID, in.CreatedBy, "partner", "create", "", in.CorrelationID, nil, partnerOfferJSON(o))
	return o, nil
}

type UpdatePartnerOfferInput struct {
	Status          *string
	Title           *string
	ValueLabel      *string
	Eligibility     *string
	ActiveFromDate  *string
	ActiveToDate    *string
	RejectionReason *string
	MarginRiskNote  *string
	CouponID        *string
	ExpectedVersion int
	ActorID         string
	CorrelationID   string
}

func UpdatePartnerOffer(db *sql.DB, id string, in UpdatePartnerOfferInput) (PartnerOffer, error) {
	before, err := getPartnerOffer(db, id)
	if err != nil {
		return PartnerOffer{}, err
	}
	if in.ExpectedVersion <= 0 || in.ExpectedVersion != before.Version {
		return PartnerOffer{}, ErrCommercialVersionConflict
	}
	next := before
	if in.Title != nil {
		next.Title = strings.TrimSpace(*in.Title)
		if next.Title == "" {
			return PartnerOffer{}, ErrInvalid
		}
	}
	if in.ValueLabel != nil {
		next.ValueLabel = strings.TrimSpace(*in.ValueLabel)
		if next.ValueLabel == "" {
			return PartnerOffer{}, ErrInvalid
		}
	}
	if in.Eligibility != nil {
		next.Eligibility = strings.TrimSpace(*in.Eligibility)
	}
	if in.ActiveFromDate != nil {
		next.ActiveFromDate = strings.TrimSpace(*in.ActiveFromDate)
	}
	if in.ActiveToDate != nil {
		next.ActiveToDate = strings.TrimSpace(*in.ActiveToDate)
	}
	if in.MarginRiskNote != nil {
		next.MarginRiskNote = strings.TrimSpace(*in.MarginRiskNote)
	}
	if in.RejectionReason != nil {
		next.RejectionReason = strings.TrimSpace(*in.RejectionReason)
	}
	if in.CouponID != nil {
		next.CouponID = strings.TrimSpace(*in.CouponID)
	}
	if in.Status != nil {
		if !partnerOfferStatuses[*in.Status] {
			return PartnerOffer{}, ErrInvalid
		}
		next.Status = *in.Status
	}
	if next.Status == "rejected" && next.RejectionReason == "" {
		return PartnerOffer{}, ErrRejectionReasonRequired
	}
	if next.Status == "published" {
		passed, reason, gateErr := ValidateTarget(db, "store", before.StoreID)
		if gateErr != nil {
			return PartnerOffer{}, gateErr
		}
		_ = WriteVisibilityGateCheck(db, "partner_offer", id, "store", before.StoreID, "target_client_visibility", passed, reason)
		if !passed {
			return PartnerOffer{}, ErrTargetGateFailed
		}
		if next.OfferType == "coupon" {
			if next.CouponID == "" {
				return PartnerOffer{}, ErrCouponLinkRequired
			}
			coupon, couponErr := coupons.Get(db, next.CouponID)
			if couponErr != nil || coupon.Status != "active" || coupon.ApprovedAt == nil ||
				(coupon.StoreID != nil && *coupon.StoreID != next.StoreID) {
				return PartnerOffer{}, ErrCouponLinkRequired
			}
		}
	}
	if next.OfferType != "coupon" && next.CouponID != "" {
		return PartnerOffer{}, ErrInvalid
	}

	o, err := scanPartnerOffer(db.QueryRow(`
		UPDATE dsh_partner_offers SET
			status=$2,title=$3,value_label=$4,eligibility=$5,
			active_from_date=$6,active_to_date=$7,rejection_reason=$8,
			margin_risk_note=$9,coupon_id=NULLIF($10,'')::uuid,
			version=version+1,updated_at=NOW()
		WHERE id::TEXT=$1 AND version=$11 AND archived_at IS NULL
		RETURNING `+partnerOfferSelectCols,
		id, next.Status, next.Title, next.ValueLabel, next.Eligibility,
		next.ActiveFromDate, next.ActiveToDate, next.RejectionReason,
		next.MarginRiskNote, next.CouponID, in.ExpectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return PartnerOffer{}, ErrCommercialVersionConflict
	}
	if err != nil {
		return PartnerOffer{}, err
	}
	_ = WriteAuditEvent(db, "partner_offer", o.ID, in.ActorID, "operator", "update", "", in.CorrelationID, partnerOfferJSON(before), partnerOfferJSON(o))
	return o, nil
}

func ArchivePartnerOffer(db *sql.DB, id, actorID, correlationID string) error {
	before, err := getPartnerOffer(db, id)
	if err != nil {
		return err
	}
	res, err := db.Exec(`UPDATE dsh_partner_offers SET archived_at=NOW(),status='archived',
		version=version+1,updated_at=NOW() WHERE id::TEXT=$1 AND archived_at IS NULL`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return WriteAuditEvent(db, "partner_offer", id, actorID, "operator", "archive", "", correlationID, partnerOfferJSON(before), nil)
}
