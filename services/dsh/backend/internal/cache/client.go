// Package cache provides an optional, fail-open response cache backed by
// Valkey/Redis. A nil *Client (the default when no address is configured)
// makes every method a safe no-op, so callers never need to branch on
// whether caching is enabled.
package cache

import (
	"github.com/redis/go-redis/v9"
)

type Client struct {
	rdb *redis.Client
}

// NewClient returns nil when addr is empty, disabling the cache without any
// caller-side branching.
func NewClient(addr string) *Client {
	if addr == "" {
		return nil
	}
	return &Client{rdb: redis.NewClient(&redis.Options{Addr: addr})}
}
