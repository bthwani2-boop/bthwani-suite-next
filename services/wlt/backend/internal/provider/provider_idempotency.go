package provider

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
)

type RequestMeta struct {
	CorrelationID  string
	IdempotencyKey string
}

func NewRequestMeta(prefix string) RequestMeta {
	if prefix == "" {
		prefix = "wlt-provider"
	}

	return RequestMeta{
		CorrelationID:  fmt.Sprintf("%s-%s", prefix, randomToken()),
		IdempotencyKey: fmt.Sprintf("%s-%s", prefix, randomToken()),
	}
}

func RequestMetaFromHTTP(r *http.Request, prefix string) RequestMeta {
	meta := NewRequestMeta(prefix)
	if correlationID := r.Header.Get("X-Correlation-ID"); correlationID != "" {
		meta.CorrelationID = correlationID
	}
	if idempotencyKey := r.Header.Get("Idempotency-Key"); idempotencyKey != "" {
		meta.IdempotencyKey = idempotencyKey
	}
	return meta
}

func randomToken() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "random-unavailable"
	}
	return hex.EncodeToString(b[:])
}
