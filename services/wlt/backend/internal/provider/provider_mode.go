package provider

import (
	"fmt"
	"os"
)

type Mode string

const (
	ModeMock       Mode = "mock"
	ModeSandbox    Mode = "sandbox"
	ModeProduction Mode = "production"
)

type Config struct {
	Mode    Mode
	BaseURL string
}

func LoadConfig() (Config, error) {
	mode := Mode(os.Getenv("WLT_FINANCIAL_PROVIDER_MODE"))
	if mode == "" {
		mode = ModeMock
	}

	baseURL := os.Getenv("WLT_FINANCIAL_PROVIDER_BASE_URL")
	if baseURL == "" {
		baseURL = "http://wiremock-financial-provider:8080"
	}

	if mode != ModeMock && mode != ModeSandbox && mode != ModeProduction {
		return Config{}, fmt.Errorf("unsupported WLT_FINANCIAL_PROVIDER_MODE: %s", mode)
	}

	if mode == ModeProduction {
		return Config{}, fmt.Errorf("%w: WLT_FINANCIAL_PROVIDER_MODE=production is blocked until a real provider adapter, secret reference, inquiry, webhook verification, and reconciliation are implemented", ErrProductionProviderUnavailable)
	}

	return Config{Mode: mode, BaseURL: baseURL}, nil
}

func NewPaymentProvider(config Config) (PaymentProvider, error) {
	switch config.Mode {
	case ModeMock, ModeSandbox:
		return NewClient(config), nil
	case ModeProduction:
		return nil, fmt.Errorf("%w: production provider construction is disabled", ErrProductionProviderUnavailable)
	default:
		return nil, fmt.Errorf("unsupported provider mode: %s", config.Mode)
	}
}

func NewDefaultPaymentProvider() (PaymentProvider, error) {
	config, err := LoadConfig()
	if err != nil {
		return nil, err
	}
	return NewPaymentProvider(config)
}
