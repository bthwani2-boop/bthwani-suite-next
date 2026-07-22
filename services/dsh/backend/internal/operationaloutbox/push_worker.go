package operationaloutbox

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	pushWorkerBatchSize = 50
	pushWorkerLease     = 2 * time.Minute
	maxPushAttempts     = 10
)

type PushDelivery struct {
	ID            string
	NotificationID string
	ActorID       string
	ActorType     string
	Topic         string
	Title         string
	Body          string
	ActionURL     string
	AttemptCount  int
}

type PushMessage struct {
	IdempotencyKey string            `json:"idempotencyKey"`
	NotificationID string            `json:"notificationId"`
	Tokens         []string          `json:"tokens"`
	Title          string            `json:"title"`
	Body           string            `json:"body"`
	Data           map[string]string `json:"data"`
}

type PushProvider interface {
	Send(context.Context, PushMessage) (string, error)
}

type HTTPPushProvider struct {
	endpoint string
	token    string
	client   *http.Client
}

func NewHTTPPushProvider(endpoint, token string, timeout time.Duration) (*HTTPPushProvider, error) {
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return nil, fmt.Errorf("push provider endpoint is required")
	}
	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, fmt.Errorf("push provider endpoint is invalid")
	}
	if parsed.Scheme != "https" && parsed.Scheme != "http" {
		return nil, fmt.Errorf("push provider endpoint scheme is unsupported")
	}
	if timeout <= 0 {
		timeout = 15 * time.Second
	}
	return &HTTPPushProvider{
		endpoint: endpoint,
		token:    strings.TrimSpace(token),
		client:   &http.Client{Timeout: timeout},
	}, nil
}

