package providers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	ErrInvalidSignature = errors.New("invalid webhook signature")
	ErrExpiredTimestamp = errors.New("webhook timestamp expired or too far in the future")
	ErrReplayedWebhook  = errors.New("webhook replay detected")
)

type WebhookVerifier struct {
	secret string
	rdb    *redis.Client
	ttl    time.Duration
}

func NewWebhookVerifier(secret string, rdb *redis.Client) *WebhookVerifier {
	return &WebhookVerifier{
		secret: secret,
		rdb:    rdb,
		ttl:    15 * time.Minute,
	}
}

// Verify checks the HMAC-SHA256 signature, the timestamp within +/- 5 minutes, and dedups the webhookID.
func (w *WebhookVerifier) Verify(ctx context.Context, payload []byte, signature, timestamp, webhookID string) error {
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return ErrInvalidSignature
	}
	t := time.Unix(ts, 0)
	now := time.Now()

	// Timestamp protection (max 5 minutes diff)
	if now.Sub(t).Abs() > 5*time.Minute {
		return ErrExpiredTimestamp
	}

	// Signature verification (HMAC-SHA256 of timestamp.payload)
	mac := hmac.New(sha256.New, []byte(w.secret))
	mac.Write([]byte(timestamp + "."))
	mac.Write(payload)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expectedMAC), []byte(signature)) {
		return ErrInvalidSignature
	}

	// Replay protection (Deduplication)
	if w.rdb != nil && webhookID != "" {
		key := "webhook:dedup:" + webhookID
		set, err := w.rdb.SetNX(ctx, key, "1", w.ttl).Result()
		if err != nil {
			return err
		}
		if !set {
			return ErrReplayedWebhook
		}
	}

	return nil
}
