package provider

import (
	"context"
	"errors"
	"fmt"
)

var ErrProductionProviderUnavailable = errors.New("production financial provider adapter is not implemented")

type ProductionPaymentAdapter struct{}

func NewProductionPaymentAdapter() *ProductionPaymentAdapter {
	return &ProductionPaymentAdapter{}
}

func (p *ProductionPaymentAdapter) Post(ctx context.Context, path string, body any, meta RequestMeta) (ProviderResult, error) {
	return ProviderResult{}, fmt.Errorf("%w: refusing financial mutation path %s", ErrProductionProviderUnavailable, path)
}

func (p *ProductionPaymentAdapter) Get(ctx context.Context, path string, meta RequestMeta) (ProviderResult, error) {
	return ProviderResult{}, fmt.Errorf("%w: refusing production health/read path %s", ErrProductionProviderUnavailable, path)
}
