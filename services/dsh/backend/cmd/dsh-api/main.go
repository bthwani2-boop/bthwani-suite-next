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
	"dsh-api/internal/checkoutfinanceoutbox"
	"dsh-api/internal/fieldcommissionoutbox"
	dshHttp "dsh-api/internal/http"
	"dsh-api/internal/media"
	"dsh-api/internal/operationaloutbox"
	"dsh-api/internal/promotionfundingoutbox"
	"dsh-api/internal/wlt"
	"dsh-api/internal/wltoutbox"
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
	wltServiceToken := os.Getenv("WLT_DSH_SERVICE_TOKEN")

	log.Println("[dsh-api] connecting to database...")
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("[dsh-api] failed to open database: %v", err)
	}

	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Second)

	if err := db.Ping(); err != nil {
		log.Fatalf("[dsh-api] failed to ping database: %v", err)
	}
	log.Println("[dsh-api] database connected successfully")

	appCtx, cancelApp := context.WithCancel(context.Background())
	mediaProvider := newMediaProvider(appCtx)
	identityClient := auth.NewClient(identityBaseURL)
	wltClient := wlt.NewClient(wltBaseURL, wltServiceToken)
	router := dshHttp.NewRouter(db, identityClient, wltClient, mediaProvider)
	dshHttp.RegisterPartnerSelfRoutes(router, db, identityClient, wltClient, mediaProvider)
	dshHttp.RegisterPlatformPolicyRoutes(router, db, identityClient, wltClient, mediaProvider)
	handler := dshHttp.CorsMiddleware(authMode, router)

	outboxCtx, cancelOutbox := context.WithCancel(context.Background())
	go operationaloutbox.RunWorker(outboxCtx, db, 5*time.Second)
	log.Println("[dsh-api] operational outbox worker enabled")

	if wltClient.Configured() {
		go wltoutbox.RunWorker(outboxCtx, db, wltClient, 15*time.Second)
		go fieldcommissionoutbox.RunWorker(outboxCtx, db, wltClient, 15*time.Second)
		go checkoutfinanceoutbox.RunWorker(outboxCtx, db, wltClient, 15*time.Second)
		go promotionfundingoutbox.RunWorker(outboxCtx, db, wltClient, 15*time.Second)
		log.Println("[dsh-api] WLT promotion funding outbox worker enabled")
	} else {
		log.Println("[dsh-api] WLT outbox workers disabled: DSH_WLT_BASE_URL and WLT_DSH_SERVICE_TOKEN are required")
	}

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

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	<-stop
	log.Println("[dsh-api] shutting down gracefully...")
	cancelApp()
	cancelOutbox()

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

func newMediaProvider(ctx context.Context) *media.Provider {
	endpoint := os.Getenv("DSH_MINIO_ENDPOINT")
	if endpoint == "" {
		log.Println("[dsh-api] DSH_MINIO_ENDPOINT not set, media upload routes disabled")
		return media.NewProvider(ctx, media.ProviderConfig{}, 15*time.Second)
	}
	accessKey := os.Getenv("DSH_MINIO_ACCESS_KEY")
	secretKey := os.Getenv("DSH_MINIO_SECRET_KEY")
	bucket := os.Getenv("DSH_MINIO_BUCKET")
	if bucket == "" {
		bucket = "dsh-media"
	}
	useSSL := os.Getenv("DSH_MINIO_USE_SSL") == "true"
	publicEndpoint := os.Getenv("DSH_MINIO_PUBLIC_ENDPOINT")
	publicUseSSL := os.Getenv("DSH_MINIO_PUBLIC_USE_SSL") == "true"

	log.Println("[dsh-api] media provider configured; connecting with background retry")
	return media.NewProvider(ctx, media.ProviderConfig{
		Endpoint:       endpoint,
		PublicEndpoint: publicEndpoint,
		AccessKey:      accessKey,
		SecretKey:      secretKey,
		Bucket:          bucket,
		UseSSL:          useSSL,
		PublicUseSSL:    publicUseSSL,
	}, 15*time.Second)
}
