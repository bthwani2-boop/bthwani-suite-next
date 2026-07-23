package cache

import (
	"context"
	"testing"
	"time"
)

func TestNewClientEmptyAddrIsNil(t *testing.T) {
	if c := NewClient(""); c != nil {
		t.Fatalf("expected nil client for empty addr, got %v", c)
	}
}

func TestNilClientGetJSONIsNoOp(t *testing.T) {
	var c *Client
	var out map[string]string
	if hit := c.GetJSON(context.Background(), "any-key", &out); hit {
		t.Fatal("expected nil client GetJSON to report a miss")
	}
}

func TestNilClientSetJSONDoesNotPanic(t *testing.T) {
	var c *Client
	c.SetJSON(context.Background(), "any-key", map[string]string{"a": "b"}, time.Second)
}

// A client pointed at an address nothing is listening on proves the
// fail-open contract: a broken connection degrades to a cache miss (Get) or
// a silent no-op (Set), never an error surfaced to the caller.
func TestUnreachableClientFailsOpen(t *testing.T) {
	c := NewClient("127.0.0.1:1")
	if c == nil {
		t.Fatal("expected non-nil client for a non-empty addr")
	}

	var out map[string]string
	if hit := c.GetJSON(context.Background(), "any-key", &out); hit {
		t.Fatal("expected unreachable client GetJSON to report a miss")
	}

	c.SetJSON(context.Background(), "any-key", map[string]string{"a": "b"}, time.Second)
}
