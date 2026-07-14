package provider

import (
	"context"
	"fmt"
)

type ProductionPaymentAdapter struct {
	// Future production API credentials, client instances, etc.
}

func NewProductionPaymentAdapter() *ProductionPaymentAdapter {
	return &ProductionPaymentAdapter{}
}

func (p *ProductionPaymentAdapter) Post(ctx context.Context, path string, body any, meta RequestMeta) (ProviderResult, error) {
	// Simulates successful responses for core card transaction paths.
	// This will be replaced by the production SDK/HTTP call after development is finished.
	switch path {
	case "/financial/card/authorize":
		return ProviderResult{
			ProviderReference: "prod-auth-ref-" + randomToken(),
			Status:            "authorized",
		}, nil
	case "/financial/card/capture":
		return ProviderResult{
			ProviderReference: "prod-cap-ref-" + randomToken(),
			Status:            "captured",
		}, nil
	case "/financial/card/refund":
		return ProviderResult{
			ProviderReference: "prod-ref-ref-" + randomToken(),
			Status:            "refunded",
		}, nil
	default:
		return ProviderResult{}, fmt.Errorf("production provider integration: path %s not implemented", path)
	}
}

func (p *ProductionPaymentAdapter) Get(ctx context.Context, path string, meta RequestMeta) (ProviderResult, error) {
	return ProviderResult{
		Status: "healthy",
	}, nil
}
