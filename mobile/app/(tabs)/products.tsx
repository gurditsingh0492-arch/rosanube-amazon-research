import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { listProducts } from '@/db/products';
import type { ProductStatus } from '@/db/types';
import { marginVerdict, stockVerdict, unitEconomics } from '@/lib/economics';
import { money, percent } from '@/lib/format';
import { Badge, EmptyState, ErrorState, Fab, Loading, Row } from '@/ui/components';
import { Chips, SearchBar, type Option } from '@/ui/form';
import { PRODUCT_STATUS } from '@/ui/labels';
import { colors, spacing } from '@/ui/theme';

type Filter = ProductStatus | 'all';

const FILTERS: Option<Filter>[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Research', value: 'research' },
  { label: 'Paused', value: 'paused' },
  { label: 'Discontinued', value: 'discontinued' },
];

const MARGIN_TONE = { good: 'success', ok: 'warn', thin: 'danger' } as const;

export default function ProductsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Filter>('all');

  const products = useQuery((db) => listProducts(db, { search, status }), [search, status]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search SKU, ASIN or title" />
        <Chips value={status} options={FILTERS} onChange={setStatus} />
      </View>

      {products.error ? (
        <ErrorState error={products.error} />
      ) : !products.data ? (
        <Loading />
      ) : (
        <FlatList
          data={products.data}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title={search || status !== 'all' ? 'No matching products' : 'No products yet'}
              body={
                search || status !== 'all'
                  ? 'Try a different search or filter.'
                  : 'Add your first SKU to track cost, fees and margin.'
              }
            />
          }
          renderItem={({ item }) => {
            const econ = unitEconomics(item);
            const stock = stockVerdict(item.stock, item.reorder_point);
            const meta = PRODUCT_STATUS[item.status];
            return (
              <Row
                icon="cube-outline"
                iconTone={meta.tone}
                title={item.title}
                subtitle={`${item.sku}${item.asin ? ` · ${item.asin}` : ''}`}
                meta={
                  <>
                    <Badge label={meta.label} tone={meta.tone} />
                    <Badge
                      label={`${percent(econ.marginPct, 0)} margin`}
                      tone={MARGIN_TONE[marginVerdict(econ.marginPct)]}
                    />
                    {item.status === 'active' ? (
                      <Badge
                        label={stock === 'out' ? 'Out of stock' : `${item.stock} in stock`}
                        tone={stock === 'out' ? 'danger' : stock === 'low' ? 'warn' : 'neutral'}
                      />
                    ) : null}
                  </>
                }
                right={
                  <>
                    <Text style={styles.price}>{money(item.sell_price)}</Text>
                    <Text style={styles.profit}>{money(econ.profit)}/unit</Text>
                  </>
                }
                onPress={() => router.push(`/product/${item.id}`)}
              />
            );
          }}
        />
      )}

      <Fab label="Add product" onPress={() => router.push('/product/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 96 },
  price: { fontSize: 15, fontWeight: '700', color: colors.text },
  profit: { fontSize: 12, color: colors.textMuted },
});
