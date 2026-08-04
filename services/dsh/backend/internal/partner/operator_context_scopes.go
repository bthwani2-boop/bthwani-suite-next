package partner

import (
	"database/sql"
	"errors"
)

// ListPartnerScopesForActorForOperatorContext returns only active team scopes belonging
// to both the partner and authenticated OperatorContext.
func ListPartnerScopesForActorForOperatorContext(db *sql.DB, operatorContextID, partnerID, actorIdentity string, resolver map[string][]string) ([]OperationalScope, error) {
	return nil, errors.New("J014: scopes migrated to Workforce")
}
