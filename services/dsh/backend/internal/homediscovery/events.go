package homediscovery

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type HomeContentEventInput struct {
	EventType  string `json:"eventType"`
	ContentKind string `json:"contentKind"`
	ContentID  string `json:"contentId"`
	ViewerRef  string `json:"viewerRef,omitempty"`
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
			case "content not publishable":
				sendError(w, http.StatusNotFound, "CONTENT_NOT_PUBLISHABLE", err.Error())
			default:
				sendError(w, http.StatusBadRequest, "INVALID_EVENT", err.Error())
			}
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func RecordHomeContentEvent(ctx interface {
	Done() <-chan struct{}
	Err() error
	Deadline() (time.Time, bool)
	Value(key any) any
}, db *sql.DB, input HomeContentEventInput) error {
	eventType := strings.TrimSpace(input.EventType)
	kind := strings.TrimSpace(input.ContentKind)
	contentID := strings.TrimSpace(input.ContentID)
	if eventType != "impression" && eventType != "click" {
		return fmt.Errorf("invalid event type")
	}
	if contentID == "" {
		return fmt.Errorf("contentId is required")
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
		SELECT 1 FROM ` + sourceTable + `
		WHERE id = $1
		  AND is_active = TRUE
		  AND publication_status = 'published'
		  AND approved_at IS NOT NULL
		  AND (publish_from IS NULL OR publish_from <= NOW())
		  AND (publish_until IS NULL OR publish_until > NOW())
	)`
	if err := db.QueryRowContext(ctx, query, contentID).Scan(&publishable); err != nil {
		return err
	}
	if !publishable {
		return fmt.Errorf("content not publishable")
	}

	viewerRef := strings.TrimSpace(input.ViewerRef)
	if len(viewerRef) > 160 {
		return fmt.Errorf("viewerRef is too long")
	}
	_, err := db.ExecContext(ctx, `INSERT INTO `+eventTable+`
		(id,entity_type,entity_id,surface,viewer_ref)
		VALUES ($1,$2,$3,'app-client',NULLIF($4,''))`,
		fmt.Sprintf("home-%s-%d", eventType, time.Now().UnixNano()), entityType, contentID, viewerRef,
	)
	return err
}
