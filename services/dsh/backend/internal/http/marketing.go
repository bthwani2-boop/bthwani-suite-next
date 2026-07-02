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

// GET /dsh/operator/marketing/banners
func (s *protectedStoreServer) handleListBanners(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	banners, err := marketing.ListBanners(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list banners")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"banners": banners})
}

// POST /dsh/operator/marketing/banners
func (s *protectedStoreServer) handleCreateBanner(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		Title      string `json:"title"`
		ImageURL   string `json:"imageUrl"`
		ActionURL  string `json:"actionUrl"`
		Position   int    `json:"position"`
		TargetType string `json:"targetType"`
		TargetID   string `json:"targetId"`
		Audience   string `json:"audience"`
		Placement  string `json:"placement"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	b, err := marketing.CreateBanner(s.db, marketing.CreateBannerInput{
		Title:            body.Title,
		ImageURL:         body.ImageURL,
		ActionURL:        body.ActionURL,
		Position:         body.Position,
		TargetType:       body.TargetType,
		TargetID:         body.TargetID,
		Audience:         body.Audience,
		Placement:        body.Placement,
		CreatedBy:        actor.ID,
		CreatedBySurface: "control-panel",
		CorrelationID:    marketingCorrelationID(r),
	})
	if err != nil {
		writeMarketingError(w, err, "banner not found")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"banner": b})
}

// PATCH /dsh/operator/marketing/banners/{bannerId}
func (s *protectedStoreServer) handleUpdateBanner(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("bannerId")
	var body struct {
		IsActive   bool   `json:"isActive"`
		Title      string `json:"title"`
		ImageURL   string `json:"imageUrl"`
		TargetType string `json:"targetType"`
		TargetID   string `json:"targetId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	b, err := marketing.UpdateBanner(s.db, id, marketing.UpdateBannerInput{
		IsActive:      body.IsActive,
		Title:         body.Title,
		ImageURL:      body.ImageURL,
		TargetType:    body.TargetType,
		TargetID:      body.TargetID,
		ActorID:       actor.ID,
		CorrelationID: marketingCorrelationID(r),
	})
	if err != nil {
		writeMarketingError(w, err, "banner not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"banner": b})
}

// DELETE /dsh/operator/marketing/banners/{bannerId} — soft delete, not a hard delete.
func (s *protectedStoreServer) handleDeleteBanner(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("bannerId")
	if err := marketing.DeleteBanner(s.db, id, actor.ID, marketingCorrelationID(r)); err != nil {
		writeMarketingError(w, err, "banner not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// GET /dsh/operator/marketing/promos
func (s *protectedStoreServer) handleListPromos(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	promos, err := marketing.ListPromos(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list promos")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"promos": promos})
}

// POST /dsh/operator/marketing/promos
func (s *protectedStoreServer) handleCreatePromo(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	var body struct {
		Code        string `json:"code"`
		Description string `json:"description"`
		ExpiresAt   string `json:"expiresAt"`
		TargetType  string `json:"targetType"`
		TargetID    string `json:"targetId"`
		Audience    string `json:"audience"`
		Placement   string `json:"placement"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	p, err := marketing.CreatePromo(s.db, marketing.CreatePromoInput{
		Code:             body.Code,
		Description:      body.Description,
		ExpiresAt:        body.ExpiresAt,
		TargetType:       body.TargetType,
		TargetID:         body.TargetID,
		Audience:         body.Audience,
		Placement:        body.Placement,
		CreatedBy:        actor.ID,
		CreatedBySurface: "control-panel",
		CorrelationID:    marketingCorrelationID(r),
	})
	if err != nil {
		writeMarketingError(w, err, "promo not found")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"promo": p})
}

// PATCH /dsh/operator/marketing/promos/{promoId}
func (s *protectedStoreServer) handleUpdatePromo(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("promoId")
	var body struct {
		Status string `json:"status"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	p, err := marketing.UpdatePromo(s.db, id, marketing.UpdatePromoInput{
		Status:        body.Status,
		ActorID:       actor.ID,
		CorrelationID: marketingCorrelationID(r),
	})
	if err != nil {
		writeMarketingError(w, err, "promo not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"promo": p})
}
