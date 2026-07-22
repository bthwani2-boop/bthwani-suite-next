package homediscovery

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

type HomeContentEventInput struct {
	EventType       string `json:"eventType"`
	ContentKind     string `json:"contentKind"`
	ContentID       string `json:"contentId"`
	ViewerRef       string `json:"viewerRef"`
	CityCode        string `json:"cityCode,omitempty"`
	ServiceAreaCode string `json:"serviceAreaCode,omitempty"`
	AudienceSegment string `json:"audienceSegment"`
}

func HandleHomeContentEvent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
		defer r.Body.Close()
		var input HomeContentEventInput
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			sendError(w, http.StatusBadRequest, "INVALID_EVENT", "invalid marketing event")
			return
		}
		if err := RecordHomeContentEvent(r.Context(), db, input); err != nil {
			switch err.Error() {
			case "content not publishable for context":
				sendError(w, http.StatusNotFound, "CONTENT_NOT_PUBLISHABLE", err.Error())
			default:
				sendError(w, http.StatusBadRequest, "INVALID_EVENT", err.Error())
			}
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func RecordHomeContentEvent(ctx context.Context, db *sql.DB, input HomeContentEventInput) error {
	eventType := strings.TrimSpace(input.EventType)
	kind := strings.TrimSpace(input.ContentKind)
	contentID := strings.TrimSpace(input.ContentID)
	viewerRef := strings.TrimSpace(input.ViewerRef)
	cityCode := strings.TrimSpace(input.CityCode)
	serviceAreaCode := strings.TrimSpace(input.ServiceAreaCode)
	audienceSegment := strings.TrimSpace(input.AudienceSegment)
	if eventType != "impression" && eventType != "click" {
		return fmt.Errorf("invalid event type")
	}
	if contentID == "" {
		return fmt.Errorf("contentId is required")
	}
	if len(viewerRef) < 8 || len(viewerRef) > 160 || !homeTargetCodePattern.MatchString(viewerRef) {
		return fmt.Errorf("invalid viewerRef")
	}
	if cityCode != "" && !homeTargetCodePattern.MatchString(cityCode) {
		return fmt.Errorf("invalid cityCode")
	}
	if serviceAreaCode != "" && !homeTargetCodePattern.MatchString(serviceAreaCode) {
		return fmt.Errorf("invalid serviceAreaCode")
	}
	if audienceSegment != "guest" && audienceSegment != "authenticated" {
		return fmt.Errorf("invalid audienceSegment")
	}

	entityType, entityID, publishable, err := resolvePublishableHomeEntity(
		ctx, db, kind, contentID, cityCode, serviceAreaCode, audienceSegment,
	)
	if err != nil {
		return err
	}
	if !publishable {
		return fmt.Errorf("content not publishable for context")
	}

	eventTable := "dsh_marketing_clicks"
	if eventType == "impression" {
		eventTable = "dsh_marketing_impressions"
	}
	digest := sha256.Sum256([]byte(strings.Join([]string{
		eventType, entityType, entityID, viewerRef,
	}, "|")))
	_, err = db.ExecContext(ctx, `INSERT INTO `+eventTable+`
		(id,entity_type,entity_id,surface,viewer_ref)
		VALUES ($1,$2,$3,'app-client',$4)
		ON CONFLICT DO NOTHING`,
		fmt.Sprintf("home-%x", digest[:]), entityType, entityID, viewerRef,
	)
	return err
}

func resolvePublishableHomeEntity(
	ctx context.Context,
	db *sql.DB,
	kind string,
	contentID string,
	cityCode string,
	serviceAreaCode string,
	audienceSegment string,
) (string, string, bool, error) {
	if kind == "promos" && strings.HasPrefix(contentID, "campaign:") {
		entityID := strings.TrimPrefix(contentID, "campaign:")
		var publishable bool
		err := db.QueryRowContext(ctx, `SELECT EXISTS (
			SELECT 1 FROM dsh_marketing_campaigns c
			LEFT JOIN dsh_stores s ON c.target_type='store' AND s.id::TEXT=c.target_id
			WHERE c.id::TEXT=$1
			  AND c.archived_at IS NULL
			  AND c.status='active'
			  AND (c.audience='all' OR (c.audience='client' AND $4='authenticated'))
			  AND COALESCE(c.start_date,'') <> ''
			  AND COALESCE(c.end_date,'') <> ''
			  AND c.start_date <= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
			  AND c.end_date >= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
			  AND (
			    c.target_type IS NULL OR c.target_type='' OR
			    (c.target_type='store' AND s.id IS NOT NULL AND `+clientEligibleStorePredicate+`
			      AND ($2='' OR s.city_code=$2)
			      AND ($3='' OR s.service_area_code=$3)) OR
			    (c.target_type='category' AND EXISTS (
			      SELECT 1 FROM dsh_catalog_domains d
			      WHERE d.id=c.target_id AND d.is_active=TRUE AND d.is_client_visible=TRUE
			    ))
			  )
		)`, entityID, cityCode, serviceAreaCode, audienceSegment).Scan(&publishable)
		return "campaign", entityID, publishable, err
	}
	if kind == "promos" && strings.HasPrefix(contentID, "partner-offer:") {
		entityID := strings.TrimPrefix(contentID, "partner-offer:")
		var publishable bool
		err := db.QueryRowContext(ctx, `SELECT EXISTS (
			SELECT 1 FROM dsh_partner_offers o
			JOIN dsh_stores s ON s.id=o.store_id
			WHERE o.id::TEXT=$1
			  AND o.archived_at IS NULL
			  AND o.status='published'
			  AND (o.eligibility='all' OR (o.eligibility='client' AND $4='authenticated'))
			  AND o.active_from_date <> ''
			  AND o.active_to_date <> ''
			  AND o.active_from_date <= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
			  AND o.active_to_date >= TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')
			  AND `+clientEligibleStorePredicate+`
			  AND ($2='' OR s.city_code=$2)
			  AND ($3='' OR s.service_area_code=$3)
		)`, entityID, cityCode, serviceAreaCode, audienceSegment).Scan(&publishable)
		return "partner_offer", entityID, publishable, err
	}

	var sourceTable, entityType string
	switch kind {
	case "banners":
		sourceTable, entityType = "dsh_home_banners", "banner"
	case "promos":
		sourceTable, entityType = "dsh_home_promos", "promo"
	default:
		return "", "", false, fmt.Errorf("invalid content kind")
	}
	var publishable bool
	query := `SELECT EXISTS (
		SELECT 1 FROM ` + sourceTable + ` c
		WHERE c.id = $1
		  AND c.is_active = TRUE
		  AND c.publication_status = 'published'
		  AND c.approved_at IS NOT NULL
		  AND (c.publish_from IS NULL OR c.publish_from <= NOW())
		  AND (c.publish_until IS NULL OR c.publish_until > NOW())
		  AND (
			NOT EXISTS (
				SELECT 1 FROM dsh_home_content_targets t
				WHERE t.content_kind=$5 AND t.content_id=c.id AND t.target_type='city'
			)
			OR ($2 <> '' AND EXISTS (
				SELECT 1 FROM dsh_home_content_targets t
				WHERE t.content_kind=$5 AND t.content_id=c.id
				  AND t.target_type='city' AND t.target_value=$2
			))
		  )
		  AND (
			NOT EXISTS (
				SELECT 1 FROM dsh_home_content_targets t
				WHERE t.content_kind=$5 AND t.content_id=c.id AND t.target_type='service_area'
			)
			OR ($3 <> '' AND EXISTS (
				SELECT 1 FROM dsh_home_content_targets t
				WHERE t.content_kind=$5 AND t.content_id=c.id
				  AND t.target_type='service_area' AND t.target_value=$3
			))
		  )
		  AND (
			NOT EXISTS (
				SELECT 1 FROM dsh_home_content_targets t
				WHERE t.content_kind=$5 AND t.content_id=c.id AND t.target_type='audience'
			)
			OR EXISTS (
				SELECT 1 FROM dsh_home_content_targets t
				WHERE t.content_kind=$5 AND t.content_id=c.id
				  AND t.target_type='audience' AND t.target_value=$4
			)
		  )
	)`
	err := db.QueryRowContext(ctx, query, contentID, cityCode, serviceAreaCode, audienceSegment, kind).Scan(&publishable)
	return entityType, contentID, publishable, err
}
