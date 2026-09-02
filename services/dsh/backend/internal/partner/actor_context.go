package partner

import "context"

type actorContextKey string
type partnerIDContextKey struct{}

const (
	actorIDKey      actorContextKey = "actor_id"
	actorSurfaceKey actorContextKey = "actor_surface"
)

func WithActorContext(ctx context.Context, actorID, surface string) context.Context {
	ctx = context.WithValue(ctx, actorIDKey, actorID)
	ctx = context.WithValue(ctx, actorSurfaceKey, surface)
	return ctx
}

func WithPartnerID(ctx context.Context, partnerID string) context.Context {
	return context.WithValue(ctx, partnerIDContextKey{}, partnerID)
}

func PartnerIDFromContext(ctx context.Context) (string, bool) {
	partnerID, _ := ctx.Value(partnerIDContextKey{}).(string)
	return partnerID, partnerID != ""
}
