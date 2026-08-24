package main

import (
	"strings"
	"testing"
)

func TestLocalDevelopmentBootstrapDefaultsToUnauthorized(t *testing.T) {
	for _, name := range []string{
		"BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED",
		"BTHWANI_RUNTIME_MODE",
		"BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED",
		"NODE_ENV",
		"ENVIRONMENT",
		"BTHWANI_ENVIRONMENT",
	} {
		t.Setenv(name, "")
	}
	enabled, err := localDevelopmentBootstrapAuthorized()
	if err != nil {
		t.Fatalf("unauthorized default should be an inert no-op: %v", err)
	}
	if enabled {
		t.Fatal("local bootstrap must be disabled unless explicitly authorized")
	}
}

func TestLocalDevelopmentBootstrapRequiresDevelopmentRuntime(t *testing.T) {
	t.Setenv("BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED", "true")
	t.Setenv("BTHWANI_RUNTIME_MODE", "production")
	t.Setenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED", "false")

	enabled, err := localDevelopmentBootstrapAuthorized()
	if err == nil || enabled {
		t.Fatal("an explicitly authorized bootstrap must still reject a non-development runtime")
	}
	if !strings.Contains(err.Error(), "BTHWANI_RUNTIME_MODE=development") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestLocalDevelopmentBootstrapRejectsProductionAuthorization(t *testing.T) {
	t.Setenv("BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED", "true")
	t.Setenv("BTHWANI_RUNTIME_MODE", "development")
	t.Setenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED", "true")

	enabled, err := localDevelopmentBootstrapAuthorized()
	if err == nil || enabled {
		t.Fatal("production deployment authorization must fence local bootstrap writes")
	}
}

func TestLocalDevelopmentBootstrapRejectsProductionEnvironmentAliases(t *testing.T) {
	for _, name := range []string{"NODE_ENV", "ENVIRONMENT", "BTHWANI_ENVIRONMENT"} {
		t.Run(name, func(t *testing.T) {
			t.Setenv("BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED", "true")
			t.Setenv("BTHWANI_RUNTIME_MODE", "development")
			t.Setenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED", "false")
			t.Setenv("NODE_ENV", "")
			t.Setenv("ENVIRONMENT", "")
			t.Setenv("BTHWANI_ENVIRONMENT", "")
			t.Setenv(name, "production")

			enabled, err := localDevelopmentBootstrapAuthorized()
			if err == nil || enabled {
				t.Fatalf("%s=production must fence local bootstrap writes", name)
			}
		})
	}
}

func TestLocalDevelopmentBootstrapAllowsExplicitDevelopmentOnly(t *testing.T) {
	t.Setenv("BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED", "true")
	t.Setenv("BTHWANI_RUNTIME_MODE", "development")
	t.Setenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED", "false")
	t.Setenv("NODE_ENV", "development")
	t.Setenv("ENVIRONMENT", "")
	t.Setenv("BTHWANI_ENVIRONMENT", "")

	enabled, err := localDevelopmentBootstrapAuthorized()
	if err != nil {
		t.Fatalf("explicit local development authorization should pass: %v", err)
	}
	if !enabled {
		t.Fatal("explicit local development authorization should enable one-shot bootstrap")
	}
}
