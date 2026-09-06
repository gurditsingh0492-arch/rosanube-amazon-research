import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { listExpenses, spendByCategory } from '@/db/expenses';
import { EXPENSE_CATEGORIES } from '@/db/types';
import { formatDate, money, todayISO } from '@/lib/format';
import { Card, EmptyState, ErrorState, Fab, Loading, Row } from '@/ui/components';
import { Chips, type Option } from '@/ui/form';
import { colors, spacing } from '@/ui/theme';

const FILTERS: Option<string>[] = [
  { label: 'All', value: 'all' },
  ...EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c })),
];

export default function ExpensesScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('all');
  const month = todayISO().slice(0, 7);

  const expenses = useQuery((db) => listExpenses(db, { category }), [category]);
  const byCategory = useQuery((db) => spendByCategory(db, month), [month]);

  const monthTotal = (byCategory.data ?? []).reduce((sum, c) => sum + c.total, 0);
  const top = (byCategory.data ?? [])[0];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Expenses' }} />

      {expenses.error ? (
        <ErrorState error={expenses.error} />
      ) : !expenses.data ? (
        <Loading />
      ) : (
        <FlatList
          data={expenses.data}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm }}>
              <Card style={styles.summary}>
                <Text style={styles.summaryLabel}>Spent this month</Text>
                <Text style={styles.summaryValue}>{money(monthTotal)}</Text>
                {top ? (
                  <Text style={styles.summaryHint}>
                    Biggest line: {top.category} · {money(top.total)}
                  </Text>
                ) : (
                  <Text style={styles.summaryHint}>No expenses recorded this month yet.</Text>
                )}
              </Card>
              <Chips value={category} options={FILTERS} onChange={setCategory} />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="card-outline"
              title={category === 'all' ? 'No expenses yet' : 'Nothing in this category'}
              body="Log freight invoices, software, samples and ad spend as they happen."
            />
          }
          renderItem={({ item }) => (
            <Row
              icon="card-outline"
              iconTone="warn"
              title={item.description || item.category}
              subtitle={`${formatDate(item.date)} · ${item.category}${item.supplier_name ? ` · ${item.supplier_name}` : ''}`}
              right={
                <>
                  <Text style={styles.amount}>{money(item.amount)}</Text>
                  {item.vat > 0 ? <Text style={styles.vat}>incl. {money(item.vat)} VAT</Text> : null}
                </>
              }
              onPress={() => router.push(`/expense/${item.id}`)}
            />
          )}
        />
      )}

      <Fab label="Add expense" onPress={() => router.push('/expense/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 96 },
  summary: { gap: 2 },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  summaryValue: { fontSize: 28, fontWeight: '700', color: colors.text },
  summaryHint: { fontSize: 12, color: colors.textFaint, marginTop: 4 },
  amount: { fontSize: 15, fontWeight: '700', color: colors.text },
  vat: { fontSize: 11, color: colors.textMuted },
});
