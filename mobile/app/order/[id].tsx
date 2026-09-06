import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useQuery } from '@/db';
import {
  addOrderItem,
  createOrder,
  deleteOrder,
  deleteOrderItem,
  getOrder,
  listOrderItems,
  setOrderStatus,
  updateOrder,
  updateOrderItem,
  type OrderInput,
  type OrderItemInput,
} from '@/db/orders';
import { listProductsForPicker } from '@/db/products';
import { listSuppliers } from '@/db/suppliers';
import type { OrderStatus, PurchaseOrderItemWithProduct } from '@/db/types';
import { formatDate, money, normaliseDate, parseInteger, parseNumber, todayISO } from '@/lib/format';
import { Button, Card, DetailRow, ErrorState, Loading, Muted, SectionTitle } from '@/ui/components';
import { Chips, DateField, NumberField, SelectField, TextField, type Option } from '@/ui/form';
import { ORDER_STATUS_OPTIONS } from '@/ui/labels';
import { colors, radius, spacing } from '@/ui/theme';

const STATUS_CHIPS: Option<OrderStatus>[] = ORDER_STATUS_OPTIONS;

export default function OrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const orderId = isNew ? null : Number(id);

  const existing = useQuery(
    (db) => (orderId ? getOrder(db, orderId) : Promise.resolve(null)),
    [orderId],
  );
  const items = useQuery(
    (db) => (orderId ? listOrderItems(db, orderId) : Promise.resolve([])),
    [orderId],
  );
  const suppliers = useQuery((db) => listSuppliers(db));

  const [reference, setReference] = useState('');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [status, setStatus] = useState<OrderStatus>('draft');
  const [orderDate, setOrderDate] = useState(isNew ? todayISO() : '');
  const [expectedDate, setExpectedDate] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [notes, setNotes] = useState('');
  const [hydrated, setHydrated] = useState(isNew);

  const [editingItem, setEditingItem] = useState<PurchaseOrderItemWithProduct | 'new' | null>(null);

  useEffect(() => {
    if (hydrated || !existing.data) return;
    const o = existing.data;
    setReference(o.reference ?? '');
    setSupplierId(o.supplier_id);
    setStatus(o.status);
    setOrderDate(o.order_date ?? '');
    setExpectedDate(o.expected_date ?? '');
    setShippingCost(String(o.shipping_cost));
    setOtherCost(String(o.other_cost));
    setNotes(o.notes ?? '');
    setHydrated(true);
  }, [existing.data, hydrated]);

  const supplierOptions: Option<number | null>[] = [
    { label: 'No supplier', value: null },
    ...(suppliers.data ?? []).map((s) => ({ label: s.name, value: s.id as number | null })),
  ];

  function buildInput(): OrderInput {
    return {
      reference: reference.trim() || null,
      supplier_id: supplierId,
      status,
      order_date: normaliseDate(orderDate),
      expected_date: normaliseDate(expectedDate),
      received_date: existing.data?.received_date ?? null,
      shipping_cost: parseNumber(shippingCost),
      other_cost: parseNumber(otherCost),
      notes: notes.trim() || null,
    };
  }

  async function save() {
    if (orderId) {
      await updateOrder(orderId, buildInput());
      router.back();
    } else {
      const newId = await createOrder(buildInput());
      // Replace so the back button returns to the list, not to an empty form.
      router.replace(`/order/${newId}`);
    }
  }

  async function changeStatus(next: OrderStatus) {
    setStatus(next);
    if (!orderId) return;
    await setOrderStatus(orderId, next, todayISO());
    setHydrated(false);
  }

  function confirmDelete() {
    if (!orderId) return;
    Alert.alert('Delete purchase order?', 'Line items are deleted with it. Stock is not adjusted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteOrder(orderId);
          router.back();
        },
      },
    ]);
  }

  if (existing.error) return <ErrorState error={existing.error} />;
  if (!isNew && !existing.data && existing.loading) return <Loading />;

  const goodsTotal = (items.data ?? []).reduce((sum, i) => sum + i.qty * i.unit_cost, 0);
  const units = (items.data ?? []).reduce((sum, i) => sum + i.qty, 0);
  const total = goodsTotal + parseNumber(shippingCost) + parseNumber(otherCost);
  const landedPerUnit = units > 0 ? total / units : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: isNew ? 'New purchase order' : reference || `PO #${orderId}`,
          headerRight: () => (
            <Pressable onPress={save} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.headerAction}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!isNew ? (
          <>
            <Card style={styles.totalCard}>
              <Text style={styles.totalLabel}>Order total</Text>
              <Text style={styles.totalValue}>{money(total)}</Text>
              <View style={styles.totalBreakdown}>
                <DetailRow label={`Goods (${units} units)`} value={money(goodsTotal)} />
                <DetailRow label="Freight" value={money(parseNumber(shippingCost))} />
                <DetailRow label="Duties & other" value={money(parseNumber(otherCost))} />
                <DetailRow label="Landed cost per unit" value={money(landedPerUnit)} />
              </View>
              {existing.data?.received_date ? (
                <Text style={styles.receivedNote}>
                  Received {formatDate(existing.data.received_date)} — units were added to stock.
                </Text>
              ) : null}
            </Card>

            <SectionTitle>Status</SectionTitle>
            <Chips value={status} options={STATUS_CHIPS} onChange={changeStatus} />
            <Muted>
              Marking an order received adds its line items to product stock. Moving it back out
              takes them off again.
            </Muted>

            <SectionTitle
              action={
                <Pressable onPress={() => setEditingItem('new')} hitSlop={8}>
                  <Text style={styles.link}>Add line</Text>
                </Pressable>
              }
            >
              Line items
            </SectionTitle>
            {(items.data ?? []).length === 0 ? (
              <Card>
                <Muted>No line items yet. Add what you ordered to get the real landed cost.</Muted>
              </Card>
            ) : (
              (items.data ?? []).map((item) => (
                <Card key={item.id} style={styles.itemCard} onPress={() => setEditingItem(item)}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.product_title ?? item.description ?? 'Unnamed line'}
                    </Text>
                    <Text style={styles.itemSub}>
                      {item.product_sku ? `${item.product_sku} · ` : ''}
                      {item.qty} × {money(item.unit_cost)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{money(item.qty * item.unit_cost)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Card>
              ))
            )}
          </>
        ) : (
          <Card>
            <Muted>Save the order first, then add line items to it.</Muted>
          </Card>
        )}

        <SectionTitle>Order details</SectionTitle>
        <TextField label="Reference" value={reference} onChangeText={setReference} placeholder="PO-2026-001" autoCapitalize="characters" />
        <SelectField label="Supplier" value={supplierId} options={supplierOptions} onChange={setSupplierId} />
        {isNew ? (
          <SelectField label="Status" value={status} options={ORDER_STATUS_OPTIONS} onChange={setStatus} />
        ) : null}
        <View style={styles.pair}>
          <DateField label="Order date" value={orderDate} onChangeText={setOrderDate} style={styles.half} />
          <DateField label="Expected" value={expectedDate} onChangeText={setExpectedDate} style={styles.half} />
        </View>
        <View style={styles.pair}>
          <NumberField label="Freight cost" value={shippingCost} onChangeText={setShippingCost} placeholder="0.00" style={styles.half} />
          <NumberField label="Duties & other" value={otherCost} onChangeText={setOtherCost} placeholder="0.00" style={styles.half} />
        </View>
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />

        <Button title={isNew ? 'Create order' : 'Save changes'} onPress={save} style={{ marginTop: spacing.xl }} />
        {orderId ? (
          <Button title="Delete order" variant="danger" onPress={confirmDelete} style={{ marginTop: spacing.sm }} />
        ) : null}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {orderId && editingItem ? (
        <LineItemEditor
          orderId={orderId}
          item={editingItem === 'new' ? null : editingItem}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

/* ------------------------------ line item sheet --------------------------- */

function LineItemEditor({
  orderId,
  item,
  onClose,
}: {
  orderId: number;
  item: PurchaseOrderItemWithProduct | null;
  onClose: () => void;
}) {
  const products = useQuery((db) => listProductsForPicker(db));
  const [productId, setProductId] = useState<number | null>(item?.product_id ?? null);
  const [description, setDescription] = useState(item?.description ?? '');
  const [qty, setQty] = useState(item ? String(item.qty) : '');
  const [unitCost, setUnitCost] = useState(item ? String(item.unit_cost) : '');

  const productOptions: Option<number | null>[] = [
    { label: 'Not linked to a product', value: null },
    ...(products.data ?? []).map((p) => ({
      label: p.title,
      value: p.id as number | null,
      hint: p.sku,
    })),
  ];

  async function save() {
    const input: OrderItemInput = {
      product_id: productId,
      description: description.trim() || null,
      qty: parseInteger(qty),
      unit_cost: parseNumber(unitCost),
    };
    if (input.qty <= 0) {
      Alert.alert('Quantity required', 'Enter how many units this line covers.');
      return;
    }
    if (item) await updateOrderItem(item.id, input);
    else await addOrderItem(orderId, input);
    onClose();
  }

  function remove() {
    if (!item) return;
    Alert.alert('Remove line?', 'This line will be deleted from the order.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteOrderItem(item.id);
          onClose();
        },
      },
    ]);
  }

  /** Pre-fills unit cost from the product's stored cost when the line is new. */
  function pickProduct(value: number | null) {
    setProductId(value);
    if (!item && value != null) {
      const p = (products.data ?? []).find((x) => x.id === value);
      if (p && !unitCost) setUnitCost(String(p.unit_cost));
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{item ? 'Edit line' : 'Add line'}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <SelectField label="Product" value={productId} options={productOptions} onChange={pickProduct} />
            <TextField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Optional — useful for samples or freight lines"
            />
            <View style={styles.pair}>
              <NumberField label="Quantity" value={qty} onChangeText={setQty} placeholder="0" style={styles.half} />
              <NumberField label="Unit cost" value={unitCost} onChangeText={setUnitCost} placeholder="0.00" style={styles.half} />
            </View>
            <Card style={styles.lineTotal}>
              <Text style={styles.itemSub}>Line total</Text>
              <Text style={styles.itemTotal}>{money(parseInteger(qty) * parseNumber(unitCost))}</Text>
            </Card>
            <Button title={item ? 'Save line' : 'Add line'} onPress={save} />
            {item ? <Button title="Remove line" variant="danger" onPress={remove} /> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  headerAction: { fontSize: 16, fontWeight: '700', color: colors.primary, paddingHorizontal: spacing.sm },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },

  totalCard: { gap: spacing.xs },
  totalLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  totalValue: { fontSize: 30, fontWeight: '700', color: colors.text },
  totalBreakdown: { marginTop: spacing.sm },
  receivedNote: { fontSize: 12, color: colors.success, marginTop: spacing.sm },

  itemCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  itemSub: { fontSize: 13, color: colors.textMuted },
  itemTotal: { fontSize: 15, fontWeight: '700', color: colors.text },

  pair: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '88%',
    gap: spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  lineTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
});
