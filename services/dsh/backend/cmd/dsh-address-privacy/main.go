package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/clientaddress"
	_ "github.com/lib/pq"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	runID := strings.TrimSpace(os.Getenv("DSH_PRIVACY_RUN_ID"))
	if len(runID) < 8 {
		return fmt.Errorf("DSH_PRIVACY_RUN_ID must contain at least 8 characters")
	}
	limit := 0
	if raw := strings.TrimSpace(os.Getenv("DSH_PRIVACY_BATCH_LIMIT")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 10000 {
			return fmt.Errorf("DSH_PRIVACY_BATCH_LIMIT must be between 1 and 10000")
		}
		limit = parsed
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}

	result, err := clientaddress.AnonymizeExpiredIdempotent(
		ctx,
		db,
		limit,
		clientaddress.PrivacyMutationContext{
			ActorID:        "dsh-address-privacy-worker",
			IdempotencyKey: runID,
			CorrelationID:  runID,
		},
	)
	if err != nil {
		return fmt.Errorf("anonymize expired addresses: %w", err)
	}
	body, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("encode result: %w", err)
	}
	fmt.Println(string(body))
	return nil
}
