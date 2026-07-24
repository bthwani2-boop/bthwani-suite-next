package fieldreadiness

import "dsh-api/internal/testdb"

func init() { testdb.ConfigureTrustedTenantContext() }
