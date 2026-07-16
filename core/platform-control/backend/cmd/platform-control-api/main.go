package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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

	service := platformcontrol.NewService()
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
	_ = server.Shutdown(ctx)
}

func envOr(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
