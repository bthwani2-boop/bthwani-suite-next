package fixtures

import "context"

func blankDiscard(ctx context.Context, repo repository) error {
	person := doCreate(ctx)
	_ = repo.StoreIdempotentResponse(ctx, person.ID, "op", "key", "hash", nil)
	return nil
}
