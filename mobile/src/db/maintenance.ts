import { getDb, mutate } from './index';

export type TableCounts = {
  suppliers: number;
  products: number;
  orders: number;
  tasks: number;
  expenses: number;
};

export async function tableCounts(): Promise<TableCounts> {
  const db = await getDb();
  const one = async (table: string) => {
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
    return row?.n ?? 0;
  };
  return {
    suppliers: await one('suppliers'),
    products: await one('products'),
    orders: await one('purchase_orders'),
    tasks: await one('tasks'),
    expenses: await one('expenses'),
  };
}

/** Wipes every record. Used by the "Reset data" action in Settings. */
export function clearAllData(): Promise<void> {
  return mutate(async (db) => {
    await db.execAsync(`
      DELETE FROM purchase_order_items;
      DELETE FROM purchase_orders;
      DELETE FROM products;
      DELETE FROM suppliers;
      DELETE FROM tasks;
      DELETE FROM expenses;
    `);
  });
}
