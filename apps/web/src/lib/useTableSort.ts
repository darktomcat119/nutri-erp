'use client';

import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls last
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const as = String(a);
  const bs = String(b);
  // Try numeric comparison first (so "10" > "2")
  const an = Number(as);
  const bn = Number(bs);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return as.localeCompare(bs, 'es', { numeric: true, sensitivity: 'base' });
}

/**
 * Lightweight sort state + sorted array for raw-JSX tables that aren't using
 * @tanstack/react-table. Supports nested keys via dot notation (e.g. "sucursal.codigo").
 * Pass a custom `getValue(row, key)` to override the default nested lookup.
 */
export function useTableSort<T>(
  data: T[],
  opts?: {
    defaultKey?: string;
    defaultDir?: SortDir;
    getValue?: (row: T, key: string) => unknown;
  },
): {
  sorted: T[];
  sortKey: string | null;
  sortDir: SortDir;
  toggleSort: (key: string) => void;
} {
  const [sortKey, setSortKey] = useState<string | null>(opts?.defaultKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(opts?.defaultDir ?? 'asc');

  const toggleSort = (key: string): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const getValue = opts?.getValue ?? ((row: T, key: string) => getNestedValue(row, key));
    const copy = [...data];
    copy.sort((a, b) => {
      const cmp = compareValues(getValue(a, sortKey), getValue(b, sortKey));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggleSort };
}
