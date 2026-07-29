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

func main() {
	port := envOr("PORT", "8082")
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("[identity-api] DATABASE_URL is required")
	}
	saasMode := strings.ToLower(strings.TrimSpace(os.Getenv("BTHWANI_SAAS_MODE")))
	bootstrapTenantID := strings.TrimSpace(os.Getenv("BTHWANI_DEFAULT_TENANT_ID"))
	if saasMode == "active" && (bootstrapTenantID == "" || bootstrapTenantID == "local-dsh") {
		log.Fatal("[identity-api] active SaaS mode requires an explicit non-local BTHWANI_DEFAULT_TENANT_ID")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("[identity-api] open database: %v", err)
	}
	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Second)
	if err := db.Ping(); err != nil {
		log.Fatalf("[identity-api] ping database: %v", err)
	}

	repository := identity.NewRepository(db)
	localBootstrap := identity.LocalBootstrap{
		Enabled:  strings.EqualFold(strings.TrimSpace(os.Getenv("IDENTITY_LOCAL_BOOTSTRAP")), "true"),
		Password: os.Getenv("IDENTITY_LOCAL_BOOTSTRAP_PASSWORD"),
		TenantID: bootstrapTenantID,
	}
	if localBootstrap.Enabled && saasMode == "active" {
		log.Fatal("[identity-api] IDENTITY_LOCAL_BOOTSTRAP is forbidden when BTHWANI_SAAS_MODE=active")
	}
	if localBootstrap.Enabled && localBootstrap.TenantID == "" {
		log.Fatal("[identity-api] BTHWANI_DEFAULT_TENANT_ID is required when local bootstrap is enabled")
	}
	if err := repository.BootstrapLocalActors(context.Background(), localBootstrap); err != nil {
		log.Fatalf("[identity-api] local bootstrap: %v", err)
	}
	if err := repository.BootstrapLocalPlatformActors(context.Background(), localBootstrap); err != nil {
		log.Fatalf("[identity-api] local platform separation bootstrap: %v", err)
	}
	if err := repository.BootstrapSovereignLeadershipAccess(context.Background(), localBootstrap); err != nil {
		log.Fatalf("[identity-api] local sovereign leadership bootstrap: %v", err)
	}

	router := identityhttp.NewRouter(db, repository)
	identityhttp.RegisterEmployeeAccessRoutes(router, repository)
	authTenantScopedRouter := identityhttp.SaaSAuthTenantBoundary(repository, router)
	issuerScopedRouter := identityhttp.SaaSActivationIssuerBoundary(db, authTenantScopedRouter)
	tenantScopedRouter := identityhttp.SaaSTenantBoundary(db, issuerScopedRouter)
	otpScopedRouter := identityhttp.SaaSOtpBoundary(repository, tenantScopedRouter)
	server := &http.Server{
		Addr: ":" + port,
		Handler: identityhttp.BrowserOriginGuard(
			identityhttp.CorsMiddleware(
				identityhttp.RequestContractMiddleware(
					identityhttp.ActivationSafetyMiddleware(otpScopedRouter),
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
	_ = db.Close()
}

func envOr(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
