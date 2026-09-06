import type { SQLiteDatabase } from 'expo-sqlite';

import { nowISO } from '@/lib/format';
import { mutate } from './index';
import type { Supplier } from './types';

export type SupplierInput = Omit<Supplier, 'id' | 'created_at'>;

export function listSuppliers(db: SQLiteDatabase, search = ''): Promise<Supplier[]> {
  const like = `%${search.trim()}%`;
  return db.getAllAsync<Supplier>(
    `SELECT * FROM suppliers
       WHERE (? = '' OR name LIKE ? OR country LIKE ? OR contact_name LIKE ?)
     ORDER BY archived ASC, name COLLATE NOCASE ASC`,
    [search.trim(), like, like, like],
  );
}

export function getSupplier(db: SQLiteDatabase, id: number): Promise<Supplier | null> {
  return db.getFirstAsync<Supplier>('SELECT * FROM suppliers WHERE id = ?', [id]);
}

export function countProductsForSupplier(db: SQLiteDatabase, id: number): Promise<number> {
  return db
    .getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM products WHERE supplier_id = ?', [id])
    .then((r) => r?.n ?? 0);
}

export function createSupplier(input: SupplierInput): Promise<number> {
  return mutate(async (db) => {
    const result = await db.runAsync(
      `INSERT INTO suppliers
         (name, country, contact_name, email, phone, moq, lead_time_days,
          payment_terms, rating, notes, archived, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name, input.country, input.contact_name, input.email, input.phone,
        input.moq, input.lead_time_days, input.payment_terms, input.rating,
        input.notes, input.archived, nowISO(),
      ],
    );
    return result.lastInsertRowId;
  });
}

export function updateSupplier(id: number, input: SupplierInput): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync(
      `UPDATE suppliers SET
         name = ?, country = ?, contact_name = ?, email = ?, phone = ?, moq = ?,
         lead_time_days = ?, payment_terms = ?, rating = ?, notes = ?, archived = ?
       WHERE id = ?`,
      [
        input.name, input.country, input.contact_name, input.email, input.phone,
        input.moq, input.lead_time_days, input.payment_terms, input.rating,
        input.notes, input.archived, id,
      ],
    );
  });
}

export function deleteSupplier(id: number): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
  });
}
