import { nowISO, todayISO } from '@/lib/format';
import { mutate } from './index';

/**
 * Fictional records used to try the app on an empty install. Nothing here is
 * real Rosanube, supplier, Helium 10 or Keepa data — Settings → Reset removes
 * it before real records go in.
 */
export function loadDemoData(): Promise<void> {
  return mutate(async (db) => {
    const created = nowISO();
    const today = new Date();
    const day = (offset: number) =>
      new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);

    await db.withTransactionAsync(async () => {
      const supplierA = await db.runAsync(
        `INSERT INTO suppliers (name, country, contact_name, email, phone, moq, lead_time_days,
           payment_terms, rating, notes, archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        ['Demo Supplier – Ceramics', 'Portugal', 'Sample contact', 'sample@example.com',
         '+351 000 000 000', 200, 25, '30% deposit / 70% before shipping', 4,
         'Sample record. Replace with a real supplier.', created],
      );
      const supplierB = await db.runAsync(
        `INSERT INTO suppliers (name, country, contact_name, email, phone, moq, lead_time_days,
           payment_terms, rating, notes, archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        ['Demo Supplier – Textiles', 'Spain', 'Sample contact', 'sample2@example.com',
         '+34 000 000 000', 500, 18, '50% deposit / 50% on delivery', 3,
         'Sample record.', created],
      );

      const productA = await db.runAsync(
        `INSERT INTO products (sku, asin, title, supplier_id, unit_cost, shipping_cost, sell_price,
           vat_rate, referral_pct, fba_fee, stock, reorder_point, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['RN-CER-001', null, 'Demo ceramic planter, 15 cm', supplierA.lastInsertRowId,
         4.2, 1.1, 24.99, 21, 15, 4.35, 140, 60, 'active', 'Sample product.', created],
      );
      await db.runAsync(
        `INSERT INTO products (sku, asin, title, supplier_id, unit_cost, shipping_cost, sell_price,
           vat_rate, referral_pct, fba_fee, stock, reorder_point, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['RN-TEX-004', null, 'Demo linen table runner', supplierB.lastInsertRowId,
         6.8, 1.4, 29.9, 21, 15, 5.1, 22, 40, 'active', 'Sample product — below reorder point.', created],
      );
      await db.runAsync(
        `INSERT INTO products (sku, asin, title, supplier_id, unit_cost, shipping_cost, sell_price,
           vat_rate, referral_pct, fba_fee, stock, reorder_point, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['RN-IDEA-011', null, 'Demo research idea — storage basket', null,
         3.5, 0.9, 19.99, 21, 15, 4.0, 0, 0, 'research', 'Sample shortlist entry.', created],
      );

      const order = await db.runAsync(
        `INSERT INTO purchase_orders (reference, supplier_id, status, order_date, expected_date,
           received_date, shipping_cost, other_cost, notes, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
        ['PO-DEMO-001', supplierA.lastInsertRowId, 'in_transit', day(-20), day(6),
         320, 85, 'Sample purchase order.', created],
      );
      await db.runAsync(
        `INSERT INTO purchase_order_items (order_id, product_id, description, qty, unit_cost)
         VALUES (?, ?, ?, ?, ?)`,
        [order.lastInsertRowId, productA.lastInsertRowId, 'Demo ceramic planter, 15 cm', 300, 4.2],
      );

      await db.runAsync(
        'INSERT INTO tasks (title, notes, due_date, priority, done, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        ['Confirm shipping documents for PO-DEMO-001', null, day(2), 'high', created],
      );
      await db.runAsync(
        'INSERT INTO tasks (title, notes, due_date, priority, done, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        ['Request samples from second supplier', 'Sample task.', day(9), 'normal', created],
      );

      await db.runAsync(
        `INSERT INTO expenses (date, category, description, amount, vat, supplier_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [todayISO(), 'Freight & duties', 'Sample freight invoice', 320, 0, supplierA.lastInsertRowId, created],
      );
      await db.runAsync(
        `INSERT INTO expenses (date, category, description, amount, vat, supplier_id, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        [todayISO(), 'Software & tools', 'Sample subscription', 79, 16.59, created],
      );
    });
  });
}
