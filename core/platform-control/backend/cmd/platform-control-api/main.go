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

	"platform-control-api/internal/auth"
	platformhttp "platform-control-api/internal/http"
	"platform-control-api/internal/platformcontrol"
)

func main() {
	port := envOr("PORT", "8088")
	identityBaseURL := os.Getenv("PLATFORM_CONTROL_IDENTITY_BASE_URL")
	if identityBaseURL == "" {
		log.Fatal("[platform-control-api] PLATFORM_CONTROL_IDENTITY_BASE_URL is required")
	}
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("[platform-control-api] DATABASE_URL is required")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("[platform-control-api] open database: %v", err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxIdleTime(30 * time.Second)
	if err := db.Ping(); err != nil {
		log.Fatalf("[platform-control-api] database unavailable: %v", err)
	}
	defer db.Close()

	repository := platformcontrol.NewRepository(db)
	service := platformcontrol.NewService(repository)
	authClient := auth.NewClient(identityBaseURL)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      platformhttp.CorsMiddleware(platformhttp.NewRouter(service, authClient)),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[platform-control-api] listening on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[platform-control-api] listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("[platform-control-api] shutdown: %v", err)
	}
}

func envOr(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
