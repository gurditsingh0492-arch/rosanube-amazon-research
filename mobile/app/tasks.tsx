import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useQuery } from '@/db';
import { listTasks, toggleTask } from '@/db/tasks';
import { daysUntil, formatDate } from '@/lib/format';
import { Badge, EmptyState, ErrorState, Fab, Loading, Row } from '@/ui/components';
import { Chips, type Option } from '@/ui/form';
import { PRIORITY } from '@/ui/labels';
import { colors, spacing } from '@/ui/theme';

type Filter = 'open' | 'all';

const FILTERS: Option<Filter>[] = [
  { label: 'Open', value: 'open' },
  { label: 'All', value: 'all' },
];

export default function TasksScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('open');
  const tasks = useQuery((db) => listTasks(db, filter === 'all'), [filter]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Tasks' }} />
      <View style={styles.header}>
        <Chips value={filter} options={FILTERS} onChange={setFilter} />
      </View>

      {tasks.error ? (
        <ErrorState error={tasks.error} />
      ) : !tasks.data ? (
        <Loading />
      ) : (
        <FlatList
          data={tasks.data}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-outline"
              title={filter === 'open' ? 'Nothing open' : 'No tasks yet'}
              body="Keep supplier chases, listing fixes and compliance deadlines here."
            />
          }
          renderItem={({ item }) => {
            const due = daysUntil(item.due_date);
            const overdue = item.done === 0 && due !== null && due < 0;
            const meta = PRIORITY[item.priority];
            return (
              <Row
                title={item.title}
                subtitle={item.due_date ? `Due ${formatDate(item.due_date)}` : 'No due date'}
                meta={
                  <>
                    <Badge label={meta.label} tone={meta.tone} />
                    {overdue ? <Badge label={`${Math.abs(due as number)}d overdue`} tone="danger" /> : null}
                    {item.done === 1 ? <Badge label="Done" tone="success" /> : null}
                  </>
                }
                right={
                  <Pressable
                    onPress={() => toggleTask(item.id)}
                    hitSlop={10}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.done === 1 }}
                    accessibilityLabel={item.done === 1 ? 'Mark as not done' : 'Mark as done'}
                  >
                    <Ionicons
                      name={item.done === 1 ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={item.done === 1 ? colors.success : colors.textFaint}
                    />
                  </Pressable>
                }
                onPress={() => router.push(`/task/${item.id}`)}
              />
            );
          }}
        />
      )}

      <Fab label="Add task" onPress={() => router.push('/task/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: 96 },
});
