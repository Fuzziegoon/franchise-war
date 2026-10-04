import { describe, expect, it } from 'vitest';
import { tabToRows } from './xlsxBackup';

describe('tabToRows', () => {
  it('writes a bold header row then values in column order', () => {
    const r = tabToRows([{ A: 'x', B: 2 }, { A: 'y', C: true }] as never);
    expect(r[0].map((c) => c.value)).toEqual(['A', 'B', 'C']);
    expect(r[0][0].fontWeight).toBe('bold');
    expect(r[1].map((c) => c.value)).toEqual(['x', 2, null]);
    expect(r[2].map((c) => c.value)).toEqual(['y', null, true]);
  });
  it('handles an empty tab', () => {
    expect(tabToRows([])).toEqual([[{ value: '(empty)' }]]);
  });
});
