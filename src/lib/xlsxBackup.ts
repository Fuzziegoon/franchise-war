import type { Row } from './types';

/** Every tab worth keeping in a backup: site tabs, season totals, history and per-game logs. */
export const XLSX_BACKUP_TABS = [
  'Teams', 'Players', 'Games', 'Articles', 'Moments', 'Transactions', 'Records', 'Awards',
  'Passing', 'Rushing', 'Receiving', 'Defense', 'Kicking',
  'PassingHistory', 'RushingHistory', 'ReceivingHistory', 'DefenseHistory', 'KickingHistory',
  'OffenseGames', 'DefenseGames', 'KickingGames',
];

type Cell = { value: string | number | boolean | null; fontWeight?: 'bold' };

/** Turns tab rows (objects) into a header row plus value rows, keeping the Sheet's column order. */
export function tabToRows(rows: Row[]): Cell[][] {
  const cols: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  if (!cols.length) return [[{ value: '(empty)' }]];
  const head: Cell[] = cols.map((c) => ({ value: c, fontWeight: 'bold' }));
  const body: Cell[][] = rows.map((r) =>
    cols.map((c): Cell => {
      const v = (r as Record<string, unknown>)[c];
      if (v === null || v === undefined || v === '') return { value: null };
      if (typeof v === 'number' || typeof v === 'boolean') return { value: v };
      return { value: String(v) };
    }),
  );
  return [head, ...body];
}

/** Builds and downloads one .xlsx with a sheet per tab. */
export async function downloadXlsx(tabs: Record<string, Row[]>, fileName: string): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const sheets = Object.keys(tabs).map((name) => ({ sheet: name.slice(0, 31), data: tabToRows(tabs[name] ?? []) }));
  await writeXlsxFile(sheets as never).toFile(fileName);
}
