package platformpolicies

import "dsh-api/internal/testdb"

func init() { testdb.ConfigureTrustedTenantContext() }
