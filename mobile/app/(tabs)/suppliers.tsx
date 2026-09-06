import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { listSuppliers } from '@/db/suppliers';
import { Badge, EmptyState, ErrorState, Fab, Loading, Row } from '@/ui/components';
import { SearchBar } from '@/ui/form';
import { colors, spacing } from '@/ui/theme';

export default function SuppliersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const suppliers = useQuery((db) => listSuppliers(db, search), [search]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, country or contact" />
      </View>

      {suppliers.error ? (
        <ErrorState error={suppliers.error} />
      ) : !suppliers.data ? (
        <Loading />
      ) : (
        <FlatList
          data={suppliers.data}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title={search ? 'No matching suppliers' : 'No suppliers yet'}
              body={
                search
                  ? 'Try a different search.'
                  : 'Add a supplier to keep MOQ, lead time and payment terms in one place.'
              }
            />
          }
          renderItem={({ item }) => (
            <Row
              icon="business-outline"
              iconTone={item.archived ? 'neutral' : 'primary'}
              title={item.name}
              subtitle={[item.country, item.contact_name].filter(Boolean).join(' · ') || null}
              meta={
                <>
                  {item.archived ? <Badge label="Archived" tone="neutral" /> : null}
                  {item.lead_time_days ? <Badge label={`${item.lead_time_days}d lead`} tone="info" /> : null}
                  {item.moq ? <Badge label={`MOQ ${item.moq}`} tone="neutral" /> : null}
                </>
              }
              right={item.rating ? <Text style={styles.rating}>{'★'.repeat(item.rating)}</Text> : null}
              onPress={() => router.push(`/supplier/${item.id}`)}
            />
          )}
        />
      )}

      <Fab label="Add supplier" onPress={() => router.push('/supplier/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm, paddingBottom: 96 },
  rating: { fontSize: 13, color: colors.warn },
});
