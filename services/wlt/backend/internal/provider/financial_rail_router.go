package provider

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	resilience "github.com/bthwani2-boop/bthwani-shared-resilience"
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
// capability/path pair, and no Cash-Out capability is exposed. Status is a
// BOUND readback: it must carry the payment session identity and the known
// provider reference so an unbound (or cross-session) provider answer can
// never be projected onto a session.
type CashInRail interface {
	Authorize(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error)
	Capture(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error)
	Refund(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error)
	Status(ctx context.Context, body StatusInquiry, meta RequestMeta) (ProviderResult, error)
}

// StatusInquiry binds a provider status readback to exactly one payment
// session and its previously observed provider reference. An inquiry without
// both bindings is refused by the rail before any HTTP traffic is sent.
type StatusInquiry struct {
	PaymentSessionID  string `json:"paymentSessionId"`
	ProviderReference string `json:"providerReference"`
}

// FinancialRailRouter is the single canonical authority for all outbound
// Cash-In money movement. It binds provider selection, environment,
// active/maintenance state, timeout budget, secret/auth material, and
// idempotency provenance to one source. The generic HTTP adapter (Client)
// is an implementation detail and cannot be constructed directly by consumers.
// Production fails closed when no real provider adapter exists.
type FinancialRailRouter struct {
	client        *Client
	registry      *Registry
	environment   string
	providerType  string
	timeoutBudget time.Duration
}

// NewFinancialRailRouter builds the canonical financial rail router.
// It loads configuration from environment, constructs the internal HTTP client,
// and optionally validates against the registry at call time. reg may be nil for
// environments without a wlt_financial_providers table (e.g., local mock), but
// production deployments MUST supply a registry to enforce active/maintenance/timeout checks.
func NewFinancialRailRouter(registry *Registry, environment string) (*FinancialRailRouter, error) {
	config, err := LoadConfig()
	if err != nil {
		return nil, err
	}

	// Use environment-configured timeout as default; registry can override at call time
	timeoutBudget := config.TimeoutBudget
	providerType := "payment-gateway"

	// Construct internal HTTP client (implementation detail). The client must
	// use the same registry identity that checkActive validates below.
	client := &Client{
		baseURL:      strings.TrimRight(config.BaseURL, "/"),
		providerType: "payment-gateway",
		environment:  strings.TrimSpace(environment),
		httpClient: &http.Client{
			Timeout: timeoutBudget,
		},
		breaker: resilience.NewCircuitBreaker(resilience.CircuitBreakerConfig{
			FailureThreshold: 5,
			SuccessThreshold: 2,
			Timeout:          30 * time.Second,
		}),
		reg: registry,
	}

	return &FinancialRailRouter{
		client:        client,
		registry:      registry,
		environment:   environment,
		providerType:  providerType,
		timeoutBudget: timeoutBudget,
	}, nil
}
func (r *FinancialRailRouter) checkActive(ctx context.Context, capability Capability) error {
	if r.registry == nil {
		// Fail closed: a rail without the provider registry authority would let
		// every call bypass active/maintenance/timeout enforcement, which is
		// exactly the bypass the registry exists to prevent. Mock-mode local
		// simulation is no exception — seed the registry row (wlt-948) instead.
		return fmt.Errorf("financial rail capability %s refused: %w", capability, ErrRailRegistryRequired)
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
	return r.client.Post(ctx, cashInAuthorizePath, body, meta)
}

func (r *FinancialRailRouter) Capture(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error) {
	if err := r.checkActive(ctx, CapabilityCashInCapture); err != nil {
		return ProviderResult{}, err
	}
	return r.client.Post(ctx, cashInCapturePath, body, meta)
}

func (r *FinancialRailRouter) Refund(ctx context.Context, body any, meta RequestMeta) (ProviderResult, error) {
	if err := r.checkActive(ctx, CapabilityCashInRefund); err != nil {
		return ProviderResult{}, err
	}
	return r.client.Post(ctx, cashInRefundPath, body, meta)
}

func (r *FinancialRailRouter) Status(ctx context.Context, inquiry StatusInquiry, meta RequestMeta) (ProviderResult, error) {
	if err := r.checkActive(ctx, CapabilityCashInStatus); err != nil {
		return ProviderResult{}, err
	}
	if strings.TrimSpace(inquiry.PaymentSessionID) == "" || strings.TrimSpace(inquiry.ProviderReference) == "" {
		return ProviderResult{}, fmt.Errorf("financial rail capability %s refused: %w", CapabilityCashInStatus, ErrUnboundStatusInquiry)
	}
	// The provider contract (wiremock card-gateway status mapping) is a POST
	// /financial/card/status carrying the bound inquiry body — not a GET.
	return r.client.Post(ctx, cashInStatusPath, inquiry, meta)
}

var _ CashInRail = (*FinancialRailRouter)(nil)
