import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { listOrders } from '@/db/orders';
import type { OrderStatus } from '@/db/types';
import { daysUntil, formatDate, money } from '@/lib/format';
import { Badge, EmptyState, ErrorState, Fab, Loading, Row } from '@/ui/components';
import { Chips, type Option } from '@/ui/form';
import { ORDER_STATUS } from '@/ui/labels';
import { colors, spacing } from '@/ui/theme';

type Filter = OrderStatus | 'all';

const FILTERS: Option<Filter>[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Ordered', value: 'ordered' },
  { label: 'In transit', value: 'in_transit' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Filter>('all');
  const orders = useQuery((db) => listOrders(db, { status }), [status]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Chips value={status} options={FILTERS} onChange={setStatus} />
      </View>

      {orders.error ? (
        <ErrorState error={orders.error} />
      ) : !orders.data ? (
        <Loading />
      ) : (
        <FlatList
          data={orders.data}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="boat-outline"
              title={status === 'all' ? 'No purchase orders yet' : 'Nothing in this status'}
              body="Track what you ordered, what it cost, and when it lands."
            />
          }
          renderItem={({ item }) => {
            const meta = ORDER_STATUS[item.status];
            const eta = daysUntil(item.expected_date);
            const late = eta !== null && eta < 0 && item.status !== 'received' && item.status !== 'cancelled';
            return (
              <Row
                icon="receipt-outline"
                iconTone={meta.tone}
                title={item.reference || `PO #${item.id}`}
                subtitle={item.supplier_name ?? 'No supplier set'}
                meta={
                  <>
                    <Badge label={meta.label} tone={meta.tone} />
                    <Badge label={`${item.units} units`} tone="neutral" />
                    {item.expected_date ? (
                      <Badge
                        label={late ? `${Math.abs(eta as number)}d late` : `ETA ${formatDate(item.expected_date)}`}
                        tone={late ? 'danger' : 'neutral'}
                      />
                    ) : null}
                  </>
                }
                right={
                  <>
                    <Text style={styles.total}>{money(item.total)}</Text>
                    <Text style={styles.sub}>{item.item_count} line{item.item_count === 1 ? '' : 's'}</Text>
                  </>
                }
                onPress={() => router.push(`/order/${item.id}`)}
              />
            );
          }}
        />
      )}

      <Fab label="Add purchase order" onPress={() => router.push('/order/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 96 },
  total: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
});
