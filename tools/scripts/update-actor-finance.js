const fs = require('fs');
const path = require('path');

const fp = path.join('services', 'dsh', 'backend', 'internal', 'wlt', 'actor_finance_client.go');
let content = fs.readFileSync(fp, 'utf8');

// 1. FinanceWriteCodRecord gets idempotencyKey
// func (c *Client) FinanceWriteCodRecord(ctx context.Context, recordID, action string, body []byte, correlationID string) (int, []byte, error) {
content = content.replace(
    /func \(c \*Client\) FinanceWriteCodRecord\(ctx context.Context, recordID, action string, body \[\]byte, correlationID string\) \(int, \[\]byte, error\) \{/,
    'func (c *Client) FinanceWriteCodRecord(ctx context.Context, recordID, action string, body []byte, correlationID, idempotencyKey string) (int, []byte, error) {'
);

// Its call to actorFinanceRequest:
// return c.actorFinanceRequest(ctx, http.MethodPost, "/wlt/cod-records/"+url.PathEscape(recordID)+"/"+action, body, correlationID)
content = content.replace(
    /return c\.actorFinanceRequest\(ctx, http\.MethodPost, "\/wlt\/cod-records\/\"\+url\.PathEscape\(recordID\)\+"\/"\+action, body, correlationID\)/,
    'return c.actorFinanceRequest(ctx, http.MethodPost, "/wlt/cod-records/"+url.PathEscape(recordID)+"/"+action, body, correlationID, idempotencyKey)'
);

// 2. All other calls to actorFinanceRequest get "" for idempotencyKey
// e.g. return c.actorFinanceRequest(ctx, http.MethodGet, "/wlt/cod-records/"+url.PathEscape(recordID), nil, correlationID)
// We'll replace all existing 5-arg calls to 6-arg calls with "".
content = content.replace(/c\.actorFinanceRequest\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, (match, p1, p2, p3, p4, p5) => {
    // If we just modified it above to have 6 args, it would have been matched if it still had 5, but we already matched and modified it.
    // Wait, the regex above replaces it exactly. Let's make sure we only match exactly 5 args.
    if (p5.includes('idempotencyKey')) return match; // skip if already updated
    return `c.actorFinanceRequest(${p1}, ${p2}, ${p3}, ${p4}, ${p5}, "")`;
});

fs.writeFileSync(fp, content, 'utf8');
console.log('actor_finance_client.go updated.');
