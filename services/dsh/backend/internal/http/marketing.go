package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/marketing"
	"dsh-api/internal/store"
)

func marketingCorrelationID(r *http.Request) string {
	return r.Header.Get("X-Correlation-Id")
}

func writeMarketingError(w http.ResponseWriter, err error, notFoundMsg string) {
	switch {
	case errors.Is(err, marketing.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", notFoundMsg)
	case errors.Is(err, marketing.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "input failed validation")
	case errors.Is(err, marketing.ErrTargetGateFailed):
		store.SendError(w, http.StatusBadRequest, "TARGET_GATE_FAILED", "target failed the client-visibility gate")
	case errors.Is(err, marketing.ErrInvalidTransition):
		store.SendError(w, http.StatusConflict, "INVALID_TRANSITION", "illegal status transition")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "unexpected error")
	}
}

// GET /dsh/operator/marketing/campaigns
func (s *protectedStoreServer) handleListCampaigns(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	campaigns, err := marketing.ListCampaigns(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list campaigns")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"campaigns": campaigns})
}

// POST /dsh/operator/marketing/campaigns
func (s *protectedStoreServer) handleCreateCampaign(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		StartDate   string `json:"startDate"`
		EndDate     string `json:"endDate"`
		TargetType  string `json:"targetType"`
		TargetID    string `json:"targetId"`
		Audience    string `json:"audience"`
		Placement   string `json:"placement"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	c, err := marketing.CreateCampaign(s.db, marketing.CreateCampaignInput{
		Title:            body.Title,
		Description:      body.Description,
		StartDate:        body.StartDate,
		EndDate:          body.EndDate,
		TargetType:       body.TargetType,
		TargetID:         body.TargetID,
		Audience:         body.Audience,
		Placement:        body.Placement,
		CreatedBy:        actor.ID,
		CreatedBySurface: "control-panel",
		CorrelationID:    marketingCorrelationID(r),
	})
	if err != nil {
		writeMarketingError(w, err, "campaign not found")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"campaign": c})
}

// GET /dsh/operator/marketing/campaigns/{campaignId}
func (s *protectedStoreServer) handleGetCampaign(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("campaignId")
	c, err := marketing.GetCampaign(s.db, id)
	if err != nil {
		writeMarketingError(w, err, "campaign not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"campaign": c})
}

// PATCH /dsh/operator/marketing/campaigns/{campaignId}
func (s *protectedStoreServer) handleUpdateCampaign(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("campaignId")
	var body struct {
		Status      string `json:"status"`
		Title       string `json:"title"`
		Description string `json:"description"`
		TargetType  string `json:"targetType"`
		TargetID    string `json:"targetId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	c, err := marketing.UpdateCampaign(s.db, id, marketing.UpdateCampaignInput{
		Status:        body.Status,
		Title:         body.Title,
		Description:   body.Description,
		TargetType:    body.TargetType,
		TargetID:      body.TargetID,
		ActorID:       actor.ID,
		CorrelationID: marketingCorrelationID(r),
	})
	if err != nil {
		writeMarketingError(w, err, "campaign not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"campaign": c})
}

// DELETE /dsh/operator/marketing/campaigns/{campaignId} — soft archive, not a hard delete.
func (s *protectedStoreServer) handleDeleteCampaign(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("campaignId")
	if err := marketing.ArchiveCampaign(s.db, id, actor.ID, marketingCorrelationID(r)); err != nil {
		writeMarketingError(w, err, "campaign not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"archived": true})
}

// GET /dsh/operator/marketing/tickers
func (s *protectedStoreServer) handleListTickers(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	tickers, err := marketing.ListTickers(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list tickers")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tickers": tickers})
}

// POST /dsh/operator/marketing/tickers
func (s *protectedStoreServer) handleCreateTicker(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		Message          string `json:"message"`
		Kind             string `json:"kind"`
		Status           string `json:"status"`
		Source           string `json:"source"`
		Audience         string `json:"audience"`
		DeliveryMode     string `json:"deliveryMode"`
		Priority         string `json:"priority"`
		Pinned           bool   `json:"pinned"`
		ActionType       string `json:"actionType"`
		ActionTarget     string `json:"actionTarget"`
		OpenHour         *int   `json:"openHour"`
		CloseHour        *int   `json:"closeHour"`
		CooldownMinutes  *int   `json:"cooldownMinutes"`
		RepeatGapMinutes *int   `json:"repeatGapMinutes"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	t, err := marketing.CreateTicker(s.db, marketing.CreateTickerInput{
		Message:          body.Message,
		Kind:             body.Kind,
		Status:           body.Status,
		Source:           body.Source,
		Audience:         body.Audience,
		DeliveryMode:     body.DeliveryMode,
		Priority:         body.Priority,
		Pinned:           body.Pinned,
		ActionType:       body.ActionType,
		ActionTarget:     body.ActionTarget,
		OpenHour:         body.OpenHour,
		CloseHour:        body.CloseHour,
		CooldownMinutes:  body.CooldownMinutes,
		RepeatGapMinutes: body.RepeatGapMinutes,
		CreatedBy:        actor.ID,
		CorrelationID:    marketingCorrelationID(r),
	})
	if err != nil {
		writeMarketingError(w, err, "ticker not found")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"ticker": t})
}

// PATCH /dsh/operator/marketing/tickers/{tickerId}
func (s *protectedStoreServer) handleUpdateTicker(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		Message          *string `json:"message"`
		Kind             *string `json:"kind"`
		Status           *string `json:"status"`
		Source           *string `json:"source"`
		Audience         *string `json:"audience"`
		DeliveryMode     *string `json:"deliveryMode"`
		Priority         *string `json:"priority"`
		Pinned           *bool   `json:"pinned"`
		ActionType       *string `json:"actionType"`
		ActionTarget     *string `json:"actionTarget"`
		OpenHour         *int    `json:"openHour"`
		CloseHour        *int    `json:"closeHour"`
		CooldownMinutes  *int    `json:"cooldownMinutes"`
		RepeatGapMinutes *int    `json:"repeatGapMinutes"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	t, err := marketing.UpdateTicker(s.db, r.PathValue("tickerId"), marketing.UpdateTickerInput{
		Message:          body.Message,
		Kind:             body.Kind,
		Status:           body.Status,
		Source:           body.Source,
		Audience:         body.Audience,
		DeliveryMode:     body.DeliveryMode,
		Priority:         body.Priority,
		Pinned:           body.Pinned,
		ActionType:       body.ActionType,
		ActionTarget:     body.ActionTarget,
		OpenHour:         body.OpenHour,
		CloseHour:        body.CloseHour,
		CooldownMinutes:  body.CooldownMinutes,
		RepeatGapMinutes: body.RepeatGapMinutes,
		ActorID:          actor.ID,
		CorrelationID:    marketingCorrelationID(r),
	})
	if err != nil {
		writeMarketingError(w, err, "ticker not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticker": t})
}

// DELETE /dsh/operator/marketing/tickers/{tickerId}
func (s *protectedStoreServer) handleDeleteTicker(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	if err := marketing.DeleteTicker(s.db, r.PathValue("tickerId"), actor.ID, marketingCorrelationID(r)); err != nil {
		writeMarketingError(w, err, "ticker not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"deleted": true})
}
