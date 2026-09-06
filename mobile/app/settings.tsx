import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { getDb, useQuery } from '@/db';
import { loadDemoData } from '@/db/demo';
import { listExpenses } from '@/db/expenses';
import { listOrders } from '@/db/orders';
import { listProducts } from '@/db/products';
import { listSuppliers } from '@/db/suppliers';
import { clearAllData, tableCounts } from '@/db/maintenance';
import { unitEconomics } from '@/lib/economics';
import { toCsv } from '@/lib/csv';
import { todayISO } from '@/lib/format';
import { shareTextFile } from '@/lib/share';
import { Button, Card, DetailRow, Muted, SectionTitle } from '@/ui/components';
import { spacing } from '@/ui/theme';

export default function SettingsScreen() {
  const counts = useQuery(() => tableCounts());
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      await fn();
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function exportProducts() {
    const db = await getDb();
    const rows = await listProducts(db);
    const csv = toCsv(
      ['SKU', 'ASIN', 'Title', 'Status', 'Supplier', 'Unit cost', 'Freight', 'Sale price',
       'VAT %', 'Referral %', 'FBA fee', 'Profit/unit', 'Margin %', 'ROI %', 'Stock', 'Reorder point'],
      rows.map((p) => {
        const e = unitEconomics(p);
        return [
          p.sku, p.asin, p.title, p.status, p.supplier_name, p.unit_cost, p.shipping_cost,
          p.sell_price, p.vat_rate, p.referral_pct, p.fba_fee,
          e.profit.toFixed(2), e.marginPct.toFixed(1), e.roiPct.toFixed(1), p.stock, p.reorder_point,
        ];
      }),
    );
    await shareTextFile(`rosanube-products-${todayISO()}.csv`, csv);
  }

  async function exportOrders() {
    const db = await getDb();
    const rows = await listOrders(db);
    const csv = toCsv(
      ['Reference', 'Supplier', 'Status', 'Order date', 'Expected', 'Received',
       'Units', 'Goods', 'Freight', 'Other', 'Total'],
      rows.map((o) => [
        o.reference ?? `PO #${o.id}`, o.supplier_name, o.status, o.order_date, o.expected_date,
        o.received_date, o.units, o.goods_total.toFixed(2), o.shipping_cost.toFixed(2),
        o.other_cost.toFixed(2), o.total.toFixed(2),
      ]),
    );
    await shareTextFile(`rosanube-orders-${todayISO()}.csv`, csv);
  }

  async function exportExpenses() {
    const db = await getDb();
    const rows = await listExpenses(db);
    const csv = toCsv(
      ['Date', 'Category', 'Description', 'Supplier', 'Amount', 'VAT'],
      rows.map((e) => [e.date, e.category, e.description, e.supplier_name, e.amount.toFixed(2), e.vat.toFixed(2)]),
    );
    await shareTextFile(`rosanube-expenses-${todayISO()}.csv`, csv);
  }

  async function exportSuppliers() {
    const db = await getDb();
    const rows = await listSuppliers(db);
    const csv = toCsv(
      ['Name', 'Country', 'Contact', 'Email', 'Phone', 'MOQ', 'Lead time (days)', 'Payment terms', 'Rating', 'Archived'],
      rows.map((s) => [
        s.name, s.country, s.contact_name, s.email, s.phone, s.moq, s.lead_time_days,
        s.payment_terms, s.rating, s.archived ? 'yes' : 'no',
      ]),
    );
    await shareTextFile(`rosanube-suppliers-${todayISO()}.csv`, csv);
  }

  function confirmReset() {
    Alert.alert(
      'Delete everything?',
      'All products, suppliers, orders, tasks and expenses on this device will be erased. Export first if you need a copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => run('reset', clearAllData),
        },
      ],
    );
  }

  const c = counts.data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings & data' }} />

      <SectionTitle>What is stored</SectionTitle>
      <Card>
        <DetailRow label="Products" value={String(c?.products ?? '—')} />
        <DetailRow label="Suppliers" value={String(c?.suppliers ?? '—')} />
        <DetailRow label="Purchase orders" value={String(c?.orders ?? '—')} />
        <DetailRow label="Tasks" value={String(c?.tasks ?? '—')} />
        <DetailRow label="Expenses" value={String(c?.expenses ?? '—')} />
      </Card>
      <Muted>
        Records live in a SQLite database on this phone only. They are not uploaded anywhere and are
        removed if the app is uninstalled — export regularly.
      </Muted>

      <SectionTitle>Export to CSV</SectionTitle>
      <Button title="Export products" icon="download-outline" variant="secondary" onPress={() => run('products', exportProducts)} disabled={busy !== null} />
      <Button title="Export suppliers" icon="download-outline" variant="secondary" onPress={() => run('suppliers', exportSuppliers)} disabled={busy !== null} />
      <Button title="Export purchase orders" icon="download-outline" variant="secondary" onPress={() => run('orders', exportOrders)} disabled={busy !== null} />
      <Button title="Export expenses" icon="download-outline" variant="secondary" onPress={() => run('expenses', exportExpenses)} disabled={busy !== null} />
      <Muted>Opens the share sheet, so a file can go straight to Drive, email or a spreadsheet app.</Muted>

      <SectionTitle>Sample data</SectionTitle>
      <Button
        title="Load sample records"
        icon="flask-outline"
        variant="secondary"
        onPress={() => run('demo', loadDemoData)}
        disabled={busy !== null}
      />
      <Muted>
        Adds a handful of clearly fictional suppliers, products and orders so the screens can be tried
        out. None of it is real Rosanube, supplier, Helium 10 or Keepa data — delete it before entering
        real records.
      </Muted>

      <SectionTitle>Danger zone</SectionTitle>
      <Button title="Delete all data" variant="danger" icon="trash-outline" onPress={confirmReset} disabled={busy !== null} />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
});
