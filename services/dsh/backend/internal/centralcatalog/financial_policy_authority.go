package centralcatalog

import (
	"encoding/json"
	"fmt"
	"time"
)

var forbiddenCatalogFinancialPolicyJSONFields = [...]string{
	"platformCommissionRate",
	"fieldPartnerOnboardingCommissionAmount",
	"fieldPartnerOnboardingCommissionCurrency",
	"storeOnboardingFeeAmount",
	"storeOnboardingFeeCurrency",
}

func rejectCatalogFinancialPolicyJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	for _, field := range forbiddenCatalogFinancialPolicyJSONFields {
		if _, exists := raw[field]; exists {
			return fmt.Errorf("%w: catalog financial policy field %q is owned by WLT", ErrInvalid, field)
		}
	}
	return nil
}

// UnmarshalJSON keeps the DSH catalog-policy command surface operational-only.
// The embedded historical CatalogPolicyInput still carries legacy financial
// members for database lineage compatibility, but no HTTP mutation may bind
// those members after the WLT financial-policy cutover.
func (input *CatalogPolicyPatchInput) UnmarshalJSON(data []byte) error {
	if err := rejectCatalogFinancialPolicyJSON(data); err != nil {
		return err
	}

	type wireInput struct {
		AllowsStoreProductCustomImage  *bool      `json:"allowsStoreProductCustomImage"`
		AllowsProductProposal          *bool      `json:"allowsProductProposal"`
		RequiresBarcode                *bool      `json:"requiresBarcode"`
		RequiresCatalogReview          *bool      `json:"requiresCatalogReview"`
		RequiresMarketingReview        *bool      `json:"requiresMarketingReview"`
		RequiresProductImage           *bool      `json:"requiresProductImage"`
		RequiresCategoryImage          *bool      `json:"requiresCategoryImage"`
		RequiresDescription            *bool      `json:"requiresDescription"`
		RequiresBrand                  *bool      `json:"requiresBrand"`
		RequiresUnit                   *bool      `json:"requiresUnit"`
		ProductDataQualityMinimumScore *float64   `json:"productDataQualityMinimumScore"`
		MaxGalleryImages               *int       `json:"maxGalleryImages"`
		ManualRequestMode              *bool      `json:"manualRequestMode"`
		IsActive                       *bool      `json:"isActive"`
		Notes                          *string    `json:"notes"`
		ExpectedVersion                *int       `json:"expectedVersion"`
		EffectiveFrom                  *time.Time `json:"effectiveFrom"`
	}

	var decoded wireInput
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*input = CatalogPolicyPatchInput{
		CatalogPolicyInput: CatalogPolicyInput{
			AllowsStoreProductCustomImage:  decoded.AllowsStoreProductCustomImage,
			AllowsProductProposal:          decoded.AllowsProductProposal,
			RequiresBarcode:                decoded.RequiresBarcode,
			RequiresCatalogReview:          decoded.RequiresCatalogReview,
			RequiresMarketingReview:        decoded.RequiresMarketingReview,
			RequiresProductImage:           decoded.RequiresProductImage,
			RequiresCategoryImage:          decoded.RequiresCategoryImage,
			RequiresDescription:            decoded.RequiresDescription,
			RequiresBrand:                  decoded.RequiresBrand,
			RequiresUnit:                   decoded.RequiresUnit,
			ProductDataQualityMinimumScore: decoded.ProductDataQualityMinimumScore,
			MaxGalleryImages:               decoded.MaxGalleryImages,
			ManualRequestMode:              decoded.ManualRequestMode,
			IsActive:                       decoded.IsActive,
			Notes:                          decoded.Notes,
		},
		ExpectedVersion: decoded.ExpectedVersion,
		EffectiveFrom:   decoded.EffectiveFrom,
	}
	return nil
}

// MarshalJSON prevents historical DSH financial-policy columns from becoming
// a read authority. Internal catalog resolution may still scan those columns
// until the later schema deletion gate is proven, but no API response exposes
// them after this cutover.
func (policy CatalogPolicy) MarshalJSON() ([]byte, error) {
	type publicPolicy struct {
		Version                        int       `json:"version"`
		ID                             string    `json:"id"`
		DomainID                       *string   `json:"domainId"`
		NodeID                         *string   `json:"nodeId"`
		PolicyScope                    string    `json:"policyScope"`
		AllowsStoreProductCustomImage  bool      `json:"allowsStoreProductCustomImage"`
		AllowsProductProposal          bool      `json:"allowsProductProposal"`
		RequiresBarcode                bool      `json:"requiresBarcode"`
		RequiresCatalogReview          bool      `json:"requiresCatalogReview"`
		RequiresMarketingReview        bool      `json:"requiresMarketingReview"`
		RequiresProductImage           bool      `json:"requiresProductImage"`
		RequiresCategoryImage          bool      `json:"requiresCategoryImage"`
		RequiresDescription            bool      `json:"requiresDescription"`
		RequiresBrand                  bool      `json:"requiresBrand"`
		RequiresUnit                   bool      `json:"requiresUnit"`
		ProductDataQualityMinimumScore float64   `json:"productDataQualityMinimumScore"`
		MaxGalleryImages               int       `json:"maxGalleryImages"`
		ManualRequestMode              bool      `json:"manualRequestMode"`
		IsActive                       bool      `json:"isActive"`
		EffectiveFrom                  time.Time `json:"effectiveFrom"`
		Notes                          string    `json:"notes"`
		CreatedAt                      time.Time `json:"createdAt"`
		UpdatedAt                      time.Time `json:"updatedAt"`
	}

	return json.Marshal(publicPolicy(policy))
}
