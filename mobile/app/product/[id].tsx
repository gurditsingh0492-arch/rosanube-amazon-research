import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { adjustStock, createProduct, deleteProduct, getProduct, updateProduct, type ProductInput } from '@/db/products';
import { listSuppliers } from '@/db/suppliers';
import type { ProductStatus } from '@/db/types';
import { marginVerdict, unitEconomics } from '@/lib/economics';
import { money, parseInteger, parseNumber, percent } from '@/lib/format';
import { Badge, Button, Card, DetailRow, ErrorState, Loading, SectionTitle } from '@/ui/components';
import { NumberField, SelectField, TextField, type Option } from '@/ui/form';
import { PRODUCT_STATUS_OPTIONS } from '@/ui/labels';
import { colors, radius, spacing } from '@/ui/theme';

type FormState = {
  sku: string;
  asin: string;
  title: string;
  supplier_id: number | null;
  unit_cost: string;
  shipping_cost: string;
  sell_price: string;
  vat_rate: string;
  referral_pct: string;
  fba_fee: string;
  stock: string;
  reorder_point: string;
  status: ProductStatus;
  notes: string;
};

const EMPTY: FormState = {
  sku: '',
  asin: '',
  title: '',
  supplier_id: null,
  unit_cost: '',
  shipping_cost: '',
  sell_price: '',
  vat_rate: '21',
  referral_pct: '15',
  fba_fee: '',
  stock: '0',
  reorder_point: '0',
  status: 'research',
  notes: '',
};

const MARGIN_TONE = { good: 'success', ok: 'warn', thin: 'danger' } as const;

