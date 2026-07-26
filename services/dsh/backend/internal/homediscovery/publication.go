package homediscovery

import "dsh-api/internal/store"

// clientEligibleStorePredicate is the package-local compatibility binding used
// by marketing/event projections whose outer store alias is "s". The predicate
// itself remains owned by store.ClientStorefrontPredicate so all app-client
// discovery paths share one publication truth.
var clientEligibleStorePredicate = store.ClientStorefrontPredicate("s")
