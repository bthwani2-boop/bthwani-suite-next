from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Rebuild the return/audit tail of DeliveryException deterministically after the
# slice patch, avoiding any partial-anchor drift from earlier struct layouts.
path = ROOT / 'services/dsh/backend/internal/dispatch/delivery_exceptions.go'
text = path.read_text(encoding='utf-8')
struct_start = text.index('type DeliveryException struct {')
tail_start = text.index('\tReturnStartedAt', struct_start)
tail_end = text.index('\tUpdatedAt', tail_start)
line_end = text.index('\n', tail_end)
new_tail = '''\tReturnStartedAt          *time.Time
\tReturnArrivedAt          *time.Time
\tReturnedAt               *time.Time
\tReturnAcceptedByActorID  *string
\tVersion                  int
\tCreatedAt                time.Time
\tUpdatedAt                time.Time'''
text = text[:tail_start] + new_tail + text[line_end:]
path.write_text(text, encoding='utf-8')

# Ownership is deliberately enforced by partnerOrder in the HTTP boundary.
# The domain function receives an already-authorized actor and must not pretend
# to validate store ownership without the actor/store scope tables.
test_path = ROOT / 'services/dsh/backend/internal/dispatch/delivery_return_db_test.go'
test = test_path.read_text(encoding='utf-8')
misleading = '''\tif _, err := AcceptReturnToStoreByPartner(db, orderID, "wrong-partner-test"); err != nil {
\t\t// Domain function intentionally relies on HTTP ownership authorization; a valid owning actor is supplied below.
\t}
'''
test = test.replace(misleading, '')
test_path.write_text(test, encoding='utf-8')

# Do not flash a loading card for every normal bThwani-delivery order. The
# return panel appears only after DSH confirms that a return lifecycle exists.
partner_path = ROOT / 'services/dsh/frontend/app-partner/orders/PartnerFulfillmentActionsPanel.tsx'
partner = partner_path.read_text(encoding='utf-8')
partner = partner.replace(
    "  if (state.kind === 'loading') return <StateView title=\"جارٍ قراءة رحلة المرتجع\" description=\"نتحقق من DSH قبل إظهار أي إجراء.\" loading />;",
    "  if (state.kind === 'loading') return null;",
)
partner_path.write_text(partner, encoding='utf-8')

print('Hardened dual return receipt handshake patch.')
