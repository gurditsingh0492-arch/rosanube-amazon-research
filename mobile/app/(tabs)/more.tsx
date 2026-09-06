import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { loadDashboard } from '@/db/dashboard';
import { money } from '@/lib/format';
import { Card, Row, SectionTitle } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';

export default function MoreScreen() {
  const router = useRouter();
  const summary = useQuery((db) => loadDashboard(db));
  const d = summary.data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionTitle>Day to day</SectionTitle>
      <Row
        icon="checkbox-outline"
        iconTone="primary"
        title="Tasks"
        subtitle={d ? `${d.openTasks} open · ${d.overdueTasks} overdue` : 'Follow-ups and reminders'}
        onPress={() => router.push('/tasks')}
      />
      <Row
        icon="card-outline"
        iconTone="warn"
        title="Expenses"
        subtitle={d ? `${money(d.monthSpend)} spent this month` : 'Track business spending'}
        onPress={() => router.push('/expenses')}
      />

      <SectionTitle>App</SectionTitle>
      <Row
        icon="settings-outline"
        iconTone="neutral"
        title="Settings & data"
        subtitle="Export CSV, sample data, reset"
        onPress={() => router.push('/settings')}
      />

      <Card style={styles.about}>
        <Text style={styles.aboutTitle}>Rosanube Admin</Text>
        <Text style={styles.aboutBody}>
          Internal tool for MOCHO ATENTO – UNIPESSOAL LDA (brand Rosanube), selling on Amazon.es from
          Portugal.
        </Text>
        <Text style={styles.aboutBody}>
          Everything is stored on this device only. Nothing is uploaded, and no Amazon, Helium 10 or
          Keepa account is connected — figures are whatever you enter here.
        </Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </Card>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  about: { marginTop: spacing.xl, gap: spacing.sm },
  aboutTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  aboutBody: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  version: { fontSize: 12, color: colors.textFaint, marginTop: spacing.sm },
});
