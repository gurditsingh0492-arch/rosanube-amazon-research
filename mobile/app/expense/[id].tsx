import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { createExpense, deleteExpense, getExpense, updateExpense, type ExpenseInput } from '@/db/expenses';
import { listSuppliers } from '@/db/suppliers';
import { EXPENSE_CATEGORIES } from '@/db/types';
import { normaliseDate, parseNumber, todayISO } from '@/lib/format';
import { Button, ErrorState, Loading } from '@/ui/components';
import { DateField, NumberField, SelectField, TextField, type Option } from '@/ui/form';
import { colors, spacing } from '@/ui/theme';

const CATEGORY_OPTIONS: Option<string>[] = EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c }));

export default function ExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const expenseId = isNew ? null : Number(id);

  const existing = useQuery(
    (db) => (expenseId ? getExpense(db, expenseId) : Promise.resolve(null)),
    [expenseId],
  );
  const suppliers = useQuery((db) => listSuppliers(db));

  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vat, setVat] = useState('');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(isNew);

  useEffect(() => {
    if (hydrated || !existing.data) return;
    const e = existing.data;
    setDate(e.date);
    setCategory(e.category);
    setDescription(e.description ?? '');
    setAmount(String(e.amount));
    setVat(String(e.vat));
    setSupplierId(e.supplier_id);
    setHydrated(true);
  }, [existing.data, hydrated]);

  const supplierOptions: Option<number | null>[] = [
    { label: 'No supplier', value: null },
    ...(suppliers.data ?? []).map((s) => ({ label: s.name, value: s.id as number | null })),
  ];

  async function save() {
    const value = parseNumber(amount);
    if (value <= 0) {
      Alert.alert('Amount required', 'Enter the amount spent before saving.');
      return;
    }
    const input: ExpenseInput = {
      date: normaliseDate(date) ?? todayISO(),
      category,
      description: description.trim() || null,
      amount: value,
      vat: parseNumber(vat),
      supplier_id: supplierId,
    };
    if (expenseId) await updateExpense(expenseId, input);
    else await createExpense(input);
    router.back();
  }

  function confirmDelete() {
    if (!expenseId) return;
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(expenseId);
          router.back();
        },
      },
    ]);
  }

  if (existing.error) return <ErrorState error={existing.error} />;
  if (!isNew && !existing.data && existing.loading) return <Loading />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: isNew ? 'New expense' : 'Edit expense',
          headerRight: () => (
            <Pressable onPress={save} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.headerAction}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.pair}>
          <NumberField label="Amount (EUR)" value={amount} onChangeText={setAmount} placeholder="0.00" style={styles.half} />
          <NumberField label="VAT included" value={vat} onChangeText={setVat} placeholder="0.00" hint="Recoverable VAT" style={styles.half} />
        </View>
        <DateField label="Date" value={date} onChangeText={setDate} />
        <SelectField label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
        <TextField label="Description" value={description} onChangeText={setDescription} placeholder="Invoice reference or note" />
        <SelectField label="Supplier" value={supplierId} options={supplierOptions} onChange={setSupplierId} />

        <Button title={isNew ? 'Add expense' : 'Save changes'} onPress={save} style={{ marginTop: spacing.xl }} />
        {expenseId ? (
          <Button title="Delete expense" variant="danger" onPress={confirmDelete} style={{ marginTop: spacing.sm }} />
        ) : null}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  headerAction: { fontSize: 16, fontWeight: '700', color: colors.primary, paddingHorizontal: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
