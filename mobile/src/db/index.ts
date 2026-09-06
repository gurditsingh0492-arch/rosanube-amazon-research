import * as SQLite from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { migrations } from './schema';

const DB_NAME = 'rosanube.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the database once per app run and applies any pending migrations. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await migrate(db);
      return db;
    })().catch((err) => {
      // Let the next caller retry instead of caching a rejected promise forever.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  for (let i = version; i < migrations.length; i++) {
    await db.execAsync(migrations[i]);
    version = i + 1;
    // PRAGMA does not accept bound parameters, and `version` is loop-controlled.
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

/* ------------------------------------------------------------------ *
 * Change notification
 *
 * Every write goes through `mutate`, which bumps a counter that all live
 * queries subscribe to. That keeps lists fresh after an edit on a detail
 * screen without threading refresh callbacks through navigation.
 * ------------------------------------------------------------------ */

type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyChanged(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Runs a write against the database and refreshes every mounted query. */
export async function mutate<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDb();
  const result = await fn(db);
  notifyChanged();
  return result;
}

/* ------------------------------------------------------------------ *
 * Query hook
 * ------------------------------------------------------------------ */

export type QueryState<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};

/**
 * Runs `fn` against the database and re-runs it whenever a write happens or
 * `deps` change. `fn` is intentionally not part of the dependency list — pass
 * anything that should retrigger the query through `deps`.
 */
export function useQuery<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => subscribe(reload), [reload]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDb()
      .then((db) => fnRef.current(db))
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, reload };
}
