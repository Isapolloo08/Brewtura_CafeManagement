import { query } from './server/db/index.js';
try {
  const r = await query('SELECT * FROM users WHERE id = 13');
  console.log('user rows:', r.rows.length);
  const chk = await query(
    `SELECT 'orders' t, count(*) c FROM orders WHERE placed_by_user_id = 13
     UNION ALL SELECT 'order_items', count(*) FROM order_items WHERE prepared_by = 13
     UNION ALL SELECT 'stock_movements', count(*) FROM stock_movements WHERE created_by = 13
     UNION ALL SELECT 'purchase_orders', count(*) FROM purchase_orders WHERE created_by = 13
     UNION ALL SELECT 'shift_logs', count(*) FROM shift_logs WHERE user_id = 13
     UNION ALL SELECT 'shift_reports', count(*) FROM shift_reports WHERE user_id = 13`
  );
  console.log(JSON.stringify(chk.rows));
} catch (e) {
  console.log('ERROR:', e.message);
}
process.exit(0);