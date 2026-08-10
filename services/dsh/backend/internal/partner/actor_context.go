package partner

import "context"

type actorContextKey string

const (
	actorIDKey      actorContextKey = "actor_id"
	actorSurfaceKey actorContextKey = "actor_surface"
)

func WithActorContext(ctx context.Context, actorID, surface string) context.Context {
	ctx = context.WithValue(ctx, actorIDKey, actorID)
	ctx = context.WithValue(ctx, actorSurfaceKey, surface)
	return ctx
}
