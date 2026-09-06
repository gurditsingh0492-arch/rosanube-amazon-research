import type { SQLiteDatabase } from 'expo-sqlite';

import { unitEconomics } from '@/lib/economics';
import { todayISO } from '@/lib/format';
import type { Product } from './types';

export type DashboardSummary = {
  activeProducts: number;
  researchProducts: number;
  lowStock: number;
  outOfStock: number;
  /** Cash tied up in units currently on hand, at landed cost. */
  inventoryValue: number;
  /** Profit still to be earned if everything on hand sells at the listed price. */
  potentialProfit: number;
  openOrders: number;
  openOrdersValue: number;
  arrivingSoon: number;
  openTasks: number;
  overdueTasks: number;
  monthSpend: number;
  suppliers: number;
};

export async function loadDashboard(db: SQLiteDatabase): Promise<DashboardSummary> {
  const today = todayISO();
  const month = today.slice(0, 7);
  const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const products = await db.getAllAsync<Product>('SELECT * FROM products');

  let activeProducts = 0;
  let researchProducts = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let inventoryValue = 0;
  let potentialProfit = 0;

  for (const p of products) {
    if (p.status === 'active') activeProducts++;
    if (p.status === 'research') researchProducts++;
    if (p.status === 'active') {
      if (p.stock <= 0) outOfStock++;
      else if (p.reorder_point > 0 && p.stock <= p.reorder_point) lowStock++;
    }
    const econ = unitEconomics(p);
    inventoryValue += econ.landedCost * p.stock;
    potentialProfit += econ.profit * p.stock;
  }

  const orders = await db.getFirstAsync<{ n: number; value: number }>(
    `SELECT COUNT(*) AS n,
            COALESCE(SUM(po.shipping_cost + po.other_cost + COALESCE(i.goods, 0)), 0) AS value
       FROM purchase_orders po
       LEFT JOIN (
         SELECT order_id, SUM(qty * unit_cost) AS goods
           FROM purchase_order_items GROUP BY order_id
       ) i ON i.order_id = po.id
      WHERE po.status IN ('draft', 'ordered', 'in_transit')`,
  );

  const arriving = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM purchase_orders
      WHERE status IN ('ordered', 'in_transit')
        AND expected_date IS NOT NULL AND expected_date != ''
        AND expected_date <= ?`,
    [inTwoWeeks],
  );

  const tasks = await db.getFirstAsync<{ open: number; overdue: number }>(
    `SELECT COUNT(*) AS open,
            SUM(CASE WHEN due_date IS NOT NULL AND due_date != '' AND due_date < ? THEN 1 ELSE 0 END) AS overdue
       FROM tasks WHERE done = 0`,
    [today],
  );

  const spend = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE substr(date, 1, 7) = ?`,
    [month],
  );

  const suppliers = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM suppliers WHERE archived = 0',
  );

  return {
    activeProducts,
    researchProducts,
    lowStock,
    outOfStock,
    inventoryValue,
    potentialProfit,
    openOrders: orders?.n ?? 0,
    openOrdersValue: orders?.value ?? 0,
    arrivingSoon: arriving?.n ?? 0,
    openTasks: tasks?.open ?? 0,
    overdueTasks: tasks?.overdue ?? 0,
    monthSpend: spend?.total ?? 0,
    suppliers: suppliers?.n ?? 0,
  };
}
