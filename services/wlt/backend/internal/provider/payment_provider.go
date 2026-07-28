package provider

import (
	"context"
	"net/url"
)

type PaymentProvider interface {
	Post(ctx context.Context, path string, body any, meta RequestMeta) (ProviderResult, error)
	Get(ctx context.Context, path string, meta RequestMeta) (ProviderResult, error)
	InquirePayout(ctx context.Context, query url.Values) (PayoutInquiry, error)
}
