package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"

	"identity-api/internal/localbootstrap"
)

func main() {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("BTHWANI_RUNTIME_MODE")), "development") {
		log.Fatal("identity-local-bootstrap is restricted to BTHWANI_RUNTIME_MODE=development")
	}
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("open identity database: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(4)
	db.SetConnMaxIdleTime(30 * time.Second)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping identity database: %v", err)
	}
	config := localbootstrap.Config{
		Password:          os.Getenv("BTHWANI_LOCAL_DEV_PASSWORD"),
		OperatorContextID: os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"),
	}
	if err := localbootstrap.Run(ctx, db, config); err != nil {
		log.Fatalf("identity local development seed failed: %v", err)
	}
	converged, err := localbootstrap.Converged(ctx, db, config)
	if err != nil {
		log.Fatalf("identity local development seed readback failed: %v", err)
	}
	if !converged {
		log.Fatal("identity local development seed readback did not converge")
	}
	log.Print("identity local development seed: PASS")
}
