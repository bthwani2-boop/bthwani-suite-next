package payout

import (
	"fmt"
	"os"
	"strings"
)

// payoutEncryptionKey returns the symmetric key used to encrypt bank
// account/IBAN/mobile-money fields at rest via pgcrypto's pgp_sym_encrypt.
// The key is only ever bound as a query parameter -- it is never
// interpolated into SQL text or written to a migration file.
func payoutEncryptionKey() (string, error) {
	key := os.Getenv("WLT_PAYOUT_ENCRYPTION_KEY")
	if key == "" {
		return "", fmt.Errorf("WLT_PAYOUT_ENCRYPTION_KEY is not configured")
	}
	return key, nil
}

func maskLast4(s string) string {
	s = strings.TrimSpace(s)
	if len(s) <= 4 {
		return strings.Repeat("*", len(s))
	}
	return strings.Repeat("*", len(s)-4) + s[len(s)-4:]
}
