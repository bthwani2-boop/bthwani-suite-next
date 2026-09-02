module wlt-api

go 1.26.4

require (
	github.com/bthwani2-boop/bthwani-shared-resilience v0.0.0
	github.com/google/uuid v1.6.0
	github.com/lib/pq v1.12.3
)

replace github.com/bthwani2-boop/bthwani-shared-resilience => ../../../shared/go/resilience
