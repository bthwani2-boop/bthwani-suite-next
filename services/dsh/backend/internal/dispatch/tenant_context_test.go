package dispatch

import "dsh-api/internal/testdb"

func init() { testdb.ConfigureTrustedTenantContext() }
