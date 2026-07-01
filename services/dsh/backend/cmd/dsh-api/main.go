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

	"dsh-api/internal/auth"
	dshHttp "dsh-api/internal/http"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "58080"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("[dsh-api] DATABASE_URL is required")
	}

	authMode := os.Getenv("DSH_AUTH_MODE")
	identityBaseURL := os.Getenv("DSH_IDENTITY_BASE_URL")
	wltBaseURL := os.Getenv("DSH_WLT_BASE_URL")

	log.Println("[dsh-api] connecting to database...")
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("[dsh-api] failed to open database: %v", err)
	}

	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Second)

	// Validate DB connection on start
	if err := db.Ping(); err != nil {
		log.Fatalf("[dsh-api] failed to ping database: %v", err)
	}
	log.Println("[dsh-api] database connected successfully")

	mediaClient := newMediaClientOrNil()

	router := dshHttp.NewRouter(db, auth.NewClient(identityBaseURL), wlt.NewClient(wltBaseURL), mediaClient)
	handler := dshHttp.CorsMiddleware(authMode, router)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("[dsh-api] listening on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[dsh-api] listen error: %v", err)
		}
	}()

	// Graceful shutdown setup
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	<-stop
	log.Println("[dsh-api] shutting down gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("[dsh-api] server shutdown failed: %v", err)
	}

	if err := db.Close(); err != nil {
		log.Printf("[dsh-api] database close failed: %v", err)
	}

	log.Println("[dsh-api] shutdown complete")
}

// newMediaClientOrNil connects to MinIO if DSH_MINIO_ENDPOINT is configured.
// A missing or unreachable media store disables upload/download routes
// (they respond 503) instead of preventing dsh-api from starting.
func newMediaClientOrNil() *media.Client {
	endpoint := os.Getenv("DSH_MINIO_ENDPOINT")
	if endpoint == "" {
		log.Println("[dsh-api] DSH_MINIO_ENDPOINT not set, media upload routes disabled")
		return nil
	}
	accessKey := os.Getenv("DSH_MINIO_ACCESS_KEY")
	secretKey := os.Getenv("DSH_MINIO_SECRET_KEY")
	bucket := os.Getenv("DSH_MINIO_BUCKET")
	useSSL := os.Getenv("DSH_MINIO_USE_SSL") == "true"

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := media.NewClient(ctx, endpoint, accessKey, secretKey, bucket, useSSL)
	if err != nil {
		log.Printf("[dsh-api] media store unavailable, upload routes disabled: %v", err)
		return nil
	}
	log.Println("[dsh-api] media store connected")
	return client
}
