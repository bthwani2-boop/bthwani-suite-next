package provider

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
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

func randomToken() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "random-unavailable"
	}
	return hex.EncodeToString(b[:])
}
