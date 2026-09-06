import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@/db';
import { createTask, deleteTask, getTask, updateTask, type TaskInput } from '@/db/tasks';
import type { Priority } from '@/db/types';
import { normaliseDate, todayISO } from '@/lib/format';
import { Button, ErrorState, Loading, SectionTitle } from '@/ui/components';
import { DateField, SelectField, SwitchField, TextField } from '@/ui/form';
import { PRIORITY_OPTIONS } from '@/ui/labels';
import { colors, spacing } from '@/ui/theme';

export default function TaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const taskId = isNew ? null : Number(id);

  const existing = useQuery(
    (db) => (taskId ? getTask(db, taskId) : Promise.resolve(null)),
    [taskId],
  );

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(isNew ? todayISO() : '');
  const [priority, setPriority] = useState<Priority>('normal');
  const [done, setDone] = useState(false);
  const [hydrated, setHydrated] = useState(isNew);

  useEffect(() => {
    if (hydrated || !existing.data) return;
    const t = existing.data;
    setTitle(t.title);
    setNotes(t.notes ?? '');
    setDueDate(t.due_date ?? '');
    setPriority(t.priority);
    setDone(t.done === 1);
    setHydrated(true);
  }, [existing.data, hydrated]);

  async function save() {
    if (!title.trim()) {
      Alert.alert('Title required', 'Describe the task before saving.');
      return;
    }
    const input: TaskInput = {
      title: title.trim(),
      notes: notes.trim() || null,
      due_date: normaliseDate(dueDate),
      priority,
      done: done ? 1 : 0,
    };
    if (taskId) await updateTask(taskId, input);
    else await createTask(input);
    router.back();
  }

  function confirmDelete() {
    if (!taskId) return;
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(taskId);
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
          title: isNew ? 'New task' : 'Edit task',
          headerRight: () => (
            <Pressable onPress={save} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.headerAction}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Task" value={title} onChangeText={setTitle} placeholder="e.g. Chase supplier for shipping docs" />
        <View style={styles.pair}>
          <DateField label="Due date" value={dueDate} onChangeText={setDueDate} style={styles.half} />
          <SelectField label="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} />
        </View>
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
        <SwitchField label="Done" value={done} onValueChange={setDone} />

        <SectionTitle>{' '}</SectionTitle>
        <Button title={isNew ? 'Create task' : 'Save changes'} onPress={save} />
        {taskId ? (
          <Button title="Delete task" variant="danger" onPress={confirmDelete} style={{ marginTop: spacing.sm }} />
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
