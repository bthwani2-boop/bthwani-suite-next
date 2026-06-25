package http

import (
	"errors"
	"net/http"
	"strconv"

	"dsh-api/internal/marketing"
	"dsh-api/internal/store"
)

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
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	c, err := marketing.CreateCampaign(s.db, marketing.CreateCampaignInput{
		Title:       body.Title,
		Description: body.Description,
		StartDate:   body.StartDate,
		EndDate:     body.EndDate,
		CreatedBy:   actor.ID,
	})
	if errors.Is(err, marketing.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "title is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create campaign")
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
	if errors.Is(err, marketing.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "campaign not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get campaign")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"campaign": c})
}

// PATCH /dsh/operator/marketing/campaigns/{campaignId}
func (s *protectedStoreServer) handleUpdateCampaign(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("campaignId")
	var body struct {
		Status      string `json:"status"`
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	c, err := marketing.UpdateCampaign(s.db, id, body.Status, body.Title, body.Description)
	if errors.Is(err, marketing.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "campaign not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update campaign")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"campaign": c})
}

// DELETE /dsh/operator/marketing/campaigns/{campaignId}
func (s *protectedStoreServer) handleDeleteCampaign(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("campaignId")
	if err := marketing.DeleteCampaign(s.db, id); errors.Is(err, marketing.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "campaign not found")
		return
	} else if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete campaign")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"deleted": true})
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
		Title     string `json:"title"`
		ImageURL  string `json:"imageUrl"`
		ActionURL string `json:"actionUrl"`
		Position  int    `json:"position"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	b, err := marketing.CreateBanner(s.db, body.Title, body.ImageURL, body.ActionURL, body.Position, actor.ID)
	if errors.Is(err, marketing.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "title is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create banner")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"banner": b})
}

// PATCH /dsh/operator/marketing/banners/{bannerId}
func (s *protectedStoreServer) handleUpdateBanner(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("bannerId")
	var body struct {
		IsActive bool   `json:"isActive"`
		Title    string `json:"title"`
		ImageURL string `json:"imageUrl"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	b, err := marketing.UpdateBanner(s.db, id, body.IsActive, body.Title, body.ImageURL)
	if errors.Is(err, marketing.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "banner not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update banner")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"banner": b})
}

// DELETE /dsh/operator/marketing/banners/{bannerId}
func (s *protectedStoreServer) handleDeleteBanner(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	id := r.PathValue("bannerId")
	if err := marketing.DeleteBanner(s.db, id); errors.Is(err, marketing.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "banner not found")
		return
	} else if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to delete banner")
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
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	p, err := marketing.CreatePromo(s.db, body.Code, body.Description, body.ExpiresAt, actor.ID)
	if errors.Is(err, marketing.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "code is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create promo")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"promo": p})
}

// PATCH /dsh/operator/marketing/promos/{promoId}
func (s *protectedStoreServer) handleUpdatePromo(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
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
	p, err := marketing.UpdatePromo(s.db, id, body.Status)
	if errors.Is(err, marketing.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "promo not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update promo")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"promo": p})
}

var _ = strconv.Itoa // prevent unused import
