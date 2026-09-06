import type { SQLiteDatabase } from 'expo-sqlite';

import { nowISO } from '@/lib/format';
import { mutate } from './index';
import type { Expense, ExpenseWithSupplier } from './types';

export type ExpenseInput = Omit<Expense, 'id' | 'created_at'>;

const SELECT_WITH_SUPPLIER = `
  SELECT e.*, s.name AS supplier_name
    FROM expenses e
    LEFT JOIN suppliers s ON s.id = e.supplier_id
`;

export function listExpenses(
  db: SQLiteDatabase,
  opts: { category?: string } = {},
): Promise<ExpenseWithSupplier[]> {
  const category = opts.category ?? 'all';
  return db.getAllAsync<ExpenseWithSupplier>(
    `${SELECT_WITH_SUPPLIER}
      WHERE (? = 'all' OR e.category = ?)
      ORDER BY e.date DESC, e.id DESC`,
    [category, category],
  );
}

export function getExpense(db: SQLiteDatabase, id: number): Promise<ExpenseWithSupplier | null> {
  return db.getFirstAsync<ExpenseWithSupplier>(`${SELECT_WITH_SUPPLIER} WHERE e.id = ?`, [id]);
}

export type CategoryTotal = { category: string; total: number };

/** Spend by category for the calendar month containing `monthISO` (YYYY-MM). */
export function spendByCategory(db: SQLiteDatabase, monthISO: string): Promise<CategoryTotal[]> {
  return db.getAllAsync<CategoryTotal>(
    `SELECT category, SUM(amount) AS total
       FROM expenses
      WHERE substr(date, 1, 7) = ?
      GROUP BY category
      ORDER BY total DESC`,
    [monthISO],
  );
}

export function createExpense(input: ExpenseInput): Promise<number> {
  return mutate(async (db) => {
    const result = await db.runAsync(
      `INSERT INTO expenses (date, category, description, amount, vat, supplier_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.date, input.category, input.description, input.amount, input.vat, input.supplier_id, nowISO()],
    );
    return result.lastInsertRowId;
  });
}

export function updateExpense(id: number, input: ExpenseInput): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync(
      `UPDATE expenses SET date = ?, category = ?, description = ?, amount = ?, vat = ?, supplier_id = ?
        WHERE id = ?`,
      [input.date, input.category, input.description, input.amount, input.vat, input.supplier_id, id],
    );
  });
}

export function deleteExpense(id: number): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  });
}
