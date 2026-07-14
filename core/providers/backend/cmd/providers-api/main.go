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

	"providers-api/internal/auth"
	providershttp "providers-api/internal/http"
	"providers-api/internal/providers"
)

func main() {
	port := envOr("PORT", "8087")
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("[providers-api] DATABASE_URL is required")
	}
	identityBaseURL := os.Getenv("PROVIDERS_IDENTITY_BASE_URL")
	if identityBaseURL == "" {
		log.Fatal("[providers-api] PROVIDERS_IDENTITY_BASE_URL is required")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("[providers-api] open database: %v", err)
	}
	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Second)
	if err := db.Ping(); err != nil {
		log.Fatalf("[providers-api] ping database: %v", err)
	}

	repo := providers.NewRepository(db)
	service := providers.NewService(repo)
	authClient := auth.NewClient(identityBaseURL)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      providershttp.CorsMiddleware(providershttp.NewRouter(db, service, repo, authClient)),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[providers-api] listening on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[providers-api] listen: %v", err)
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
