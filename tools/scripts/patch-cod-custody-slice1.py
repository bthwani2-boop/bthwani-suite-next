from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(path: str, token: str) -> None:
    text = (ROOT / path).read_text(encoding="utf-8")
    if token not in text:
        raise RuntimeError(f"required COD custody token missing from {path}: {token}")


require(
    "services/dsh/backend/internal/wlt/client.go",
    "type NotifyDeliveryCollectionInput struct",
)
require(
    "services/dsh/backend/internal/wlt/client.go",
    'c.baseURL+"/wlt/cod-records"',
)
require(
    "services/wlt/backend/internal/cod/cod.go",
    "CollectorType",
)
require(
    "services/wlt/backend/internal/cod/cod.go",
    "CollectorID",
)
require(
    "services/wlt/database/migrations/wlt-025_cod_collector_identity.sql",
    "wlt_cod_records_collector_type_chk",
)
require(
    "services/wlt/contracts/wlt.openapi.yaml",
    "collectorType",
)
require(
    "services/wlt/frontend/shared/dsh/wlt-dsh-boundary.types.ts",
    "WltCodCollectorType",
)
require(
    "services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshCaptainBridge.tsx",
    "عهدة النقد عند الاستلام",
)

stale = ROOT / "services/dsh/backend/internal/wlt/delivery_collection.go"
if stale.exists():
    raise RuntimeError("obsolete duplicate delivery_collection.go still exists")

config = ROOT / "apps/app-captain/runtime/tsconfig.cod-custody-journey.json"
config.write_text(
    '''{
  "extends": "./tsconfig.json",
  "include": [
    "next-env.d.ts",
    "../../../services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx",
    "../../../services/dsh/frontend/shared/finance-wlt-link/wlt/**/*.tsx",
    "../../../services/dsh/frontend/shared/finance-wlt-link/wlt-cod/**/*.ts",
    "../../../services/wlt/frontend/shared/dsh/**/*.ts",
    "../../../services/wlt/clients/**/*.ts",
    "../../../services/dsh/frontend/shared/_kernel/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "dist", "build"]
}
''',
    encoding="utf-8",
)

print("Verified permanent COD custody implementation and prepared focused TypeScript config.")
