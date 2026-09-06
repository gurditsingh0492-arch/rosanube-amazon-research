import type { Product } from '@/db/types';

export type UnitEconomics = {
  /** Sale price with Spanish VAT removed — the amount that actually reaches the P&L. */
  netRevenue: number;
  vatAmount: number;
  referralFee: number;
  fbaFee: number;
  landedCost: number;
  profit: number;
  /** Profit as a share of net revenue. */
  marginPct: number;
  /** Profit as a share of the cash tied up in one unit. */
  roiPct: number;
};

/**
 * Unit economics for one Amazon.es sale.
 *
 * VAT-registered sellers are charged the referral fee on the VAT-exclusive
 * price, so the referral is taken from net revenue rather than the shelf price.
 */
export function unitEconomics(p: Pick<Product,
  'sell_price' | 'vat_rate' | 'referral_pct' | 'fba_fee' | 'unit_cost' | 'shipping_cost'>): UnitEconomics {
  const sell = num(p.sell_price);
  const vatRate = num(p.vat_rate);
  const netRevenue = vatRate > 0 ? sell / (1 + vatRate / 100) : sell;
  const vatAmount = sell - netRevenue;
  const referralFee = netRevenue * (num(p.referral_pct) / 100);
  const fbaFee = num(p.fba_fee);
  const landedCost = num(p.unit_cost) + num(p.shipping_cost);
  const profit = netRevenue - referralFee - fbaFee - landedCost;

  return {
    netRevenue,
    vatAmount,
    referralFee,
    fbaFee,
    landedCost,
    profit,
    marginPct: netRevenue > 0 ? (profit / netRevenue) * 100 : 0,
    roiPct: landedCost > 0 ? (profit / landedCost) * 100 : 0,
  };
}

/** Rosanube's internal go/no-go bands for a private-label unit. */
export function marginVerdict(marginPct: number): 'good' | 'ok' | 'thin' {
  if (marginPct >= 25) return 'good';
  if (marginPct >= 15) return 'ok';
  return 'thin';
}

export function stockVerdict(stock: number, reorderPoint: number): 'out' | 'low' | 'ok' {
  if (stock <= 0) return 'out';
  if (reorderPoint > 0 && stock <= reorderPoint) return 'low';
  return 'ok';
}

function num(v: number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
