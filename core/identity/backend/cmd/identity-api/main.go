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

	identityhttp "identity-api/internal/http"
	"identity-api/internal/identity"
)

func main() {
	port := envOr("PORT", "8082")
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("[identity-api] DATABASE_URL is required")
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
		Enabled:  os.Getenv("IDENTITY_LOCAL_BOOTSTRAP") == "true",
		Password: os.Getenv("IDENTITY_LOCAL_BOOTSTRAP_PASSWORD"),
	}
	if err := repository.BootstrapLocalActors(context.Background(), localBootstrap); err != nil {
		log.Fatalf("[identity-api] local bootstrap: %v", err)
	}
	if err := repository.BootstrapLocalPlatformActors(context.Background(), localBootstrap); err != nil {
		log.Fatalf("[identity-api] local platform separation bootstrap: %v", err)
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler: identityhttp.BrowserCorsMiddleware(identityhttp.CorsMiddleware(
			identityhttp.ActivationSafetyMiddleware(identityhttp.NewRouter(db, repository)),
		)),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
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
