import fs from 'node:fs';

const path = 'services/dsh/backend/internal/http/orders.go';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(
  'orders.ListClientOrders(s.db, actor.ID, 50)',
  'orders.ListClientOrders(s.db, actor.TenantID, actor.ID, 50)',
);
text = text.replace(
  'orders.GetClientOrder(s.db, orderID, actor.ID)',
  'orders.GetClientOrder(s.db, orderID, actor.TenantID, actor.ID)',
);

if (!text.includes('orders.ListClientOrders(s.db, actor.TenantID, actor.ID, 50)')) {
  throw new Error('tenant-scoped ListClientOrders call was not established');
}
if (!text.includes('orders.GetClientOrder(s.db, orderID, actor.TenantID, actor.ID)')) {
  throw new Error('tenant-scoped GetClientOrder call was not established');
}

fs.writeFileSync(path, text, 'utf8');
console.log('Client order call sites are tenant-scoped.');
