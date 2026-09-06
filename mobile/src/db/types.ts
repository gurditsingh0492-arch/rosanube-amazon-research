export type ProductStatus = 'research' | 'active' | 'paused' | 'discontinued';
export type OrderStatus = 'draft' | 'ordered' | 'in_transit' | 'received' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high';

export type Supplier = {
  id: number;
  name: string;
  country: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  moq: number | null;
  lead_time_days: number | null;
  payment_terms: string | null;
  rating: number | null;
  notes: string | null;
  archived: number;
  created_at: string;
};

export type Product = {
  id: number;
  sku: string;
  asin: string | null;
  title: string;
  supplier_id: number | null;
  unit_cost: number;
  shipping_cost: number;
  sell_price: number;
  vat_rate: number;
  referral_pct: number;
  fba_fee: number;
  stock: number;
  reorder_point: number;
  status: ProductStatus;
  notes: string | null;
  created_at: string;
};

export type ProductWithSupplier = Product & { supplier_name: string | null };

export type PurchaseOrder = {
  id: number;
  reference: string | null;
  supplier_id: number | null;
  status: OrderStatus;
  order_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  shipping_cost: number;
  other_cost: number;
  notes: string | null;
  created_at: string;
};

export type PurchaseOrderWithTotals = PurchaseOrder & {
  supplier_name: string | null;
  item_count: number;
  units: number;
  goods_total: number;
  total: number;
};

export type PurchaseOrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  description: string | null;
  qty: number;
  unit_cost: number;
};

export type PurchaseOrderItemWithProduct = PurchaseOrderItem & {
  product_sku: string | null;
  product_title: string | null;
};

export type Task = {
  id: number;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: Priority;
  done: number;
  created_at: string;
};

export type Expense = {
  id: number;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  vat: number;
  supplier_id: number | null;
  created_at: string;
};

export type ExpenseWithSupplier = Expense & { supplier_name: string | null };

export const EXPENSE_CATEGORIES = [
  'Inventory',
  'Freight & duties',
  'Amazon fees',
  'Software & tools',
  'Samples',
  'Photography & design',
  'Advertising',
  'Accounting & legal',
  'Other',
] as const;
