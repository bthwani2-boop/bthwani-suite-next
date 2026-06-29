package provider

import "testing"

func TestLoadConfigRejectsProductionWithoutGuard(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "production")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "https://provider.example")
	t.Setenv("WLT_ALLOW_PRODUCTION_PROVIDER", "false")

	if _, err := LoadConfig(); err == nil {
		t.Fatal("expected production mode without guard to fail")
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
