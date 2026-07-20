# Temporary slice-one synchronizer; removed after focused verification.
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

main_path = ROOT / "tools/scripts/patch-order-preparation-slice1.py"
main = main_path.read_text(encoding="utf-8")
main = main.replace(
    "import type { DshOrder, DshPartnerOrder, DshPartnerOrderAction } from '../orders/orders.types';",
    "import type { DshPartnerOrder, DshPartnerOrderAction } from '../orders/orders.types';",
)
main_path.write_text(main, encoding="utf-8")

server_path = ROOT / "services/dsh/backend/internal/http/server.go"
server = server_path.read_text(encoding="utf-8")
route = '\tmux.HandleFunc("GET /dsh/partner/order-workboard", protected.handlePartnerOrderWorkboard)\n'
if route not in server:
    anchor = '\tmux.HandleFunc("GET /dsh/partner/orders", protected.handleListPartnerOrders)\n'
    if anchor not in server:
        raise RuntimeError("partner order route anchor not found")
    server = server.replace(anchor, anchor + route, 1)
server_path.write_text(server, encoding="utf-8")

print("Bound actor-scoped partner workboard route and removed stale TypeScript import.")
