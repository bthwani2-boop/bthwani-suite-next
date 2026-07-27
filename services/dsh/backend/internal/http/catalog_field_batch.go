package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

const maxFieldAssortmentBatchItems = 100

type fieldAssortmentBatchRequest struct {
	Items []fieldAssortmentBatchItem `json:"items"`
}

type fieldAssortmentBatchItem struct {
	MasterProductID      string  `json:"masterProductId"`
	UnitPrice            float64 `json:"unitPrice"`
	Currency             string  `json:"currency"`
	Available            bool    `json:"available"`
	StockStatus          string  `json:"stockStatus"`
	LocalNote            string  `json:"localNote"`
	CustomImageObjectKey *string `json:"customImageObjectKey"`
	PublicationStatus    string  `json:"publicationStatus"`
	ExpectedVersion      *int    `json:"expectedVersion"`
}

type fieldAssortmentBatchResult struct {
	Index           int                             `json:"index"`
	MasterProductID string                          `json:"masterProductId"`
	Status          string                          `json:"status"`
	Assortment      *centralcatalog.StoreAssortment `json:"assortment,omitempty"`
	Code            string                          `json:"code,omitempty"`
	Message         string                          `json:"message,omitempty"`
	CurrentVersion  *int                            `json:"currentVersion,omitempty"`
	ExpectedVersion *int                            `json:"expectedVersion,omitempty"`
}

type fieldAssortmentBatchResponse struct {
	Results   []fieldAssortmentBatchResult `json:"results"`
	Succeeded int                          `json:"succeeded"`
	Failed    int                          `json:"failed"`
}

func batchCatalogError(err error) (code, message string, currentVersion, expectedVersion *int) {
	var conflict *centralcatalog.ConflictError
	switch {
	case errors.As(err, &conflict):
		return "CONFLICT", "assortment changed; reload the current version before retrying", &conflict.CurrentVersion, conflict.ExpectedVersion
	case errors.Is(err, centralcatalog.ErrConflict):
		return "CONFLICT", "assortment changed; reload before retrying", nil, nil
	case errors.Is(err, centralcatalog.ErrNotFound):
		return "NOT_FOUND", "central catalog product or assortment was not found", nil, nil
	case errors.Is(err, centralcatalog.ErrInvalid):
		return "INVALID_REQUEST", "invalid price, stock status, or assortment input", nil, nil
	case errors.Is(err, centralcatalog.ErrForbidden):
		return "FORBIDDEN", "product or custom image is not permitted by catalog policy", nil, nil
	default:
		return "INTERNAL_ERROR", "central catalog operation failed", nil, nil
	}
}

func failedFieldBatchResult(index int, masterProductID string, err error) fieldAssortmentBatchResult {
	code, message, currentVersion, expectedVersion := batchCatalogError(err)
	return fieldAssortmentBatchResult{
		Index:           index,
		MasterProductID: masterProductID,
		Status:          "failed",
		Code:            code,
		Message:         message,
		CurrentVersion:  currentVersion,
		ExpectedVersion: expectedVersion,
	}
}

// POST /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/batch
//
// Saves a field-onboarded store's central-catalog links in one request. Every
// item is governed independently: an invalid/conflicting row never rolls back
// successful rows, and OCC remains mandatory for edits to existing rows.
func (s *protectedStoreServer) handleFieldUpsertStoreAssortmentBatch(w http.ResponseWriter, r *http.Request) {
	actorID, resolvedStoreID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	if resolvedStoreID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to this partner draft")
		return
	}

	var request fieldAssortmentBatchRequest
	if !decodeProtectedJSON(w, r, &request) {
		return
	}
	if len(request.Items) == 0 || len(request.Items) > maxFieldAssortmentBatchItems {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "items must contain between 1 and 100 products")
		return
	}

	response := fieldAssortmentBatchResponse{
		Results: make([]fieldAssortmentBatchResult, 0, len(request.Items)),
	}
	seen := make(map[string]struct{}, len(request.Items))

	for index, item := range request.Items {
		masterProductID := strings.TrimSpace(item.MasterProductID)
		if masterProductID == "" {
			response.Results = append(response.Results, failedFieldBatchResult(index, masterProductID, centralcatalog.ErrInvalid))
			response.Failed++
			continue
		}
		if _, duplicate := seen[masterProductID]; duplicate {
			response.Results = append(response.Results, fieldAssortmentBatchResult{
				Index: index, MasterProductID: masterProductID, Status: "failed",
				Code: "DUPLICATE_ITEM", Message: "master product appears more than once in the same batch",
			})
			response.Failed++
			continue
		}
		seen[masterProductID] = struct{}{}

		masterProduct, err := centralcatalog.GetMasterProduct(r.Context(), s.db, masterProductID)
		if err != nil {
			response.Results = append(response.Results, failedFieldBatchResult(index, masterProductID, err))
			response.Failed++
			continue
		}
		if masterProduct.ApprovalStatus != "approved" || !masterProduct.IsActive {
			response.Results = append(response.Results, failedFieldBatchResult(index, masterProductID, centralcatalog.ErrForbidden))
			response.Failed++
			continue
		}

		nodeID := ""
		if masterProduct.CategoryNodeID != nil {
			nodeID = *masterProduct.CategoryNodeID
		}
		policy, err := centralcatalog.ResolveEffectivePolicy(r.Context(), s.db, masterProduct.DomainID, nodeID)
		if err != nil {
			response.Results = append(response.Results, failedFieldBatchResult(index, masterProductID, err))
			response.Failed++
			continue
		}

		input := centralcatalog.StoreAssortmentInput{
			UnitPrice:            item.UnitPrice,
			Currency:             item.Currency,
			Available:            item.Available,
			StockStatus:          item.StockStatus,
			LocalNote:            item.LocalNote,
			CustomImageObjectKey: item.CustomImageObjectKey,
			// Field intake may request draft/submitted, but the server never
			// trusts a client-supplied publication transition. Every batch row
			// enters the governed submitted state for downstream review.
			PublicationStatus: "submitted",
			ExpectedVersion:   item.ExpectedVersion,
		}
		assortment, err := centralcatalog.UpsertStoreAssortmentAtomic(
			r.Context(), s.db, resolvedStoreID, masterProductID, actorID, input, policy.AllowsStoreProductCustomImage,
		)
		if err != nil {
			response.Results = append(response.Results, failedFieldBatchResult(index, masterProductID, err))
			response.Failed++
			continue
		}

		assortmentCopy := assortment
		response.Results = append(response.Results, fieldAssortmentBatchResult{
			Index: index, MasterProductID: masterProductID, Status: "saved", Assortment: &assortmentCopy,
		})
		response.Succeeded++
	}

	store.SendJSON(w, http.StatusOK, response)
}
