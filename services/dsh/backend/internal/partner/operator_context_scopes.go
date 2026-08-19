package partner

import (
	"database/sql"
	"fmt"
)

// ListPartnerScopesForActorForOperatorContext resolves executable partner
// store access exclusively from DSH's canonical store-access projection.
//
// Workforce owns workforce membership/lifecycle truth. The legacy
// dsh_store_team_members table was deliberately retired by dsh-990 and must
// never be used as a runtime authorization source.
//
// Identity remains authoritative for permission-bundle definitions. DSH maps
// only the explicit ownership scope to Identity's canonical owner bundle.
// Any future delegated partner scope must carry an authoritative Workforce /
// Identity role projection rather than recreating the retired team table.
func ListPartnerScopesForActorForOperatorContext(
	db *sql.DB,
	operatorContextID,
	partnerID,
	actorIdentity string,
	resolver map[string][]string,
) ([]OperationalScope, error) {
	operatorContextID, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return nil, err
	}

	rows, err := db.Query(`
SELECT
s.id,
s.partner_id,
s.display_name,
sas.scope_type
FROM dsh_store_actor_scopes sas
INNER JOIN dsh_stores s
ON s.id = sas.store_id
AND s.operator_context_id = sas.operator_context_id
WHERE sas.operator_context_id = $2
AND sas.actor_id = $3
AND sas.actor_role = 'partner'
AND sas.active = true
AND s.partner_id = $1
ORDER BY s.display_name ASC`,
		partnerID,
		operatorContextID,
		actorIdentity,
	)
	if err != nil {
		return nil, fmt.Errorf("query canonical partner store scopes: %w", err)
	}
	defer rows.Close()

	scopes := make([]OperationalScope, 0)

	for rows.Next() {
		var scope OperationalScope
		var scopeType string

		if err := rows.Scan(
			&scope.StoreID,
			&scope.PartnerID,
			&scope.DisplayName,
			&scopeType,
		); err != nil {
			return nil, fmt.Errorf("scan canonical partner store scope: %w", err)
		}

		var permissionBundle string

		switch scopeType {
		case "own":
			permissionBundle = "owner"
		default:
			// Delegated partner membership/role truth was moved out of the
			// retired DSH team table. Do not guess manager/staff permissions
			// from a generic store-access scope.
			return nil, fmt.Errorf(
				"partner scope type %q requires authoritative delegated role projection",
				scopeType,
			)
		}

		permissions, registered := resolver[permissionBundle]
		if !registered {
			return nil, fmt.Errorf(
				"partner permission bundle %q is not registered",
				permissionBundle,
			)
		}

		scope.ScopeID = scope.StoreID
		scope.Role = permissionBundle
		scope.Permissions = append(
			[]string(nil),
			permissions...,
		)

		scopes = append(scopes, scope)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate canonical partner store scopes: %w", err)
	}

	return scopes, nil
}
