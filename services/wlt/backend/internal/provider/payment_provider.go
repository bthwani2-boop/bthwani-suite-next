package provider

import "context"

type PaymentProvider interface {
	Post(ctx context.Context, path string, body any, meta RequestMeta) (ProviderResult, error)
	Get(ctx context.Context, path string, meta RequestMeta) (ProviderResult, error)
}
