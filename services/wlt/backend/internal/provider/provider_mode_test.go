package provider

import (
	"errors"
	"strings"
	"testing"
)

func TestLoadConfigRejectsUnsetProviderMode(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "")

	if _, err := LoadConfig(); err == nil {
		t.Fatal("expected an unset provider mode to fail closed")
	}
}

func TestLoadConfigRejectsProductionWithoutApprovedAdapter(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "production")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "https://provider.example")
	t.Setenv("WLT_ALLOW_PRODUCTION_PROVIDER", "true")

	if _, err := LoadConfig(); err == nil {
		t.Fatal("expected production mode to remain blocked until the approved adapter and release evidence exist")
	}
}

func TestLoadConfigProductionRequiresAdapterEvidenceAndNeverFallsBackToMock(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "production")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "http://wiremock-financial-provider:8080")
	t.Setenv("WLT_ALLOW_PRODUCTION_PROVIDER", "true")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")

	config, err := LoadConfig()
	if err == nil {
		t.Fatal("expected production mode to remain unavailable")
	}
	if !errors.Is(err, ErrProductionProviderUnavailable) {
		t.Fatalf("expected ErrProductionProviderUnavailable, got %v", err)
	}
	for _, required := range []string{"real approved provider adapter", "same-commit runtime evidence"} {
		if !strings.Contains(err.Error(), required) {
			t.Fatalf("production blocker must name %q, got %v", required, err)
		}
	}
	if config != (Config{}) {
		t.Fatalf("production failure must not return a fallback config: %+v", config)
	}
}

func TestLoadConfigAllowsSandboxProvider(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "sandbox")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "https://sandbox-provider.example")

	config, err := LoadConfig()
	if err != nil {
		t.Fatalf("expected sandbox config to load: %v", err)
	}
	if config.Mode != ModeSandbox {
		t.Fatalf("expected sandbox mode, got %s", config.Mode)
	}
	if config.BaseURL != "https://sandbox-provider.example" {
		t.Fatalf("unexpected base URL: %s", config.BaseURL)
	}
}

func TestLoadConfigRejectsSandboxWithoutBaseURL(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "sandbox")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "")

	if _, err := LoadConfig(); err == nil {
		t.Fatal("expected sandbox mode without a base URL to fail closed")
	}
}

func TestLoadConfigRejectsMockWithoutExplicitAuthorization(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "")

	if _, err := LoadConfig(); err == nil {
		t.Fatal("expected mock mode without WLT_ALLOW_MOCK_PROVIDER=true to fail closed")
	}
}

func TestLoadConfigAllowsExplicitLocalMock(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")

	config, err := LoadConfig()
	if err != nil {
		t.Fatalf("expected explicitly authorized local mock mode to load: %v", err)
	}
	if config.Mode != ModeMock || config.BaseURL != "http://wiremock-financial-provider:8080" {
		t.Fatalf("unexpected explicit mock config: %+v", config)
	}
}
