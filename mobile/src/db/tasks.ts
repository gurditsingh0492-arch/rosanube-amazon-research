import type { SQLiteDatabase } from 'expo-sqlite';

import { nowISO } from '@/lib/format';
import { mutate } from './index';
import type { Task } from './types';

export type TaskInput = Omit<Task, 'id' | 'created_at'>;

/** Open tasks first, soonest due date first, undated tasks last. */
const ORDER = `
  ORDER BY done ASC,
           CASE WHEN due_date IS NULL OR due_date = '' THEN 1 ELSE 0 END ASC,
           due_date ASC,
           CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END ASC,
           id DESC
`;

export function listTasks(db: SQLiteDatabase, includeDone = true): Promise<Task[]> {
  return db.getAllAsync<Task>(
    `SELECT * FROM tasks WHERE (? = 1 OR done = 0) ${ORDER}`,
    [includeDone ? 1 : 0],
  );
}

export function listOpenTasks(db: SQLiteDatabase, limit = 5): Promise<Task[]> {
  return db.getAllAsync<Task>(`SELECT * FROM tasks WHERE done = 0 ${ORDER} LIMIT ?`, [limit]);
}

export function getTask(db: SQLiteDatabase, id: number): Promise<Task | null> {
  return db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
}

export function createTask(input: TaskInput): Promise<number> {
  return mutate(async (db) => {
    const result = await db.runAsync(
      'INSERT INTO tasks (title, notes, due_date, priority, done, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [input.title, input.notes, input.due_date, input.priority, input.done, nowISO()],
    );
    return result.lastInsertRowId;
  });
}

export function updateTask(id: number, input: TaskInput): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync(
      'UPDATE tasks SET title = ?, notes = ?, due_date = ?, priority = ?, done = ? WHERE id = ?',
      [input.title, input.notes, input.due_date, input.priority, input.done, id],
    );
  });
}

export function toggleTask(id: number): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync('UPDATE tasks SET done = CASE done WHEN 1 THEN 0 ELSE 1 END WHERE id = ?', [id]);
  });
}

export function deleteTask(id: number): Promise<void> {
  return mutate(async (db) => {
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  });
}
