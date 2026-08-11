// Package testsupport provides deterministic-uniqueness helpers shared by WLT
// test suites. It is imported only from _test.go files.
package testsupport

import (
	"fmt"
	"os"
	"sync/atomic"
	"time"
)

var identitySequence atomic.Uint64

// UniqueID returns an identifier that is unique within and across concurrent
// test processes.
//
// A bare time.Now().UnixNano() is not a unique-identity source: the Windows
// system clock granularity is coarse enough that two calls in the same test
// binary can return the same value, which surfaced as a duplicate-key failure
// against wlt_payment_sessions_topup_reference_idx. The process id separates
// concurrent `go test` packages and the atomic sequence separates calls that
// share a clock tick.
func UniqueID(prefix string) string {
	return fmt.Sprintf("%s-%d-%d-%d", prefix, os.Getpid(), time.Now().UnixNano(), identitySequence.Add(1))
}

// UniqueSuffix returns the unique portion of UniqueID without a prefix, for
// callers that compose their own identifiers.
func UniqueSuffix() string {
	return fmt.Sprintf("%d-%d-%d", os.Getpid(), time.Now().UnixNano(), identitySequence.Add(1))
}
