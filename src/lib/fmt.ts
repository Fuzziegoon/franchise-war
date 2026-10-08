import { num, type Cell } from './types';

export function fmtStat(col: string, v: Cell | undefined): string {
const n = num(v);
if (n === null) return v === null || v === undefined ? '' : String(v);
if (col.includes('%')) return `${(n * 100).toFixed(1)}%`;
return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
