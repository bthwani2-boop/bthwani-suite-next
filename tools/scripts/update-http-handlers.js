const fs = require('fs');
const path = require('path');
const httpDir = path.join('services', 'dsh', 'backend', 'internal', 'http');
for (const f of fs.readdirSync(httpDir)) {
    if (!f.endsWith('.go')) continue;
    const fp = path.join(httpDir, f);
    let content = fs.readFileSync(fp, 'utf8');

    // We only want to target specific `wlt` client calls and add r.Header.Get("Idempotency-Key")
    // Note: Some calls use correlationID variable, others use r.Header.Get("X-Correlation-ID")

    // 1. s.wlt.FinanceWriteWithOperatorContext(ctx, method, path, payload, correlationID, operatorContext)
    content = content.replace(/s\.wlt\.FinanceWriteWithOperatorContext\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, (match, p1, p2, p3, p4, p5, p6) => {
        if (p5.includes('Idempotency-Key') || p6.includes('Idempotency-Key')) return match;
        return `s.wlt.FinanceWriteWithOperatorContext(${p1}, ${p2}, ${p3}, ${p4}, ${p5}, r.Header.Get("Idempotency-Key"), ${p6})`;
    });

    // 2. s.wlt.FinanceWrite(ctx, method, path, payload, correlationID)
    content = content.replace(/s\.wlt\.FinanceWrite\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, (match, p1, p2, p3, p4, p5) => {
        if (p5.includes('Idempotency-Key')) return match;
        return `s.wlt.FinanceWrite(${p1}, ${p2}, ${p3}, ${p4}, ${p5}, r.Header.Get("Idempotency-Key"))`;
    });

    // 3. s.wlt.FinanceWriteSettlement(ctx, method, path, payload, correlationID)
    content = content.replace(/s\.wlt\.FinanceWriteSettlement\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, (match, p1, p2, p3, p4, p5) => {
        if (p5.includes('Idempotency-Key')) return match;
        return `s.wlt.FinanceWriteSettlement(${p1}, ${p2}, ${p3}, ${p4}, ${p5}, r.Header.Get("Idempotency-Key"))`;
    });

    // 4. s.wlt.FinanceWriteCommission(ctx, method, path, payload, correlationID)
    content = content.replace(/s\.wlt\.FinanceWriteCommission\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, (match, p1, p2, p3, p4, p5) => {
        if (p5.includes('Idempotency-Key')) return match;
        return `s.wlt.FinanceWriteCommission(${p1}, ${p2}, ${p3}, ${p4}, ${p5}, r.Header.Get("Idempotency-Key"))`;
    });

    // 5. s.wlt.FinanceWriteCodRecord(ctx, recordID, action, payload, correlationID)
    content = content.replace(/s\.wlt\.FinanceWriteCodRecord\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, (match, p1, p2, p3, p4, p5) => {
        if (p5.includes('Idempotency-Key')) return match;
        return `s.wlt.FinanceWriteCodRecord(${p1}, ${p2}, ${p3}, ${p4}, ${p5}, r.Header.Get("Idempotency-Key"))`;
    });

    fs.writeFileSync(fp, content, 'utf8');
}
console.log('HTTP handlers updated.');
