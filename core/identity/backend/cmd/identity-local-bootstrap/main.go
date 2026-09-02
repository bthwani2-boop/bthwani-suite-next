package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"

	"identity-api/internal/localbootstrap"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() (err error) {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("BTHWANI_RUNTIME_MODE")), "development") {
		return errors.New("identity-local-bootstrap is restricted to BTHWANI_RUNTIME_MODE=development")
	}
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		return errors.New("DATABASE_URL is required")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("open identity database: %w", err)
	}
	defer func() {
		if closeErr := db.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("close identity database: %w", closeErr)
		}
	}()
	db.SetMaxOpenConns(4)
	db.SetConnMaxIdleTime(30 * time.Second)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("ping identity database: %w", err)
	}
	config := localbootstrap.Config{
		Password:          os.Getenv("BTHWANI_LOCAL_DEV_PASSWORD"),
		OperatorContextID: os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID"),
	}
	if err := localbootstrap.Run(ctx, db, config); err != nil {
		return fmt.Errorf("identity local development seed failed: %w", err)
	}
	converged, err := localbootstrap.Converged(ctx, db, config)
	if err != nil {
		return fmt.Errorf("identity local development seed readback failed: %w", err)
	}
	if !converged {
		return errors.New("identity local development seed readback did not converge")
	}
	log.Print("identity local development seed: PASS")
	return nil
}
