package homediscovery

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type HomeContentEventInput struct {
	EventType        string `json:"eventType"`
	ContentKind      string `json:"contentKind"`
	ContentID        string `json:"contentId"`
	ViewerRef        string `json:"viewerRef"`
	CityCode         string `json:"cityCode,omitempty"`
	ServiceAreaCode  string `json:"serviceAreaCode,omitempty"`
	AudienceSegment  string `json:"audienceSegment"`
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

	var sourceTable, entityType, eventTable string
	switch kind {
	case "banners":
		sourceTable, entityType = "dsh_home_banners", "banner"
	case "promos":
		sourceTable, entityType = "dsh_home_promos", "promo"
	default:
		return fmt.Errorf("invalid content kind")
	}
	if eventType == "impression" {
		eventTable = "dsh_marketing_impressions"
	} else {
		eventTable = "dsh_marketing_clicks"
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
	if err := db.QueryRowContext(
		ctx,
		query,
		contentID,
		cityCode,
		serviceAreaCode,
		audienceSegment,
		kind,
	).Scan(&publishable); err != nil {
		return err
	}
	if !publishable {
		return fmt.Errorf("content not publishable for context")
	}

	_, err := db.ExecContext(ctx, `INSERT INTO `+eventTable+`
		(id,entity_type,entity_id,surface,viewer_ref)
		VALUES ($1,$2,$3,'app-client',$4)
		ON CONFLICT DO NOTHING`,
		fmt.Sprintf("home-%s-%d", eventType, time.Now().UnixNano()), entityType, contentID, viewerRef,
	)
	return err
}
