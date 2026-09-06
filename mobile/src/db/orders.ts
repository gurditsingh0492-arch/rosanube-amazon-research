import type { SQLiteDatabase } from 'expo-sqlite';

import { nowISO } from '@/lib/format';
import { mutate } from './index';
import type {
  OrderStatus,
  PurchaseOrder,
  PurchaseOrderItemWithProduct,
  PurchaseOrderWithTotals,
} from './types';

export type OrderInput = Omit<PurchaseOrder, 'id' | 'created_at'>;
export type OrderItemInput = {
  product_id: number | null;
  description: string | null;
  qty: number;
  unit_cost: number;
};

const SELECT_WITH_TOTALS = `
  SELECT po.*,
         s.name AS supplier_name,
         COALESCE(i.item_count, 0)  AS item_count,
         COALESCE(i.units, 0)       AS units,
         COALESCE(i.goods_total, 0) AS goods_total,
         COALESCE(i.goods_total, 0) + po.shipping_cost + po.other_cost AS total
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    LEFT JOIN (
      SELECT order_id,
             COUNT(*) AS item_count,
             SUM(qty) AS units,
             SUM(qty * unit_cost) AS goods_total
        FROM purchase_order_items
       GROUP BY order_id
    ) i ON i.order_id = po.id
`;

export function listOrders(
  db: SQLiteDatabase,
  opts: { status?: string } = {},
): Promise<PurchaseOrderWithTotals[]> {
  const status = opts.status ?? 'all';
  return db.getAllAsync<PurchaseOrderWithTotals>(
    `${SELECT_WITH_TOTALS}
      WHERE (? = 'all' OR po.status = ?)
      ORDER BY COALESCE(po.order_date, po.created_at) DESC, po.id DESC`,
    [status, status],
  );
}

export function getOrder(db: SQLiteDatabase, id: number): Promise<PurchaseOrderWithTotals | null> {
  return db.getFirstAsync<PurchaseOrderWithTotals>(`${SELECT_WITH_TOTALS} WHERE po.id = ?`, [id]);
}

export function listOrderItems(
  db: SQLiteDatabase,
  orderId: number,
): Promise<PurchaseOrderItemWithProduct[]> {
  return db.getAllAsync<PurchaseOrderItemWithProduct>(
    `SELECT oi.*, p.sku AS product_sku, p.title AS product_title
       FROM purchase_order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC`,
    [orderId],
  );
}

export function createOrder(input: OrderInput): Promise<number> {
  return mutate(async (db) => {
    const result = await db.runAsync(
      `INSERT INTO purchase_orders
         (reference, supplier_id, status, order_date, expected_date, received_date,
          shipping_cost, other_cost, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.reference, input.supplier_id, input.status, input.order_date,
        input.expected_date, input.received_date, input.shipping_cost,
        input.other_cost, input.notes, nowISO(),
      ],
    );
    return result.lastInsertRowId;
  });
}

export function updateOrder(id: number, input: OrderInput): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync(
      `UPDATE purchase_orders SET
         reference = ?, supplier_id = ?, status = ?, order_date = ?, expected_date = ?,
         received_date = ?, shipping_cost = ?, other_cost = ?, notes = ?
       WHERE id = ?`,
      [
        input.reference, input.supplier_id, input.status, input.order_date,
        input.expected_date, input.received_date, input.shipping_cost,
        input.other_cost, input.notes, id,
      ],
    );
  });
}

export function deleteOrder(id: number): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync('DELETE FROM purchase_orders WHERE id = ?', [id]);
  });
}

export function addOrderItem(orderId: number, item: OrderItemInput): Promise<number> {
  return mutate(async (db) => {
    const result = await db.runAsync(
      `INSERT INTO purchase_order_items (order_id, product_id, description, qty, unit_cost)
       VALUES (?, ?, ?, ?, ?)`,
      [orderId, item.product_id, item.description, item.qty, item.unit_cost],
    );
    return result.lastInsertRowId;
  });
}

export function updateOrderItem(id: number, item: OrderItemInput): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync(
      `UPDATE purchase_order_items
          SET product_id = ?, description = ?, qty = ?, unit_cost = ?
        WHERE id = ?`,
      [item.product_id, item.description, item.qty, item.unit_cost, id],
    );
  });
}

export function deleteOrderItem(id: number): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync('DELETE FROM purchase_order_items WHERE id = ?', [id]);
  });
}

/**
 * Moves an order to a new status. Receiving an order books its units into
 * stock once, and stamps the received date so it cannot be booked twice.
 */
export function setOrderStatus(id: number, status: OrderStatus, receiveDate: string): Promise<void> {
  return mutate(async (db) => {
    const current = await db.getFirstAsync<PurchaseOrder>(
      'SELECT * FROM purchase_orders WHERE id = ?',
      [id],
    );
    if (!current) return;

    const alreadyReceived = current.status === 'received';

    if (status === 'received' && !alreadyReceived) {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE products
              SET stock = stock + (
                SELECT COALESCE(SUM(qty), 0) FROM purchase_order_items
                 WHERE order_id = ? AND product_id = products.id
              )
            WHERE id IN (SELECT product_id FROM purchase_order_items
                          WHERE order_id = ? AND product_id IS NOT NULL)`,
          [id, id],
        );
        await db.runAsync(
          'UPDATE purchase_orders SET status = ?, received_date = ? WHERE id = ?',
          [status, receiveDate, id],
        );
      });
      return;
    }

    if (status !== 'received' && alreadyReceived) {
      // Reopening a received order takes the units back out of stock.
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE products
              SET stock = MAX(0, stock - (
                SELECT COALESCE(SUM(qty), 0) FROM purchase_order_items
                 WHERE order_id = ? AND product_id = products.id
              ))
            WHERE id IN (SELECT product_id FROM purchase_order_items
                          WHERE order_id = ? AND product_id IS NOT NULL)`,
          [id, id],
        );
        await db.runAsync(
          'UPDATE purchase_orders SET status = ?, received_date = NULL WHERE id = ?',
          [status, id],
        );
      });
      return;
    }

    await db.runAsync('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, id]);
  });
}
