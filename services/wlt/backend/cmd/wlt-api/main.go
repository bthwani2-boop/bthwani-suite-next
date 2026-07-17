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

	"wlt-api/internal/dshnotify"
	"wlt-api/internal/dshoutbox"
	wltHttp "wlt-api/internal/http"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("[wlt-api] DATABASE_URL is required")
	}

	authMode := os.Getenv("WLT_AUTH_MODE")

	dshBaseURL := os.Getenv("WLT_DSH_BASE_URL")
	dshServiceToken := os.Getenv("DSH_WLT_SERVICE_TOKEN")
	dshClient := dshnotify.NewClient(dshBaseURL, dshServiceToken)

	log.Println("[wlt-api] connecting to database...")
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("[wlt-api] failed to open database: %v", err)
	}

	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Second)

	if err := db.Ping(); err != nil {
		log.Fatalf("[wlt-api] failed to ping database: %v", err)
	}
	log.Println("[wlt-api] database connected successfully")

	mutationsEnabled := os.Getenv("WLT_MUTATIONS_ENABLED") == "true"
	router := wltHttp.NewRouter(db, mutationsEnabled)
	handler := wltHttp.CorsMiddleware(authMode, router)

	var cancelOutbox context.CancelFunc = func() {}
	if dshClient.Configured() {
		outboxCtx, stopOutbox := context.WithCancel(context.Background())
		cancelOutbox = stopOutbox
		go dshoutbox.RunWorker(outboxCtx, db, dshClient, 15*time.Second)
	} else {
		log.Println("[wlt-api] DSH outbox worker disabled: WLT_DSH_BASE_URL and DSH_WLT_SERVICE_TOKEN are required")
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("[wlt-api] listening on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[wlt-api] listen error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	<-stop
	log.Println("[wlt-api] shutting down gracefully...")
	cancelOutbox()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("[wlt-api] server shutdown failed: %v", err)
	}

	if err := db.Close(); err != nil {
		log.Printf("[wlt-api] database close failed: %v", err)
	}

	log.Println("[wlt-api] shutdown complete")
}
