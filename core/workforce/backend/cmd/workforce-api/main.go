package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	"workforce-api/internal/auth"
	"workforce-api/internal/dshclient"
	workforcehttp "workforce-api/internal/http"
	"workforce-api/internal/identityclient"
	"workforce-api/internal/wltclient"
	"workforce-api/internal/workforce"
)

func main() {
	port := envOr("PORT", "8086")
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("[workforce-api] DATABASE_URL is required")
	}
	identityBaseURL := os.Getenv("WORKFORCE_IDENTITY_BASE_URL")
	if identityBaseURL == "" {
		log.Fatal("[workforce-api] WORKFORCE_IDENTITY_BASE_URL is required")
	}
	serviceToken := os.Getenv("WORKFORCE_IDENTITY_SERVICE_TOKEN")
	if serviceToken == "" {
		log.Fatal("[workforce-api] WORKFORCE_IDENTITY_SERVICE_TOKEN is required")
	}
	dshBaseURL := os.Getenv("WORKFORCE_DSH_BASE_URL")
	if dshBaseURL == "" {
		log.Fatal("[workforce-api] WORKFORCE_DSH_BASE_URL is required")
	}
	wltBaseURL := os.Getenv("WORKFORCE_WLT_BASE_URL")
	if wltBaseURL == "" {
		log.Fatal("[workforce-api] WORKFORCE_WLT_BASE_URL is required")
	}
	wltServiceToken := os.Getenv("WORKFORCE_WLT_SERVICE_TOKEN")
	if wltServiceToken == "" {
		log.Fatal("[workforce-api] WORKFORCE_WLT_SERVICE_TOKEN is required")
	}
	tenantID := envOr("BTHWANI_DEFAULT_TENANT_ID", "local-dsh")

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("[workforce-api] open database: %v", err)
	}
	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Second)
	if err := db.Ping(); err != nil {
		log.Fatalf("[workforce-api] ping database: %v", err)
	}

	repo := workforce.NewRepository(db)
	identity := identityclient.NewClient(identityBaseURL, serviceToken)
	dsh := dshclient.NewClient(dshBaseURL)
	wlt := wltclient.NewClient(wltBaseURL, wltServiceToken, tenantID)
	service := workforce.NewService(repo, identity, dsh)
	authClient := auth.NewClient(identityBaseURL)

	baseRouter := workforcehttp.NewRouter(db, service, repo, authClient)
	workforcehttp.RegisterOperationalCoreRoutes(baseRouter, repo, authClient)
	workforcehttp.RegisterOperationalEnforcementRoutes(baseRouter, repo, authClient, wlt)
	workforcehttp.RegisterEmployeeGovernanceRoutes(baseRouter, repo, authClient)
	operationalCoreRouter := workforcehttp.OperationalCoreGateMiddleware(baseRouter, repo, authClient)
	journeyRouter := workforcehttp.Journey003MutationMiddleware(operationalCoreRouter, repo, authClient)
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      workforcehttp.CorsMiddleware(workforcehttp.ActivationMutationSafetyMiddleware(journeyRouter)),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[workforce-api] listening on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[workforce-api] listen: %v", err)
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
