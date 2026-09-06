/**
 * Ordered, append-only migrations. Each entry runs exactly once per install and
 * bumps PRAGMA user_version, so shipping a change means adding to the end of
 * this array — never editing an entry that has already shipped.
 */
export const migrations: string[] = [
  `
  CREATE TABLE IF NOT EXISTS suppliers (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    country        TEXT,
    contact_name   TEXT,
    email          TEXT,
    phone          TEXT,
    moq            INTEGER,
    lead_time_days INTEGER,
    payment_terms  TEXT,
    rating         INTEGER,
    notes          TEXT,
    archived       INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    sku           TEXT NOT NULL,
    asin          TEXT,
    title         TEXT NOT NULL,
    supplier_id   INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    unit_cost     REAL NOT NULL DEFAULT 0,
    shipping_cost REAL NOT NULL DEFAULT 0,
    sell_price    REAL NOT NULL DEFAULT 0,
    vat_rate      REAL NOT NULL DEFAULT 21,
    referral_pct  REAL NOT NULL DEFAULT 15,
    fba_fee       REAL NOT NULL DEFAULT 0,
    stock         INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'research',
    notes         TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    reference     TEXT,
    supplier_id   INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'draft',
    order_date    TEXT,
    expected_date TEXT,
    received_date TEXT,
    shipping_cost REAL NOT NULL DEFAULT 0,
    other_cost    REAL NOT NULL DEFAULT 0,
    notes         TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description TEXT,
    qty         INTEGER NOT NULL DEFAULT 0,
    unit_cost   REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    notes      TEXT,
    due_date   TEXT,
    priority   TEXT NOT NULL DEFAULT 'normal',
    done       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    category    TEXT NOT NULL,
    description TEXT,
    amount      REAL NOT NULL DEFAULT 0,
    vat         REAL NOT NULL DEFAULT 0,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_po_supplier       ON purchase_orders(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_po_items_order    ON purchase_order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_tasks_due         ON tasks(done, due_date);
  `,
];
