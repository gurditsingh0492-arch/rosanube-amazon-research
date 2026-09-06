import type { SQLiteDatabase } from 'expo-sqlite';

import { nowISO } from '@/lib/format';
import { mutate } from './index';
import type { Product, ProductWithSupplier } from './types';

export type ProductInput = Omit<Product, 'id' | 'created_at'>;

const SELECT_WITH_SUPPLIER = `
  SELECT p.*, s.name AS supplier_name
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
`;

export function listProducts(
  db: SQLiteDatabase,
  opts: { search?: string; status?: string } = {},
): Promise<ProductWithSupplier[]> {
  const search = (opts.search ?? '').trim();
  const like = `%${search}%`;
  const status = opts.status ?? 'all';
  return db.getAllAsync<ProductWithSupplier>(
    `${SELECT_WITH_SUPPLIER}
      WHERE (? = '' OR p.title LIKE ? OR p.sku LIKE ? OR p.asin LIKE ?)
        AND (? = 'all' OR p.status = ?)
      ORDER BY p.title COLLATE NOCASE ASC`,
    [search, like, like, like, status, status],
  );
}

export function getProduct(db: SQLiteDatabase, id: number): Promise<ProductWithSupplier | null> {
  return db.getFirstAsync<ProductWithSupplier>(`${SELECT_WITH_SUPPLIER} WHERE p.id = ?`, [id]);
}

/** Products at or below their reorder point — the restock queue. */
export function listLowStock(db: SQLiteDatabase): Promise<ProductWithSupplier[]> {
  return db.getAllAsync<ProductWithSupplier>(
    `${SELECT_WITH_SUPPLIER}
      WHERE p.status = 'active' AND p.stock <= p.reorder_point
      ORDER BY (p.stock - p.reorder_point) ASC, p.title COLLATE NOCASE ASC`,
  );
}

export function listProductsForPicker(db: SQLiteDatabase): Promise<Product[]> {
  return db.getAllAsync<Product>(
    `SELECT * FROM products WHERE status IN ('active','research','paused')
      ORDER BY title COLLATE NOCASE ASC`,
  );
}

export function createProduct(input: ProductInput): Promise<number> {
  return mutate(async (db) => {
    const result = await db.runAsync(
      `INSERT INTO products
         (sku, asin, title, supplier_id, unit_cost, shipping_cost, sell_price,
          vat_rate, referral_pct, fba_fee, stock, reorder_point, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.sku, input.asin, input.title, input.supplier_id, input.unit_cost,
        input.shipping_cost, input.sell_price, input.vat_rate, input.referral_pct,
        input.fba_fee, input.stock, input.reorder_point, input.status, input.notes, nowISO(),
      ],
    );
    return result.lastInsertRowId;
  });
}

export function updateProduct(id: number, input: ProductInput): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync(
      `UPDATE products SET
         sku = ?, asin = ?, title = ?, supplier_id = ?, unit_cost = ?, shipping_cost = ?,
         sell_price = ?, vat_rate = ?, referral_pct = ?, fba_fee = ?, stock = ?,
         reorder_point = ?, status = ?, notes = ?
       WHERE id = ?`,
      [
        input.sku, input.asin, input.title, input.supplier_id, input.unit_cost,
        input.shipping_cost, input.sell_price, input.vat_rate, input.referral_pct,
        input.fba_fee, input.stock, input.reorder_point, input.status, input.notes, id,
      ],
    );
  });
}

/** Applies a signed delta to stock, clamped at zero. */
export function adjustStock(id: number, delta: number): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync('UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?', [delta, id]);
  });
}

export function deleteProduct(id: number): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
  });
}
