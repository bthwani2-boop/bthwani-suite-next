package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"

	"identity-api/internal/identity"
)

const localBootstrapTimeout = 60 * time.Second

func main() {
	enabled, err := localDevelopmentBootstrapAuthorized()
	if err != nil {
		log.Fatal(err)
	}
	if !enabled {
		log.Printf("[identity-local-bootstrap] skipped: local development bootstrap is not authorized")
		return
	}

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required for the local Identity bootstrap")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(4)
	db.SetConnMaxIdleTime(30 * time.Second)

	ctx, cancel := context.WithTimeout(context.Background(), localBootstrapTimeout)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("identity database unavailable: %v", err)
	}

	bootstrap := identity.LocalBootstrap{
		Enabled:           true,
		Password:          os.Getenv("BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD"),
		OperatorContextID: strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID")),
	}
	repository := identity.NewRepository(db)

	if err := bootstrapLocalIdentityState(ctx, repository, bootstrap); err != nil {
		log.Fatal(err)
	}
	converged, err := repository.LocalBootstrapConverged(ctx, bootstrap)
	if err != nil {
		log.Fatal(err)
	}
	if !converged {
		log.Fatal("local Identity bootstrap completed without converging its canonical actors")
	}
	log.Printf("[identity-local-bootstrap] canonical local development actors converged")
}

func localDevelopmentBootstrapAuthorized() (bool, error) {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED")), "true") {
		return false, nil
	}

	runtimeMode := strings.ToLower(strings.TrimSpace(os.Getenv("BTHWANI_RUNTIME_MODE")))
	if runtimeMode != "development" {
		return false, fmt.Errorf("local Identity bootstrap authorization requires BTHWANI_RUNTIME_MODE=development, got %q", runtimeMode)
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED")), "true") {
		return false, errors.New("local Identity bootstrap is forbidden when production deployment is authorized")
	}
	for _, name := range []string{"NODE_ENV", "ENVIRONMENT", "BTHWANI_ENVIRONMENT"} {
		if strings.EqualFold(strings.TrimSpace(os.Getenv(name)), "production") {
			return false, fmt.Errorf("local Identity bootstrap is forbidden when %s=production", name)
		}
	}
	return true, nil
}

func bootstrapLocalIdentityState(ctx context.Context, repository *identity.Repository, bootstrap identity.LocalBootstrap) error {
	if err := repository.BootstrapLocalActors(ctx, bootstrap); err != nil {
		return err
	}
	if err := repository.BootstrapLocalPlatformActors(ctx, bootstrap); err != nil {
		return err
	}
	if err := repository.BootstrapSovereignLeadershipAccess(ctx, bootstrap); err != nil {
		return err
	}
	return repository.ReconcileLocalBootstrapSecurityState(ctx, bootstrap)
}
