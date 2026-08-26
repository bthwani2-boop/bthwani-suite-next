package fixtures

import "context"

func legacyAudit(ctx context.Context, repo repository) error {
	return repo.RecordAudit(ctx, "oc", "actor", "role", "target", "a", "op", nil, nil, "", "", "")
}
