package operationaloutbox

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/lib/pq"

	"github.com/google/uuid"
)

const (
	pushWorkerBatchSize      = 50
	pushWorkerLease          = 2 * time.Minute
	pushWorkerReconcileLease = 2 * time.Minute
	maxPushAttempts          = 10
)

type PushDelivery struct {
	ID                     string
	NotificationID         string
	ActorID                string
	ActorType              string
	Topic                  string
	Title                  string
	Body                   string
	ActionURL              string
	AttemptCount           int
	ProviderIdempotencyKey string
	LeaseToken             string
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

// PushProviderError is the provider boundary's explicit outcome classification.
// Unknown means the request may have reached the provider and must never be
// retried as a fresh delivery without provider reconciliation.
type PushProviderError struct {
	Unknown bool
	Cause   error
}

func (e *PushProviderError) Error() string {
	if e == nil || e.Cause == nil {
		return "push provider outcome is unknown"
	}
	return e.Cause.Error()
}

func (e *PushProviderError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

// PushDeliveryReconciler is optional because not every provider exposes an
// inquiry API. Providers that do expose one may resolve UNKNOWN by the same
// durable idempotency key before the worker permits another send.
type PushDeliveryReconciler interface {
	Reconcile(context.Context, string) (PushReconciliationResult, error)
}

type PushReconciliationResult struct {
	Present           bool
	ProviderMessageID string
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
		return "", &PushProviderError{Unknown: true, Cause: fmt.Errorf("send push request: %w", err)}
	}
	defer func() { _ = response.Body.Close() }()
	body, readErr := io.ReadAll(io.LimitReader(response.Body, 64*1024))
	if readErr != nil {
		return "", &PushProviderError{Unknown: true, Cause: fmt.Errorf("read push response: %w", readErr)}
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return "", &PushProviderError{
			Unknown: response.StatusCode >= http.StatusInternalServerError,
			Cause:   fmt.Errorf("push provider returned %d: %s", response.StatusCode, strings.TrimSpace(string(body))),
		}
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

type SessionVerifier interface {
	IsSessionValid(ctx context.Context, actorID, sessionID string) (bool, error)
}

func RunPushWorker(ctx context.Context, db *sql.DB, provider PushProvider, verifier SessionVerifier, interval time.Duration) {
	if db == nil || provider == nil {
		return
	}
	if interval <= 0 {
		interval = 5 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	if err := ProcessPushOnce(ctx, db, provider, verifier); err != nil {
		log.Printf("[notification-push] startup batch failed: %v", err)
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessPushOnce(ctx, db, provider, verifier); err != nil {
				log.Printf("[notification-push] batch failed: %v", err)
			}
		}
	}
}

func ProcessPushOnce(ctx context.Context, db *sql.DB, provider PushProvider, verifier SessionVerifier) error {
	if err := markExpiredPushSends(db); err != nil {
		return err
	}
	if reconciler, ok := provider.(PushDeliveryReconciler); ok {
		if err := reconcileUnknownPushes(ctx, db, reconciler); err != nil {
			log.Printf("[notification-push] unknown delivery reconciliation failed: %v", err)
		}
	}
	deliveries, err := claimPushBatch(db, pushWorkerBatchSize, pushWorkerLease)
	if err != nil {
		return err
	}
	for _, delivery := range deliveries {
		endpoints, err := listActivePushEndpoints(ctx, db, delivery.ActorID, delivery.ActorType)
		var tokens []string
		if err == nil {
			for _, ep := range endpoints {
				// For critical OTP pushes or in general, verify session if a verifier is provided
				if verifier != nil && ep.IdentitySessionID != "" {
					valid, vErr := verifier.IsSessionValid(ctx, delivery.ActorID, ep.IdentitySessionID)
					if vErr != nil {
						tokens = nil
						err = fmt.Errorf("session verification failed for %s: %w", ep.ID, vErr)
						break
					}
					if !valid {
						// Deactivate the token locally
						_ = deactivatePushEndpointByID(db, ep.ID)
						continue
					}
				}
				tokens = append(tokens, ep.Token)
			}
		}
		if err == nil && len(tokens) == 0 {
			err = fmt.Errorf("no active push endpoint for actor")
		}
		if err == nil {
			message := PushMessage{
				IdempotencyKey: delivery.ProviderIdempotencyKey,
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
				if markErr := markPushSent(db, delivery, providerMessageID); markErr != nil {
					log.Printf("[notification-push] failed to mark %s sent: %v", delivery.ID, markErr)
					if unknownErr := markPushUnknown(db, delivery, markErr); unknownErr != nil {
						log.Printf("[notification-push] failed to preserve unknown outcome for %s: %v", delivery.ID, unknownErr)
					}
				}
				continue
			}
		}
		if pushOutcomeUnknown(err) {
			if markErr := markPushUnknown(db, delivery, err); markErr != nil {
				log.Printf("[notification-push] failed to persist unknown outcome for %s: %v", delivery.ID, markErr)
			}
			continue
		}
		if markErr := markPushFailed(db, delivery, err); markErr != nil {
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
	defer func() { _ = tx.Rollback() }()
	rows, err := tx.Query(`
		SELECT d.id::text,
		       n.id::text,
		       n.actor_id,
		       n.actor_type,
		       n.topic,
		       n.title,
		       n.body,
		       COALESCE(n.action_url, ''),
		       d.attempt_count,
		       d.provider_idempotency_key
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
	defer func() { _ = rows.Close() }()
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
			&delivery.ProviderIdempotencyKey,
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
			SET status = 'sending', lease_token = $2::uuid,
			    lease_expires_at = NOW() + $3::interval,
			    attempt_count = attempt_count + 1,
			    last_attempt_at = NOW(), last_error = NULL, updated_at = NOW()
			WHERE id = ANY($1::uuid[]) AND status = 'pending'`, pq.Array(ids), uuid.NewString(), lease.String()); err != nil {
			return nil, fmt.Errorf("lease push delivery batch: %w", err)
		}
		// The batch UPDATE above must fence each row with its own token. Re-read
		// the tokens from the locked transaction so stale workers cannot finalize
		// a later lease using a shared batch token.
		for index := range deliveries {
			deliveries[index].LeaseToken = uuid.NewString()
			if _, err := tx.Exec(`
				UPDATE dsh_notification_channel_deliveries
				SET lease_token = $2::uuid
				WHERE id = $1::uuid AND status = 'sending'`, deliveries[index].ID, deliveries[index].LeaseToken); err != nil {
				return nil, fmt.Errorf("fence push delivery %s: %w", deliveries[index].ID, err)
			}
			deliveries[index].AttemptCount++
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return deliveries, nil
}

func pushOutcomeUnknown(err error) bool {
	if err == nil {
		return false
	}
	var providerErr *PushProviderError
	if errors.As(err, &providerErr) {
		return providerErr.Unknown
	}
	// A provider implementation that does not classify its error has not
	// proved that the request was rejected before the side-effect boundary.
	return true
}

func markExpiredPushSends(db *sql.DB) error {
	_, err := db.Exec(`
		UPDATE dsh_notification_channel_deliveries
		SET status = 'unknown', unknown_at = COALESCE(unknown_at, NOW()),
		    lease_token = NULL, lease_expires_at = NULL,
		    next_retry_at = NOW(),
		    last_error = COALESCE(last_error, 'push worker lease expired after provider boundary'),
		    updated_at = NOW()
		WHERE channel = 'push' AND status = 'sending'
		  AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())`)
	return err
}

type unknownPushDelivery struct {
	ID                     string
	ProviderIdempotencyKey string
}

func listUnknownPushDeliveries(db *sql.DB, limit int) ([]unknownPushDelivery, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	rows, err := tx.Query(`
		SELECT id::text, provider_idempotency_key
		FROM dsh_notification_channel_deliveries
		WHERE channel = 'push' AND status = 'unknown' AND next_retry_at <= NOW()
		ORDER BY updated_at, id
		LIMIT $1
		FOR UPDATE SKIP LOCKED`, limit)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	items := make([]unknownPushDelivery, 0, limit)
	for rows.Next() {
		var item unknownPushDelivery
		if err := rows.Scan(&item.ID, &item.ProviderIdempotencyKey); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, item := range items {
		if _, err := tx.Exec(`
			UPDATE dsh_notification_channel_deliveries
			SET next_retry_at = NOW() + $2::interval,
			    reconciliation_attempt_count = reconciliation_attempt_count + 1,
			    last_reconciliation_at = NOW(), updated_at = NOW()
			WHERE id = $1::uuid AND status = 'unknown'`, item.ID, pushWorkerReconcileLease.String()); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return items, nil
}

func reconcileUnknownPushes(ctx context.Context, db *sql.DB, reconciler PushDeliveryReconciler) error {
	items, err := listUnknownPushDeliveries(db, pushWorkerBatchSize)
	if err != nil {
		return err
	}
	for _, item := range items {
		result, reconcileErr := reconciler.Reconcile(ctx, item.ProviderIdempotencyKey)
		if reconcileErr != nil {
			if err := markPushReconciliationFailure(db, item.ID, reconcileErr); err != nil {
				return err
			}
			continue
		}
		if err := markPushReconciled(db, item, result); err != nil {
			return err
		}
	}
	return nil
}

func markPushReconciliationFailure(db *sql.DB, deliveryID string, cause error) error {
	_, err := db.Exec(`
		UPDATE dsh_notification_channel_deliveries
		SET last_error = $2, next_retry_at = NOW() + $3::interval, updated_at = NOW()
		WHERE id = $1::uuid AND channel = 'push' AND status = 'unknown'`, deliveryID, pushErrorText(cause), pushWorkerReconcileLease.String())
	return err
}

func markPushReconciled(db *sql.DB, delivery unknownPushDelivery, result PushReconciliationResult) error {
	status := "pending"
	var providerMessageID any
	var sentAt any
	if result.Present {
		status = "sent"
		trimmedProviderMessageID := strings.TrimSpace(result.ProviderMessageID)
		if trimmedProviderMessageID == "" {
			providerMessageID = delivery.ProviderIdempotencyKey
		} else {
			providerMessageID = trimmedProviderMessageID
		}
		sentAt = time.Now().UTC()
	}
	_, err := db.Exec(`
		UPDATE dsh_notification_channel_deliveries
		SET status = $3, provider_message_id = CASE WHEN $3 = 'sent' THEN $4 ELSE provider_message_id END,
		    sent_at = CASE WHEN $3 = 'sent' THEN $5 ELSE sent_at END,
		    unknown_at = CASE WHEN $3 = 'sent' OR $3 = 'pending' THEN NULL ELSE unknown_at END,
		    last_error = CASE WHEN $3 = 'sent' OR $3 = 'pending' THEN NULL ELSE last_error END,
		    next_retry_at = CASE WHEN $3 = 'pending' THEN NOW() ELSE next_retry_at END,
		    updated_at = NOW()
		WHERE id = $1::uuid AND provider_idempotency_key = $2 AND channel = 'push' AND status = 'unknown'`,
		delivery.ID, delivery.ProviderIdempotencyKey, status, providerMessageID, sentAt)
	return err
}

type pushEndpoint struct {
	ID                string
	Token             string
	IdentitySessionID string
}

func listActivePushEndpoints(ctx context.Context, db *sql.DB, actorID, actorType string) ([]pushEndpoint, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id::text, endpoint_token, COALESCE(identity_session_id, '')
		FROM dsh_notification_push_endpoints
		WHERE actor_id = $1 AND actor_type = $2 AND active = TRUE
		ORDER BY last_seen_at DESC`, actorID, actorType)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var endpoints []pushEndpoint
	for rows.Next() {
		var ep pushEndpoint
		if err := rows.Scan(&ep.ID, &ep.Token, &ep.IdentitySessionID); err != nil {
			return nil, err
		}
		endpoints = append(endpoints, ep)
	}
	return endpoints, rows.Err()
}

func deactivatePushEndpointByID(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE dsh_notification_push_endpoints
		SET active = FALSE, updated_at = NOW()
		WHERE id = $1::uuid`, id)
	return err
}

func markPushSent(db *sql.DB, delivery PushDelivery, providerMessageID string) error {
	result, err := db.Exec(`
		UPDATE dsh_notification_channel_deliveries
		SET status = 'sent',
		    provider_message_id = NULLIF($3, ''),
		    last_error = NULL,
		    sent_at = NOW(),
		    failed_at = NULL, unknown_at = NULL,
		    lease_token = NULL, lease_expires_at = NULL, updated_at = NOW()
		WHERE id = $1::uuid AND provider_idempotency_key = $2
		  AND status = 'sending' AND lease_token = $4::uuid`, delivery.ID, delivery.ProviderIdempotencyKey, providerMessageID, delivery.LeaseToken)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return fmt.Errorf("push delivery %s lease was lost before sent finalization", delivery.ID)
	}
	return nil
}

func markPushFailed(db *sql.DB, delivery PushDelivery, cause error) error {
	nextAttempt := delivery.AttemptCount
	status := "pending"
	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	if nextAttempt >= maxPushAttempts {
		status = "failed"
	}
	errorMessage := pushErrorText(cause)
	result, err := db.Exec(`
		UPDATE dsh_notification_channel_deliveries
		SET attempt_count = $2,
		    status = $3,
		    last_error = $4,
		    next_retry_at = CASE WHEN $3 = 'pending' THEN NOW() + $5::interval ELSE next_retry_at END,
		    failed_at = CASE WHEN $3 = 'failed' THEN NOW() ELSE NULL END,
		    lease_token = NULL, lease_expires_at = NULL,
		    updated_at = NOW()
		WHERE id = $1::uuid AND provider_idempotency_key = $6
		  AND status = 'sending' AND lease_token = $7::uuid`,
		delivery.ID, nextAttempt, status, errorMessage, backoff.String(), delivery.ProviderIdempotencyKey, delivery.LeaseToken)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return fmt.Errorf("push delivery %s lease was lost before failure finalization", delivery.ID)
	}
	return nil
}

func markPushUnknown(db *sql.DB, delivery PushDelivery, cause error) error {
	_, err := db.Exec(`
		UPDATE dsh_notification_channel_deliveries
		SET status = 'unknown', unknown_at = NOW(), last_error = $3,
		    next_retry_at = NOW() + $4::interval,
		    lease_token = NULL, lease_expires_at = NULL, updated_at = NOW()
		WHERE id = $1::uuid AND provider_idempotency_key = $2
		  AND status = 'sending' AND lease_token = $5::uuid`,
		delivery.ID, delivery.ProviderIdempotencyKey, pushErrorText(cause), pushBackoff(delivery.AttemptCount).String(), delivery.LeaseToken)
	return err
}

func pushBackoff(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 10 {
		attempt = 10
	}
	delay := time.Duration(1<<uint(attempt)) * time.Second
	if delay > 30*time.Minute {
		return 30 * time.Minute
	}
	return delay
}

func pushErrorText(cause error) string {
	if cause == nil {
		return "push delivery failed without a provider result"
	}
	return cause.Error()
}
