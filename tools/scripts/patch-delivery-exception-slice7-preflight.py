from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "tools/scripts/patch-delivery-exception-slice7.py"
text = path.read_text(encoding="utf-8")

old_anchor = '\tmux.HandleFunc("POST /dsh/partner/orders/{orderId}/delivery/exception", protected.handlePartnerDeliveryException)\n'
new_anchor = '\tmux.HandleFunc("POST /dsh/partner/orders/{orderId}/partner-delivery/exception", protected.handlePartnerDeliveryException)\n'
if old_anchor not in text and new_anchor not in text:
    raise RuntimeError("current partner-delivery exception route anchor not found")
text = text.replace(old_anchor, new_anchor)

text = text.replace(
    'order, _, ok := s.partnerOrder(w, r, r.PathValue("orderId"))',
    '_, order, ok := s.partnerOrder(w, r)',
)
text = text.replace(
    'order, actor, ok := s.partnerOrder(w, r, r.PathValue("orderId"))',
    'actor, order, ok := s.partnerOrder(w, r)',
)

# Fail before the main patch if stale signatures remain.
if 's.partnerOrder(w, r, r.PathValue("orderId"))' in text:
    raise RuntimeError("stale partnerOrder signature remains in slice7 patch")

path.write_text(text, encoding="utf-8")
print("Aligned slice7 patch with current partner-delivery route and ownership boundary.")
