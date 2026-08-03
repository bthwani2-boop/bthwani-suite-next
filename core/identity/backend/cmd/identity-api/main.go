package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	identityhttp "identity-api/internal/http"
	"identity-api/internal/identity"
)

const localBootstrapRetryInterval = 10 * time.Second

func main() {
	port := envOr("PORT", "8082")
	databaseURL := os.Getenv("DATABASE_URL")
	bootstrapOperatorContextID := strings.TrimSpace(os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"))

	db, err := openIdentityDatabase(databaseURL)
	if err != nil {
		log.Printf("[identity-api] database configuration unavailable; liveness remains available and readiness is fail-closed")
		db = nil
	}
	if db == nil {
		log.Printf("[identity-api] DATABASE_URL is unavailable; liveness remains available and readiness is fail-closed")
	} else {
		startupProbeContext, startupProbeCancel := context.WithTimeout(context.Background(), 2*time.Second)
		if err := db.PingContext(startupProbeContext); err != nil {
			log.Printf("[identity-api] database unavailable at startup; liveness remains available and readiness is fail-closed")
		}
		startupProbeCancel()
	}

	repository := identity.NewRepository(db)
	localBootstrap := identity.LocalBootstrap{
		Enabled:           strings.EqualFold(strings.TrimSpace(os.Getenv("IDENTITY_LOCAL_BOOTSTRAP")), "true"),
		Password:          os.Getenv("IDENTITY_LOCAL_BOOTSTRAP_PASSWORD"),
		OperatorContextID: bootstrapOperatorContextID,
	}
	if db != nil {
		go retryLocalBootstrap(repository, localBootstrap)
	} else {
		log.Printf("[identity-api] local bootstrap deferred until a database is configured")
	}

	router := identityhttp.NewRouter(repository)

	identityhttp.RegisterEmployeeAccessRoutes(router, repository)
	identityhttp.RegisterPartnerAccessRoutes(router, repository)
	authRouter := identityhttp.AuthOperatorContextBoundary(repository, router)
	issuerScopedRouter := identityhttp.ActivationIssuerBoundary(db, authRouter)
	operatorScopedRouter := identityhttp.OperatorBoundary(db, issuerScopedRouter)
	internalTrustRouter := identityhttp.RuntimeOperatorContextBoundary(operatorScopedRouter)
	otpScopedRouter := identityhttp.OtpBoundary(repository, internalTrustRouter)
	// Readiness is the outer persistence boundary so no authentication,
	// activation, operator-context, or service middleware can touch persistence
	// before the authoritative fail-closed gate has passed.
	runtimeReadinessRouter := identityhttp.RuntimeReadinessBoundary(otpScopedRouter, db)
	server := &http.Server{
		Addr: ":" + port,
		Handler: identityhttp.BrowserOriginGuard(
			identityhttp.CorsMiddleware(
				identityhttp.RequestContractMiddleware(
					identityhttp.ActivationSafetyMiddleware(runtimeReadinessRouter),
				),
			),
		),
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    32 * 1024,
	}

	go func() {
		log.Printf("[identity-api] listening on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[identity-api] listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	if db != nil {
		_ = db.Close()
	}
}

func openIdentityDatabase(databaseURL string) (*sql.DB, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, nil
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Second)
	return db, nil
}

func retryLocalBootstrap(repository *identity.Repository, bootstrap identity.LocalBootstrap) {
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		err := bootstrapLocalIdentityState(ctx, repository, bootstrap)
		cancel()
		if err == nil {
			if bootstrap.Enabled {
				log.Printf("[identity-api] local development identity bootstrap is ready")
			}
			return
		}
		log.Printf("[identity-api] local bootstrap deferred; readiness remains authoritative")
		time.Sleep(localBootstrapRetryInterval)
	}
}

func bootstrapLocalIdentityState(
	ctx context.Context,
	repository *identity.Repository,
	bootstrap identity.LocalBootstrap,
) error {
	if err := repository.BootstrapLocalActors(ctx, bootstrap); err != nil {
		return err
	}
	if err := repository.BootstrapLocalPlatformActors(ctx, bootstrap); err != nil {
		return err
	}
	return repository.BootstrapSovereignLeadershipAccess(ctx, bootstrap)
}

func envOr(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
