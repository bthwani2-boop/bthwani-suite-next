package main

import (
	"context"
	"fmt"
	"net/http"
)

type storeActorContextKeyType struct{}

func partnerRequestWithActor(r *http.Request, actorID string) *http.Request {
	ctx := r.Context()
	ctx = context.WithValue(ctx, "actor_id", actorID)
	return r.WithContext(ctx)
}

func actorFromContext(r *http.Request) (actorID, surface string) {
	actorID, _ = r.Context().Value("actor_id").(string)
	surface, _ = r.Context().Value("actor_surface").(string)
	return actorID, surface
}

func main() {
	req, _ := http.NewRequest("GET", "/", nil)
	req = partnerRequestWithActor(req, "user_123")
	actorID, _ := actorFromContext(req)
	fmt.Printf("actorID: %q\n", actorID)
}
