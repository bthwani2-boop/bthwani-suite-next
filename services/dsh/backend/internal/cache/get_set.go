package cache

import (
	"context"
	"encoding/json"
	"log"
	"time"
)

// GetJSON reports a cache hit only when the key exists and unmarshals
// cleanly. A nil client, a miss, or any Redis error all resolve to false —
// callers always fall back to their normal (DB) read path.
func (c *Client) GetJSON(ctx context.Context, key string, out any) bool {
	if c == nil {
		return false
	}
	raw, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return false
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return false
	}
	return true
}

// SetJSON best-effort caches val under key for ttl. Errors are logged, never
// returned — a broken or unreachable cache must never fail the request.
func (c *Client) SetJSON(ctx context.Context, key string, val any, ttl time.Duration) {
	if c == nil {
		return
	}
	raw, err := json.Marshal(val)
	if err != nil {
		log.Printf("[cache] marshal failed for key %s: %v", key, err)
		return
	}
	if err := c.rdb.Set(ctx, key, raw, ttl).Err(); err != nil {
		log.Printf("[cache] set failed for key %s: %v", key, err)
	}
}
