package provider

import (
	"fmt"
	"os"
	"strings"
	"time"
)

type Mode string

const (
	ModeMock       Mode = "mock"
	ModeSandbox    Mode = "sandbox"
	ModeProduction Mode = "production"
)

type Config struct {
	Mode          Mode
	BaseURL       string
	TimeoutBudget time.Duration
}

func LoadConfig() (Config, error) {
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
