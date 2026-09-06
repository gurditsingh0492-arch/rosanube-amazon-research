import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import {
  countProductsForSupplier,
  createSupplier,
  deleteSupplier,
  getSupplier,
  updateSupplier,
  type SupplierInput,
} from '@/db/suppliers';
import { parseInteger } from '@/lib/format';
import { Button, ErrorState, Loading, SectionTitle } from '@/ui/components';
import { NumberField, SelectField, SwitchField, TextField, type Option } from '@/ui/form';
import { colors, spacing } from '@/ui/theme';

type FormState = {
  name: string;
  country: string;
  contact_name: string;
  email: string;
  phone: string;
  moq: string;
  lead_time_days: string;
  payment_terms: string;
  rating: number;
  notes: string;
  archived: boolean;
};

const EMPTY: FormState = {
  name: '',
  country: '',
  contact_name: '',
  email: '',
  phone: '',
  moq: '',
  lead_time_days: '',
  payment_terms: '',
  rating: 0,
  notes: '',
  archived: false,
};

const RATING_OPTIONS: Option<number>[] = [
  { label: 'Not rated', value: 0 },
  { label: '★ Poor', value: 1 },
  { label: '★★ Below average', value: 2 },
  { label: '★★★ Average', value: 3 },
  { label: '★★★★ Good', value: 4 },
  { label: '★★★★★ Excellent', value: 5 },
];

export default function SupplierScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const supplierId = isNew ? null : Number(id);

  const existing = useQuery(
    (db) => (supplierId ? getSupplier(db, supplierId) : Promise.resolve(null)),
    [supplierId],
  );
  const productCount = useQuery(
    (db) => (supplierId ? countProductsForSupplier(db, supplierId) : Promise.resolve(0)),
    [supplierId],
  );

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(isNew);

  useEffect(() => {
    if (hydrated || !existing.data) return;
    const s = existing.data;
    setForm({
      name: s.name,
      country: s.country ?? '',
      contact_name: s.contact_name ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      moq: s.moq != null ? String(s.moq) : '',
      lead_time_days: s.lead_time_days != null ? String(s.lead_time_days) : '',
      payment_terms: s.payment_terms ?? '',
      rating: s.rating ?? 0,
      notes: s.notes ?? '',
      archived: s.archived === 1,
    });
    setHydrated(true);
  }, [existing.data, hydrated]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Give the supplier a name before saving.');
      return;
    }
    const input: SupplierInput = {
      name: form.name.trim(),
      country: form.country.trim() || null,
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      moq: form.moq.trim() ? parseInteger(form.moq) : null,
      lead_time_days: form.lead_time_days.trim() ? parseInteger(form.lead_time_days) : null,
      payment_terms: form.payment_terms.trim() || null,
      rating: form.rating || null,
      notes: form.notes.trim() || null,
      archived: form.archived ? 1 : 0,
    };
    if (supplierId) await updateSupplier(supplierId, input);
    else await createSupplier(input);
    router.back();
  }

  function confirmDelete() {
    if (!supplierId) return;
    const linked = productCount.data ?? 0;
    Alert.alert(
      'Delete supplier?',
      linked > 0
        ? `${linked} product${linked === 1 ? '' : 's'} will be left without a supplier.`
        : 'This removes the supplier from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSupplier(supplierId);
            router.back();
          },
        },
      ],
    );
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
          title: isNew ? 'New supplier' : 'Edit supplier',
          headerRight: () => (
            <Pressable onPress={save} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.headerAction}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle>Company</SectionTitle>
        <TextField label="Supplier name" value={form.name} onChangeText={(v) => set('name', v)} />
        <View style={styles.pair}>
          <TextField label="Country" value={form.country} onChangeText={(v) => set('country', v)} style={styles.half} />
          <TextField label="Contact person" value={form.contact_name} onChangeText={(v) => set('contact_name', v)} style={styles.half} />
        </View>
        <TextField label="Email" value={form.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" />
        <TextField label="Phone" value={form.phone} onChangeText={(v) => set('phone', v)} autoCapitalize="none" />

        <SectionTitle>Terms</SectionTitle>
        <View style={styles.pair}>
          <NumberField label="MOQ (units)" value={form.moq} onChangeText={(v) => set('moq', v)} style={styles.half} />
          <NumberField label="Lead time (days)" value={form.lead_time_days} onChangeText={(v) => set('lead_time_days', v)} style={styles.half} />
        </View>
        <TextField
          label="Payment terms"
          value={form.payment_terms}
          onChangeText={(v) => set('payment_terms', v)}
          placeholder="e.g. 30% deposit / 70% before shipping"
        />
        <SelectField label="Rating" value={form.rating} options={RATING_OPTIONS} onChange={(v) => set('rating', v)} />

        <SectionTitle>Notes</SectionTitle>
        <TextField label="Internal notes" value={form.notes} onChangeText={(v) => set('notes', v)} multiline />
        <SwitchField
          label="Archived"
          value={form.archived}
          onValueChange={(v) => set('archived', v)}
          hint="Keeps the record but sorts it to the bottom of the list."
        />

        <Button title={isNew ? 'Create supplier' : 'Save changes'} onPress={save} style={{ marginTop: spacing.xl }} />
        {supplierId ? (
          <Button title="Delete supplier" variant="danger" onPress={confirmDelete} style={{ marginTop: spacing.sm }} />
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
