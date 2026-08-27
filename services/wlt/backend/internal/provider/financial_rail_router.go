package provider

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
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
	config, err := loadInternalConfig()
	if err != nil {
		return nil, err
	}

	// Use environment-configured timeout as default; registry can override at call time
	timeoutBudget := config.TimeoutBudget
	providerType := string(config.Mode)

	// Construct internal HTTP client (implementation detail)
	client := &Client{
		baseURL: strings.TrimRight(config.BaseURL, "/"),
		httpClient: &http.Client{
			Timeout: timeoutBudget,
		},
		breaker: NewCircuitBreaker(CircuitBreakerConfig{
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

// loadInternalConfig loads provider configuration from environment.
// This is internal to the financial rail authority; consumers MUST NOT call this.
func loadInternalConfig() (Config, error) {
	mode := Mode(strings.TrimSpace(os.Getenv("WLT_FINANCIAL_PROVIDER_MODE")))
	if mode == "" {
		return Config{}, fmt.Errorf("WLT_FINANCIAL_PROVIDER_MODE is required; select mock only for explicit local simulation or sandbox for approved provider verification")
	}
	if mode != ModeMock && mode != ModeSandbox && mode != ModeProduction {
		return Config{}, fmt.Errorf("unsupported WLT_FINANCIAL_PROVIDER_MODE: %s", mode)
	}
	if mode == ModeProduction {
		return Config{}, fmt.Errorf("%w: WLT_FINANCIAL_PROVIDER_MODE=production is blocked until a real provider adapter, secret reference, inquiry, webhook verification, reconciliation, and independent release approvals are implemented", ErrProductionProviderUnavailable)
	}
	if mode == ModeMock && strings.TrimSpace(os.Getenv("WLT_ALLOW_MOCK_PROVIDER")) != "true" {
		return Config{}, fmt.Errorf("mock payment provider is disabled; set WLT_ALLOW_MOCK_PROVIDER=true only for an explicit local simulation")
	}

	baseURL := strings.TrimSpace(os.Getenv("WLT_FINANCIAL_PROVIDER_BASE_URL"))
	if baseURL == "" {
		if mode == ModeMock {
			baseURL = "http://wiremock-financial-provider:8080"
		} else {
			return Config{}, fmt.Errorf("WLT_FINANCIAL_PROVIDER_BASE_URL is required for sandbox mode")
		}
	}

	// Default timeout budget (can be overridden by registry)
	timeoutBudget := 15 * time.Second
	if tb := strings.TrimSpace(os.Getenv("WLT_FINANCIAL_PROVIDER_TIMEOUT_MS")); tb != "" {
		if ms, err := time.ParseDuration(tb + "ms"); err == nil {
			timeoutBudget = ms
		}
	}

	return Config{Mode: mode, BaseURL: baseURL, TimeoutBudget: timeoutBudget}, nil
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

func (r *FinancialRailRouter) Status(ctx context.Context, meta RequestMeta) (ProviderResult, error) {
	if err := r.checkActive(ctx, CapabilityCashInStatus); err != nil {
		return ProviderResult{}, err
	}
	return r.client.Get(ctx, cashInStatusPath, meta)
}

var _ CashInRail = (*FinancialRailRouter)(nil)
