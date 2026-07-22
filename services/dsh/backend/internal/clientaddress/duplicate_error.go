package clientaddress

import (
	"errors"

	"github.com/lib/pq"
)

const activeAddressFingerprintConstraint = "uq_dsh_client_addresses_active_fingerprint"

var ErrDuplicate = errors.New("client address already exists")

// IsDuplicateError keeps the HTTP boundary independent from driver-specific
// details while preserving the database as the final concurrency authority.
func IsDuplicateError(err error) bool {
	if errors.Is(err, ErrDuplicate) {
		return true
	}
	var databaseError *pq.Error
	return errors.As(err, &databaseError) &&
		string(databaseError.Code) == "23505" &&
		databaseError.Constraint == activeAddressFingerprintConstraint
}
