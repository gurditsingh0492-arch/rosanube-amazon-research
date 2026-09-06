import type { OrderStatus, Priority, ProductStatus } from '@/db/types';
import type { Tone } from './components';

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: Tone }> = {
  research: { label: 'Research', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'Paused', tone: 'warn' },
  discontinued: { label: 'Discontinued', tone: 'neutral' },
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  ordered: { label: 'Ordered', tone: 'info' },
  in_transit: { label: 'In transit', tone: 'warn' },
  received: { label: 'Received', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

export const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  low: { label: 'Low', tone: 'neutral' },
  normal: { label: 'Normal', tone: 'info' },
  high: { label: 'High', tone: 'danger' },
};

export const PRODUCT_STATUS_OPTIONS = (Object.keys(PRODUCT_STATUS) as ProductStatus[]).map((v) => ({
  label: PRODUCT_STATUS[v].label,
  value: v,
}));

export const ORDER_STATUS_OPTIONS = (Object.keys(ORDER_STATUS) as OrderStatus[]).map((v) => ({
  label: ORDER_STATUS[v].label,
  value: v,
}));

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY) as Priority[]).map((v) => ({
  label: PRIORITY[v].label,
  value: v,
}));
