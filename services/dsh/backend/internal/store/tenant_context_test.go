package store

import "dsh-api/internal/testdb"

func init() { testdb.ConfigureTrustedTenantContext() }
