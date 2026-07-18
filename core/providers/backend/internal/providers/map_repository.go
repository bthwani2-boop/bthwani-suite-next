package providers

import (
	"context"
	"encoding/json"
)

func (r *Repository) ListProvidersByKind(ctx context.Context, kind string) ([]ExternalProvider, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT provider_id, kind, code, active, credentials, parameters, updated_at
		FROM external_providers
		WHERE kind = $1 AND active = TRUE
		ORDER BY code ASC`, kind)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []ExternalProvider{}
	for rows.Next() {
		var provider ExternalProvider
		var credentials, parameters []byte
		if err := rows.Scan(
			&provider.ProviderID,
			&provider.Kind,
			&provider.Code,
			&provider.Active,
			&credentials,
			&parameters,
			&provider.UpdatedAt,
		); err != nil {
			return nil, err
		}
		provider.Credentials = json.RawMessage(credentials)
		provider.Parameters = json.RawMessage(parameters)
		list = append(list, provider)
	}
	return list, rows.Err()
}
