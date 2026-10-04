// Builds the "factory defaults" snapshot the Admin reset button restores, from the live Sheet.
// Usage:  node scripts/make-snapshot.mjs            (reads VITE_API_URL from .env.local)
//         node scripts/make-snapshot.mjs file.json  (uses a saved API response instead)
// Writes public/factory-snapshot.json and a full dated copy under backups/.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const arg = process.argv[2];
let data;
if (arg) data = JSON.parse(readFileSync(arg, 'utf8'));
else {
  const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  const url = (env.match(/^VITE_API_URL=(https?:\S+)/m) || [])[1];
  if (!url) throw new Error('Set VITE_API_URL in .env.local first');
  const tabs = 'Teams,Players,Games,Articles,Moments,Transactions,Records,Awards';
  data = await (await fetch(`${url}?tabs=${tabs}`)).json();
}
if (!data.ok) throw new Error(data.error || 'API error');

const pick = (rows, key, cols) => ({ key, cols, rows: rows.map((r) => [r[key], ...cols.map((c) => r[c] ?? '')]) });
const snapshot = {
  takenAt: new Date().toISOString(),
  note: 'Factory defaults for The League Leak. Restored by Admin > Backup & reset.',
  Teams: pick(data.tabs.Teams, 'Abbr', ['Head Coach', 'Record', 'Super Bowl Wins']),
  Players: pick(data.tabs.Players, 'PlayerID', ['TeamIndex', 'Status', 'Jersey', 'Injury Status', 'Injury Type', 'Injury Severity', 'Overall', 'Age']),
};
mkdirSync('public', { recursive: true });
mkdirSync('backups', { recursive: true });
writeFileSync('public/factory-snapshot.json', JSON.stringify(snapshot));
const stamp = new Date().toISOString().slice(0, 10);
writeFileSync(`backups/sheet-backup-${stamp}.json`, JSON.stringify(data));
console.log(`Snapshot: ${snapshot.Teams.rows.length} teams, ${snapshot.Players.rows.length} players. Full backup: backups/sheet-backup-${stamp}.json`);