export default function ProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const productId = isNew ? null : Number(id);

  const existing = useQuery(
    (db) => (productId ? getProduct(db, productId) : Promise.resolve(null)),
    [productId],
  );
  const suppliers = useQuery((db) => listSuppliers(db));

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(isNew);

  useEffect(() => {
    if (hydrated || !existing.data) return;
    const p = existing.data;
    setForm({
      sku: p.sku,
      asin: p.asin ?? '',
      title: p.title,
      supplier_id: p.supplier_id,
      unit_cost: String(p.unit_cost),
      shipping_cost: String(p.shipping_cost),
      sell_price: String(p.sell_price),
      vat_rate: String(p.vat_rate),
      referral_pct: String(p.referral_pct),
      fba_fee: String(p.fba_fee),
      stock: String(p.stock),
      reorder_point: String(p.reorder_point),
      status: p.status,
      notes: p.notes ?? '',
    });
    setHydrated(true);
  }, [existing.data, hydrated]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const econ = useMemo(
    () =>
      unitEconomics({
        sell_price: parseNumber(form.sell_price),
        vat_rate: parseNumber(form.vat_rate),
        referral_pct: parseNumber(form.referral_pct),
        fba_fee: parseNumber(form.fba_fee),
        unit_cost: parseNumber(form.unit_cost),
        shipping_cost: parseNumber(form.shipping_cost),
      }),
    [form],
  );

  const supplierOptions: Option<number | null>[] = [
    { label: 'No supplier', value: null },
    ...(suppliers.data ?? []).map((s) => ({ label: s.name, value: s.id as number | null })),
  ];

  async function save() {
    if (!form.title.trim()) {
      Alert.alert('Title required', 'Give the product a name before saving.');
      return;
    }
    const input: ProductInput = {
      sku: form.sku.trim() || form.title.trim().slice(0, 12).toUpperCase().replace(/\s+/g, '-'),
      asin: form.asin.trim() || null,
      title: form.title.trim(),
      supplier_id: form.supplier_id,
      unit_cost: parseNumber(form.unit_cost),
      shipping_cost: parseNumber(form.shipping_cost),
      sell_price: parseNumber(form.sell_price),
      vat_rate: parseNumber(form.vat_rate),
      referral_pct: parseNumber(form.referral_pct),
      fba_fee: parseNumber(form.fba_fee),
      stock: parseInteger(form.stock),
      reorder_point: parseInteger(form.reorder_point),
      status: form.status,
      notes: form.notes.trim() || null,
    };
    if (productId) await updateProduct(productId, input);
    else await createProduct(input);
    router.back();
  }

  function confirmDelete() {
    if (!productId) return;
    Alert.alert('Delete product?', 'This removes the product and its history from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(productId);
          router.back();
        },
      },
    ]);
  }

  if (existing.error) return <ErrorState error={existing.error} />;
  if (!isNew && !existing.data && existing.loading) return <Loading />;

  const verdict = marginVerdict(econ.marginPct);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: isNew ? 'New product' : 'Edit product',
          headerRight: () => (
            <Pressable onPress={save} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.headerAction}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.econCard}>
          <View style={styles.econHeader}>
            <Text style={styles.econLabel}>Profit per unit</Text>
            <Badge label={`${percent(econ.marginPct, 1)} margin`} tone={MARGIN_TONE[verdict]} />
          </View>
          <Text style={[styles.econValue, econ.profit < 0 && { color: colors.danger }]}>
            {money(econ.profit)}
          </Text>
          <View style={styles.econBreakdown}>
            <DetailRow label="Sale price (incl. VAT)" value={money(parseNumber(form.sell_price))} />
            <DetailRow label={`VAT (${percent(parseNumber(form.vat_rate), 0)})`} value={`− ${money(econ.vatAmount)}`} />
            <DetailRow label="Net revenue" value={money(econ.netRevenue)} />
            <DetailRow
              label={`Amazon referral (${percent(parseNumber(form.referral_pct), 0)})`}
              value={`− ${money(econ.referralFee)}`}
            />
            <DetailRow label="FBA fulfilment fee" value={`− ${money(econ.fbaFee)}`} />
            <DetailRow label="Landed cost per unit" value={`− ${money(econ.landedCost)}`} />
            <DetailRow label="ROI on cash" value={percent(econ.roiPct, 0)} />
          </View>
          <Text style={styles.econNote}>
            Referral is taken on the VAT-exclusive price, as Amazon charges VAT-registered sellers.
          </Text>
        </Card>

        <SectionTitle>Identity</SectionTitle>
        <TextField label="Product title" value={form.title} onChangeText={(v) => set('title', v)} placeholder="e.g. Ceramic planter 15 cm" />
        <View style={styles.pair}>
          <TextField
            label="SKU"
            value={form.sku}
            onChangeText={(v) => set('sku', v)}
            placeholder="RN-XXX-001"
            autoCapitalize="characters"
            style={styles.half}
          />
          <TextField
            label="ASIN"
            value={form.asin}
            onChangeText={(v) => set('asin', v)}
            placeholder="B0…"
            autoCapitalize="characters"
            style={styles.half}
          />
        </View>
        <SelectField label="Status" value={form.status} options={PRODUCT_STATUS_OPTIONS} onChange={(v) => set('status', v)} />
        <SelectField
          label="Supplier"
          value={form.supplier_id}
          options={supplierOptions}
          onChange={(v) => set('supplier_id', v)}
        />

        <SectionTitle>Costs & price (EUR)</SectionTitle>
        <View style={styles.pair}>
          <NumberField label="Unit cost" value={form.unit_cost} onChangeText={(v) => set('unit_cost', v)} placeholder="0.00" style={styles.half} />
          <NumberField label="Freight per unit" value={form.shipping_cost} onChangeText={(v) => set('shipping_cost', v)} placeholder="0.00" style={styles.half} />
        </View>
        <View style={styles.pair}>
          <NumberField label="Sale price" value={form.sell_price} onChangeText={(v) => set('sell_price', v)} placeholder="0.00" style={styles.half} />
          <NumberField label="FBA fee" value={form.fba_fee} onChangeText={(v) => set('fba_fee', v)} placeholder="0.00" style={styles.half} />
        </View>
        <View style={styles.pair}>
          <NumberField label="VAT %" value={form.vat_rate} onChangeText={(v) => set('vat_rate', v)} hint="Spain standard 21" style={styles.half} />
          <NumberField label="Referral %" value={form.referral_pct} onChangeText={(v) => set('referral_pct', v)} hint="Usually 8–15" style={styles.half} />
        </View>

        <SectionTitle>Stock</SectionTitle>
        <View style={styles.pair}>
          <NumberField label="Units on hand" value={form.stock} onChangeText={(v) => set('stock', v)} style={styles.half} />
          <NumberField label="Reorder point" value={form.reorder_point} onChangeText={(v) => set('reorder_point', v)} hint="Alert at or below" style={styles.half} />
        </View>
        {productId ? (
          <View style={styles.stockButtons}>
            <Button
              title="−10"
              variant="secondary"
              style={styles.stockButton}
              onPress={async () => {
                await adjustStock(productId, -10);
                setHydrated(false);
              }}
            />
            <Button
              title="−1"
              variant="secondary"
              style={styles.stockButton}
              onPress={async () => {
                await adjustStock(productId, -1);
                setHydrated(false);
              }}
            />
            <Button
              title="+1"
              variant="secondary"
              style={styles.stockButton}
              onPress={async () => {
                await adjustStock(productId, 1);
                setHydrated(false);
              }}
            />
            <Button
              title="+10"
              variant="secondary"
              style={styles.stockButton}
              onPress={async () => {
                await adjustStock(productId, 10);
                setHydrated(false);
              }}
            />
          </View>
        ) : null}

        <SectionTitle>Notes</SectionTitle>
        <TextField label="Internal notes" value={form.notes} onChangeText={(v) => set('notes', v)} multiline placeholder="Packaging, compliance, listing ideas…" />

        <Button title={isNew ? 'Create product' : 'Save changes'} onPress={save} style={{ marginTop: spacing.xl }} />
        {productId ? (
          <Button title="Delete product" variant="danger" onPress={confirmDelete} style={{ marginTop: spacing.sm }} />
        ) : null}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  headerAction: { fontSize: 16, fontWeight: '700', color: colors.primary, paddingHorizontal: spacing.sm },
  econCard: { backgroundColor: colors.surface, gap: spacing.xs },
  econHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  econLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  econValue: { fontSize: 30, fontWeight: '700', color: colors.text },
  econBreakdown: { marginTop: spacing.sm },
  econNote: { fontSize: 11, color: colors.textFaint, marginTop: spacing.sm, lineHeight: 16 },
  pair: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  stockButtons: { flexDirection: 'row', gap: spacing.sm },
  stockButton: { flex: 1, paddingHorizontal: 0, borderRadius: radius.sm },
});
