const fs = require('fs');
const path = require('path');
const wltDir = path.join('services', 'dsh', 'backend', 'internal', 'wlt');
for (const f of fs.readdirSync(wltDir)) {
    if (!f.endsWith('_test.go')) continue;
    const fp = path.join(wltDir, f);
    let content = fs.readFileSync(fp, 'utf8');
    content = content.replace(/FinanceWriteCodRecord\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'FinanceWriteCodRecord($1, $2, $3, $4, $5, "")');
    content = content.replace(/FinanceWriteSettlement\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'FinanceWriteSettlement($1, $2, $3, $4, $5, "")');
    content = content.replace(/FinanceWriteCommission\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'FinanceWriteCommission($1, $2, $3, $4, $5, "")');
    content = content.replace(/FinanceWrite\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'FinanceWrite($1, $2, $3, $4, $5, "")');
    fs.writeFileSync(fp, content, 'utf8');
}
console.log('Tests updated.');
