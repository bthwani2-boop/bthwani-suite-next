package provider

import (
	"context"
	"fmt"
)

// Capability enumerates the finite set of financial-rail operations a
// CashInRail may perform. Adding a new capability requires an explicit new
// method on CashInRail and a matching allowlisted path below — arbitrary
// paths can never reach the underlying PaymentProvider through this router.
type Capability string

const (
	CapabilityCashInAuthorize Capability = "cash_in_authorize"
	CapabilityCashInCapture   Capability = "cash_in_capture"
	CapabilityCashInRefund    Capability = "cash_in_refund"
	CapabilityCashInStatus    Capability = "cash_in_status"
)

// These paths are the existing, already-integrated provider endpoints
// (mock/sandbox wiremock contract). No speculative real-provider endpoint is
// introduced here; the rail only wraps what payment/refund already call.
const (
	cashInAuthorizePath = "/financial/card/authorize"
	cashInCapturePath   = "/financial/card/capture"
	cashInRefundPath    = "/financial/card/refund"
	cashInStatusPath    = "/financial/card/status"
)

// CashInRail is the capability-checked domain interface for Cash-In money
// movement. Unlike the underlying PaymentProvider.Post/Get (which accept an
// arbitrary path), each method here is bound to exactly one allowlisted
// capability/path pair, and no Cash-Out capability is exposed.
type CashInRail interface {
	Authorize(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error)
	Capture(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error)
	Refund(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error)
	Status(ctx context.Context, meta RequestMeta) (ProviderResult, error)
}

// FinancialRailRouter selects the single active PaymentProvider for the
// configured mode and exposes it through CashInRail. It reuses
// NewPaymentProvider for mode selection rather than reimplementing it, so
// production continues to fail closed via the existing LoadConfig/
// NewPaymentProvider guard (ModeProduction is refused before any adapter is
// constructed) with no mock/sandbox fallback.
//
// The registry/environment fields are optional (nil registry preserves
// today's behavior exactly, matching NewDefaultPaymentProvider). When a
// registry is supplied, the router additionally fails closed if the
// configured provider row is missing, inactive, or under maintenance before
// delegating any call.
type FinancialRailRouter struct {
	provider    PaymentProvider
	registry    *Registry
	environment string
}

// NewFinancialRailRouter builds a router for the given config. reg may be
// nil to skip the wlt_financial_providers activation check.
func NewFinancialRailRouter(config Config, reg *Registry, environment string) (*FinancialRailRouter, error) {
	p, err := NewPaymentProvider(config)
	if err != nil {
		return nil, err
	}
	return &FinancialRailRouter{provider: p, registry: reg, environment: environment}, nil
}

// NewDefaultFinancialRailRouter loads Config from the environment the same
// way NewDefaultPaymentProvider does, with no registry check (reg=nil),
// preserving the exact selection/fail-closed behavior already relied upon by
// existing callers.
func NewDefaultFinancialRailRouter() (*FinancialRailRouter, error) {
	config, err := LoadConfig()
	if err != nil {
		return nil, err
	}
	return NewFinancialRailRouter(config, nil, "")
}

func (r *FinancialRailRouter) checkActive(ctx context.Context, capability Capability) error {
	if r.registry == nil {
		return nil
	}
	_, _, err := r.registry.GetActiveProvider(ctx, "payment-gateway", r.environment)
	if err != nil {
		return fmt.Errorf("financial rail capability %s refused: %w", capability, err)
	}
	return nil
}

func (r *FinancialRailRouter) Authorize(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error) {
	if err := r.checkActive(ctx, CapabilityCashInAuthorize); err != nil {
		return ProviderResult{}, err
	}
	return r.provider.Post(ctx, cashInAuthorizePath, body, meta)
}

func (r *FinancialRailRouter) Capture(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error) {
	if err := r.checkActive(ctx, CapabilityCashInCapture); err != nil {
		return ProviderResult{}, err
	}
	return r.provider.Post(ctx, cashInCapturePath, body, meta)
}

func (r *FinancialRailRouter) Refund(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error) {
	if err := r.checkActive(ctx, CapabilityCashInRefund); err != nil {
		return ProviderResult{}, err
	}
	return r.provider.Post(ctx, cashInRefundPath, body, meta)
}

func (r *FinancialRailRouter) Status(ctx context.Context, meta RequestMeta) (ProviderResult, error) {
	if err := r.checkActive(ctx, CapabilityCashInStatus); err != nil {
		return ProviderResult{}, err
	}
	return r.provider.Get(ctx, cashInStatusPath, meta)
}

var _ CashInRail = (*FinancialRailRouter)(nil)
