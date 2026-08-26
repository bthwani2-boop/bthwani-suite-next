package provider

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
)

var ErrEntropyUnavailable = errors.New("entropy source unavailable for idempotency material")

type RequestMeta struct {
	CorrelationID  string
	IdempotencyKey string
}

func NewRequestMeta(prefix string) RequestMeta {
	if prefix == "" {
		prefix = "wlt-provider"
	}

	token, err := randomToken()
	if err != nil {
		// Fail closed: cannot create idempotency material without entropy
		panic(fmt.Sprintf("failed to create RequestMeta: %v", err))
	}

	return RequestMeta{
		CorrelationID:  fmt.Sprintf("%s-%s", prefix, token),
		IdempotencyKey: fmt.Sprintf("%s-%s", prefix, token),
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

func randomToken() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", ErrEntropyUnavailable
	}
	return hex.EncodeToString(b[:]), nil
}
