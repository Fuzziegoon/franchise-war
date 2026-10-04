import { sampleMeta, sampleTabs } from './sample';
import type { Meta, Row } from './types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';

export const usingSampleData = !API_URL;

export interface TabsResponse {
  meta: Meta;
  tabs: Record<string, Row[]>;
}

interface ApiEnvelope<T> {
  ok: boolean;
  error?: string;
  meta?: Meta;
  tabs?: Record<string, Row[]>;
  result?: T;
}

/** Read one or more Sheet tabs. Viewers need no password. */
export async function fetchTabs(names: string[]): Promise<TabsResponse> {
  if (usingSampleData) {
    const tabs: Record<string, Row[]> = {};
    for (const n of names) tabs[n] = sampleTabs[n] ?? [];
    return { meta: sampleMeta, tabs };
  }
  const res = await fetch(`${API_URL}?tabs=${encodeURIComponent(names.join(','))}`);
  if (!res.ok) throw new Error(`Sheet API returned ${res.status}`);
  const body = (await res.json()) as ApiEnvelope<never>;
  if (!body.ok) throw new Error(body.error || 'Sheet API error');
  return { meta: body.meta!, tabs: body.tabs! };
}

/**
 * Admin writes. Sent as text/plain so the browser skips the CORS preflight
 * that Apps Script cannot answer.
 */
async function post<T>(payload: Record<string, unknown>): Promise<T> {
  if (usingSampleData) throw new Error('Connect the app to the league Sheet (VITE_API_URL) before saving.');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!body.ok) throw new Error(body.error || 'Save failed');
  return body.result as T;
}

export const verifyPassword = async (password: string) => {
  if (usingSampleData) return password.length > 0; // sample mode: any password previews admin screens
  await post({ password, op: 'verify' });
  return true;
};

export interface AppendResult {
  tab: string;
  row: number;
  id?: string;
  skippedFormulaColumns: string[];
}

export const appendRow = (password: string, tab: string, values: Row) =>
  post<AppendResult>({ password, op: 'append', tab, values });

export const updateRow = (password: string, tab: string, key: string, values: Row) =>
  post<{ row: number; changed: string[] }>({ password, op: 'update', tab, key, values });
