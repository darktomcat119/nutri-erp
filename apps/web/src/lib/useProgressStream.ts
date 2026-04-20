'use client';

import { useEffect, useRef, useState } from 'react';

export type JobEvent =
  | { type: 'stage'; stage: string; message?: string; current?: number; total?: number }
  | { type: 'progress'; current: number; total: number; message?: string }
  | { type: 'done'; result: unknown; message?: string }
  | { type: 'error'; message: string };

export interface ProgressState {
  events: JobEvent[];
  stage: string | null;
  current: number;
  total: number;
  percent: number;
  message: string | null;
  done: boolean;
  error: string | null;
  result: unknown;
}

const STAGE_WEIGHTS: Record<string, { start: number; end: number }> = {
  parse: { start: 0, end: 15 },
  validate: { start: 15, end: 30 },
  save: { start: 30, end: 100 },
};

function computePercent(stage: string | null, current: number, total: number): number {
  if (!stage) return 0;
  const w = STAGE_WEIGHTS[stage];
  if (!w) return 0;
  if (!total || total === 0) return w.end;
  const inStage = Math.min(current / total, 1);
  return Math.round(w.start + (w.end - w.start) * inStage);
}

/**
 * Subscribe to a backend job progress stream via SSE.
 * Returns a live-updating state. Pass null to stop streaming.
 */
export function useProgressStream(jobId: string | null): ProgressState {
  const [state, setState] = useState<ProgressState>({
    events: [],
    stage: null,
    current: 0,
    total: 0,
    percent: 0,
    message: null,
    done: false,
    error: null,
    result: null,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // Reset state
    setState({
      events: [],
      stage: null,
      current: 0,
      total: 0,
      percent: 0,
      message: null,
      done: false,
      error: null,
      result: null,
    });

    const token = typeof window !== 'undefined' ? localStorage.getItem('nutri_token') : null;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const url = `${base}/jobs/${jobId}/stream-by-token?token=${encodeURIComponent(token || '')}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as JobEvent;
        setState((prev) => {
          const next: ProgressState = { ...prev, events: [...prev.events, ev] };
          if (ev.type === 'stage') {
            next.stage = ev.stage;
            next.message = ev.message ?? null;
            next.total = ev.total ?? prev.total;
            next.current = ev.current ?? 0;
          } else if (ev.type === 'progress') {
            next.current = ev.current;
            next.total = ev.total;
            next.message = ev.message ?? null;
          } else if (ev.type === 'done') {
            next.done = true;
            next.result = ev.result;
            next.message = ev.message ?? null;
            next.percent = 100;
            es.close();
          } else if (ev.type === 'error') {
            next.error = ev.message;
            next.message = ev.message;
            next.done = true;
            es.close();
          }
          if (ev.type !== 'done' && ev.type !== 'error') {
            next.percent = computePercent(next.stage, next.current, next.total);
          }
          return next;
        });
      } catch {
        /* bad event, ignore */
      }
    };

    es.onerror = () => {
      setState((prev) => (prev.done ? prev : { ...prev, error: 'Conexion perdida', done: true }));
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId]);

  return state;
}
