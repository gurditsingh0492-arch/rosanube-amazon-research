import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { loadDashboard } from '@/db/dashboard';
import { listLowStock } from '@/db/products';
import { listOrders } from '@/db/orders';
import { listOpenTasks } from '@/db/tasks';
import { stockVerdict } from '@/lib/economics';
import { daysUntil, formatDate, money } from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Muted,
  Row,
  SectionTitle,
  StatCard,
} from '@/ui/components';
import { ORDER_STATUS, PRIORITY } from '@/ui/labels';
import { colors, spacing } from '@/ui/theme';

export default function Dashboard() {
  const router = useRouter();
  const summary = useQuery((db) => loadDashboard(db));
  const lowStock = useQuery((db) => listLowStock(db));
  const orders = useQuery((db) => listOrders(db));
  const tasks = useQuery((db) => listOpenTasks(db, 4));

  const incoming = (orders.data ?? []).filter(
    (o) => o.status === 'ordered' || o.status === 'in_transit',
  );

  if (summary.error) return <ErrorState error={summary.error} />;
  if (!summary.data) return <Loading />;

  const d = summary.data;
  const loading = summary.loading || lowStock.loading || orders.loading || tasks.loading;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={summary.reload} tintColor={colors.primary} />}
    >
      <Card style={styles.hero}>
        <Text style={styles.heroBrand}>Rosanube</Text>
        <Text style={styles.heroCompany}>MOCHO ATENTO – UNIPESSOAL LDA</Text>
        <View style={styles.heroMeta}>
          <Badge label="Amazon.es" tone="primary" />
          <Badge label="FBA · Private label" tone="neutral" />
        </View>
      </Card>

      <SectionTitle>Money</SectionTitle>
      <View style={styles.grid}>
        <StatCard
          label="Inventory at cost"
          value={money(d.inventoryValue)}
          hint="Cash sitting in stock"
          tone="primary"
        />
        <StatCard
          label="Profit if sold"
          value={money(d.potentialProfit)}
          hint="Stock on hand, after fees"
          tone={d.potentialProfit >= 0 ? 'success' : 'danger'}
        />
      </View>
      <View style={styles.grid}>
        <StatCard
          label="Open POs"
          value={money(d.openOrdersValue)}
          hint={`${d.openOrders} order${d.openOrders === 1 ? '' : 's'} committed`}
          tone="info"
          onPress={() => router.push('/orders')}
        />
        <StatCard
          label="Spend this month"
          value={money(d.monthSpend)}
          hint="All expense categories"
          tone="warn"
          onPress={() => router.push('/expenses')}
        />
      </View>

      <SectionTitle>Catalogue</SectionTitle>
      <View style={styles.grid}>
        <StatCard label="Active" value={String(d.activeProducts)} hint="Listed on Amazon.es" onPress={() => router.push('/products')} />
        <StatCard label="Research" value={String(d.researchProducts)} hint="Shortlist" onPress={() => router.push('/products')} />
        <StatCard
          label="Needs restock"
          value={String(d.lowStock + d.outOfStock)}
          hint={`${d.outOfStock} out of stock`}
          tone={d.outOfStock > 0 ? 'danger' : d.lowStock > 0 ? 'warn' : 'success'}
        />
      </View>

      <SectionTitle
        action={
          <Link href="/products" style={styles.link}>
            All products
          </Link>
        }
      >
        Restock queue
      </SectionTitle>
      {lowStock.data && lowStock.data.length > 0 ? (
        lowStock.data.slice(0, 5).map((p) => {
          const verdict = stockVerdict(p.stock, p.reorder_point);
          return (
            <Row
              key={p.id}
              icon={verdict === 'out' ? 'alert-circle' : 'trending-down'}
              iconTone={verdict === 'out' ? 'danger' : 'warn'}
              title={p.title}
              subtitle={`${p.sku}${p.supplier_name ? ` · ${p.supplier_name}` : ''}`}
              right={
                <>
                  <Text style={styles.stockValue}>{p.stock}</Text>
                  <Muted>of {p.reorder_point}</Muted>
                </>
              }
              onPress={() => router.push(`/product/${p.id}`)}
            />
          );
        })
      ) : (
        <Card>
          <View style={styles.inlineOk}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.inlineOkText}>Every active product is above its reorder point.</Text>
          </View>
        </Card>
      )}

      <SectionTitle
        action={
          <Link href="/orders" style={styles.link}>
            All orders
          </Link>
        }
      >
        Incoming stock
      </SectionTitle>
      {incoming.length > 0 ? (
        incoming.slice(0, 4).map((o) => {
          const eta = daysUntil(o.expected_date);
          return (
            <Row
              key={o.id}
              icon="boat-outline"
              iconTone="info"
              title={o.reference || `PO #${o.id}`}
              subtitle={o.supplier_name ?? 'No supplier set'}
              meta={
                <>
                  <Badge label={ORDER_STATUS[o.status].label} tone={ORDER_STATUS[o.status].tone} />
                  {o.expected_date ? (
                    <Badge
                      label={
                        eta === null
                          ? formatDate(o.expected_date)
                          : eta < 0
                            ? `${Math.abs(eta)}d late`
                            : `ETA ${eta}d`
                      }
                      tone={eta !== null && eta < 0 ? 'danger' : 'neutral'}
                    />
                  ) : null}
                </>
              }
              right={<Text style={styles.amount}>{money(o.total)}</Text>}
              onPress={() => router.push(`/order/${o.id}`)}
            />
          );
        })
      ) : (
        <EmptyState icon="boat-outline" title="No stock in transit" body="Purchase orders you place will show up here." />
      )}

      <SectionTitle
        action={
          <Link href="/tasks" style={styles.link}>
            All tasks
          </Link>
        }
      >
        Next up
      </SectionTitle>
      {tasks.data && tasks.data.length > 0 ? (
        tasks.data.map((t) => {
          const due = daysUntil(t.due_date);
          const overdue = due !== null && due < 0;
          return (
            <Row
              key={t.id}
              icon="ellipse-outline"
              iconTone={overdue ? 'danger' : PRIORITY[t.priority].tone}
              title={t.title}
              subtitle={t.due_date ? `Due ${formatDate(t.due_date)}` : 'No due date'}
              right={overdue ? <Badge label="Overdue" tone="danger" /> : null}
              onPress={() => router.push(`/task/${t.id}`)}
            />
          );
        })
      ) : (
        <EmptyState icon="checkmark-done-outline" title="Nothing open" body="Tasks you add will appear here." />
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  hero: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark, gap: 2 },
  heroBrand: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  heroCompany: { fontSize: 12, color: '#FBCFE0', letterSpacing: 0.3 },
  heroMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.sm },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },
  stockValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  amount: { fontSize: 15, fontWeight: '700', color: colors.text },
  inlineOk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inlineOkText: { flex: 1, fontSize: 14, color: colors.textMuted },
});