func (p *HTTPPushProvider) Send(ctx context.Context, message PushMessage) (string, error) {
	if p == nil || p.client == nil || p.endpoint == "" {
		return "", fmt.Errorf("push provider is not configured")
	}
	payload, err := json.Marshal(message)
	if err != nil {
		return "", fmt.Errorf("encode push request: %w", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("create push request: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Idempotency-Key", message.IdempotencyKey)
	if p.token != "" {
		request.Header.Set("Authorization", "Bearer "+p.token)
	}
	response, err := p.client.Do(request)
	if err != nil {
		return "", fmt.Errorf("send push request: %w", err)
	}
	defer response.Body.Close()
	body, readErr := io.ReadAll(io.LimitReader(response.Body, 64*1024))
	if readErr != nil {
		return "", fmt.Errorf("read push response: %w", readErr)
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("push provider returned %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
	}
	var result struct {
		MessageID string `json:"messageId"`
	}
	if len(body) > 0 {
		_ = json.Unmarshal(body, &result)
	}
	if strings.TrimSpace(result.MessageID) == "" {
		result.MessageID = message.IdempotencyKey
	}
	return result.MessageID, nil
}

func RunPushWorker(ctx context.Context, db *sql.DB, provider PushProvider, interval time.Duration) {
	if db == nil || provider == nil {
		return
	}
	if interval <= 0 {
		interval = 5 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	if err := ProcessPushOnce(ctx, db, provider); err != nil {
		log.Printf("[notification-push] startup batch failed: %v", err)
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessPushOnce(ctx, db, provider); err != nil {
				log.Printf("[notification-push] batch failed: %v", err)
			}
		}
	}
}

func ProcessPushOnce(ctx context.Context, db *sql.DB, provider PushProvider) error {
	deliveries, err := claimPushBatch(db, pushWorkerBatchSize, pushWorkerLease)
	if err != nil {
		return err
	}
	for _, delivery := range deliveries {
		tokens, err := listActivePushTokens(ctx, db, delivery.ActorID, delivery.ActorType)
		if err == nil && len(tokens) == 0 {
			err = fmt.Errorf("no active push endpoint for actor")
		}
		if err == nil {
			message := PushMessage{
				IdempotencyKey: delivery.ID,
				NotificationID: delivery.NotificationID,
				Tokens:         tokens,
				Title:          delivery.Title,
				Body:           delivery.Body,
				Data: map[string]string{
					"notificationId": delivery.NotificationID,
					"topic":          delivery.Topic,
					"actionUrl":      delivery.ActionURL,
					"actorType":      delivery.ActorType,
				},
			}
			var providerMessageID string
			providerMessageID, err = provider.Send(ctx, message)
			if err == nil {
				if markErr := markPushSent(db, delivery.ID, providerMessageID); markErr != nil {
					log.Printf("[notification-push] failed to mark %s sent: %v", delivery.ID, markErr)
				}
				continue
			}
		}
		if markErr := markPushFailed(db, delivery.ID, delivery.AttemptCount, err); markErr != nil {
			log.Printf("[notification-push] failed to persist retry for %s: %v", delivery.ID, markErr)
		}
	}
	return nil
}

func claimPushBatch(db *sql.DB, limit int, lease time.Duration) ([]PushDelivery, error) {
	if db == nil {
		return nil, fmt.Errorf("push delivery database is required")
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	rows, err := tx.Query(`
		SELECT d.id::text,
		       n.id::text,
		       n.actor_id,
		       n.actor_type,
		       n.topic,
		       n.title,
		       n.body,
		       COALESCE(n.action_url, ''),
		       d.attempt_count
		FROM dsh_notification_channel_deliveries d
		JOIN dsh_notifications n ON n.id = d.notification_id
		WHERE d.channel = 'push'
		  AND d.status = 'pending'
		  AND d.next_retry_at <= NOW()
		ORDER BY d.created_at
		LIMIT $1
		FOR UPDATE OF d SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim push delivery batch: %w", err)
	}
	defer rows.Close()
	var deliveries []PushDelivery
	for rows.Next() {
		var delivery PushDelivery
		if err := rows.Scan(
			&delivery.ID,
			&delivery.NotificationID,
			&delivery.ActorID,
			&delivery.ActorType,
			&delivery.Topic,
			&delivery.Title,
			&delivery.Body,
			&delivery.ActionURL,
			&delivery.AttemptCount,
		); err != nil {
			return nil, err
		}
		deliveries = append(deliveries, delivery)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(deliveries) > 0 {
		ids := make([]string, len(deliveries))
		for index, delivery := range deliveries {
			ids[index] = delivery.ID
		}
		if _, err := tx.Exec(`
			UPDATE dsh_notification_channel_deliveries
			SET next_retry_at = NOW() + $2::interval, updated_at = NOW()
			WHERE id = ANY($1::uuid[])`, pqStringArray(ids), lease.String()); err != nil {
			return nil, fmt.Errorf("lease push delivery batch: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return deliveries, nil
}

func listActivePushTokens(ctx context.Context, db *sql.DB, actorID, actorType string) ([]string, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT endpoint_token
		FROM dsh_notification_push_endpoints
		WHERE actor_id = $1 AND actor_type = $2 AND active = TRUE
		ORDER BY last_seen_at DESC`, actorID, actorType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tokens []string
	for rows.Next() {
		var token string
		if err := rows.Scan(&token); err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}
	return tokens, rows.Err()
}

func markPushSent(db *sql.DB, deliveryID, providerMessageID string) error {
	_, err := db.Exec(`
		UPDATE dsh_notification_channel_deliveries
		SET status = 'sent',
		    provider_message_id = $2,
		    last_error = NULL,
		    sent_at = NOW(),
		    failed_at = NULL,
		    updated_at = NOW()
		WHERE id = $1::uuid AND status = 'pending'`, deliveryID, providerMessageID)
	return err
}

func markPushFailed(db *sql.DB, deliveryID string, attemptCount int, cause error) error {
	nextAttempt := attemptCount + 1
	status := "pending"
	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	if nextAttempt >= maxPushAttempts {
		status = "failed"
	}
	errorMessage := "push delivery failed"
	if cause != nil {
		errorMessage = cause.Error()
	}
	_, err := db.Exec(`
		UPDATE dsh_notification_channel_deliveries
		SET attempt_count = $2,
		    status = $3,
		    last_error = $4,
		    next_retry_at = CASE WHEN $3 = 'pending' THEN NOW() + $5::interval ELSE next_retry_at END,
		    failed_at = CASE WHEN $3 = 'failed' THEN NOW() ELSE NULL END,
		    updated_at = NOW()
		WHERE id = $1::uuid AND status = 'pending'`,
		deliveryID, nextAttempt, status, errorMessage, backoff.String())
	return err
}
