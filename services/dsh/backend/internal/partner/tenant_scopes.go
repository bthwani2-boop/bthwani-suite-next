package partner

import "database/sql"

// ListPartnerScopesForActorForTenant returns only active team scopes belonging
// to both the partner and authenticated tenant.
func ListPartnerScopesForActorForTenant(db *sql.DB, tenantID, partnerID, actorIdentity string) ([]OperationalScope, error) {
	tenantID, err := normalizeTenantID(tenantID)
	if err != nil {
		return nil, err
	}
	rows, err := db.Query(`
		SELECT s.id, s.partner_id, s.display_name, tm.role AS role
		FROM dsh_stores s
		INNER JOIN dsh_store_team_members tm
			ON tm.store_id = s.id AND tm.identity_actor_id = $3 AND tm.status = 'active'
		WHERE s.partner_id = $1 AND s.tenant_id = $2
		ORDER BY s.display_name ASC`, partnerID, tenantID, actorIdentity)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	scopes := make([]OperationalScope, 0)
	for rows.Next() {
		var scope OperationalScope
		if err := rows.Scan(&scope.StoreID, &scope.PartnerID, &scope.DisplayName, &scope.Role); err != nil {
			return nil, err
		}
		scope.ScopeID = scope.StoreID
		scope.Permissions = permissionsForRole(scope.Role)
		scopes = append(scopes, scope)
	}
	return scopes, rows.Err()
}
