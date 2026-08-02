const fs = require('fs');
const path = require('path');

const httpDir = path.join('services', 'dsh', 'backend', 'internal', 'http');
const wltDir = path.join('services', 'dsh', 'backend', 'internal', 'wlt');

function walk(dir, cb) {
    for (const f of fs.readdirSync(dir)) {
        const fp = path.join(dir, f);
        if (fs.statSync(fp).isDirectory()) {
            walk(fp, cb);
        } else if (fp.endsWith('.go')) {
            cb(fp);
        }
    }
}

// FinanceWriteWithOperatorContext in financeproxy.go
walk(httpDir, fp => {
    let content = fs.readFileSync(fp, 'utf8');
    
    content = content.replace(/r\.Header\.Get\("X-Correlation-ID"\),\s*actor\.OperatorContextID\)/g, 'r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"), actor.OperatorContextID)');
    content = content.replace(/payloadBytes,\s*correlationID,\s*actor\.OperatorContextID\)/g, 'payloadBytes, correlationID, r.Header.Get("Idempotency-Key"), actor.OperatorContextID)');
    content = content.replace(/payload,\s*correlationID\)/g, 'payload, correlationID, r.Header.Get("Idempotency-Key"))');
    
    // The following replace matches EXACTLY the payload and r.Header.Get("X-Correlation-ID") and adds idempotency key and CLOSING PAREN
    content = content.replace(/payload,\s*r\.Header\.Get\("X-Correlation-ID"\)\)/g, 'payload, r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"))');
    content = content.replace(/bytes\.Clone\(payload\),\s*r\.Header\.Get\("X-Correlation-ID"\)\)/g, 'bytes.Clone(payload), r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"))');
    content = content.replace(/body,\s*r\.Header\.Get\("X-Correlation-ID"\),\s*actor\.OperatorContextID\)/g, 'body, r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"), actor.OperatorContextID)');
    
    fs.writeFileSync(fp, content, 'utf8');
});

walk(wltDir, fp => {
    if (!fp.endsWith('_test.go')) return;
    let content = fs.readFileSync(fp, 'utf8');
    
    content = content.replace(/FinanceWriteCodRecord\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'FinanceWriteCodRecord($1, $2, $3, $4, $5, "")');
    content = content.replace(/FinanceWriteSettlement\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'FinanceWriteSettlement($1, $2, $3, $4, $5, "")');
    content = content.replace(/FinanceWriteCommission\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'FinanceWriteCommission($1, $2, $3, $4, $5, "")');
    content = content.replace(/FinanceWrite\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'FinanceWrite($1, $2, $3, $4, $5, "")');

    fs.writeFileSync(fp, content, 'utf8');
});

console.log('Script completed.');
