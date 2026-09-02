package auth

import identityauth "github.com/bthwani2-boop/bthwani-shared-resilience/identityauth"

var (
	ErrUnauthenticated     = identityauth.ErrUnauthenticated
	ErrIdentityUnavailable = identityauth.ErrIdentityUnavailable
)

type Permission = identityauth.Permission
type Identity = identityauth.Identity
type Client = identityauth.Client

var NewClient = identityauth.NewClient
