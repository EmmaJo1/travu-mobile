import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../services/supabase/trips.ts', import.meta.url),
  'utf8',
);
const listTripsByUserSource = source.match(
  /export function listTripsByUser\(userId: string\) \{([\s\S]*?)\r?\n\}/,
)?.[1];

assert.ok(listTripsByUserSource, 'My Page trip query source must exist.');

const statusAllowlistSource = listTripsByUserSource.match(
  /\.in\('status', \[([^\]]+)\]\)/,
)?.[1];

assert.ok(statusAllowlistSource, 'My Page trip query must use an explicit status allowlist.');

const allowedStatuses = [...statusAllowlistSource.matchAll(/'([^']+)'/g)].map((match) => match[1]);

assert.deepEqual(allowedStatuses, ['draft', 'active', 'archived', 'completed']);
assert.equal(allowedStatuses.includes('detected'), false);
assert.equal(allowedStatuses.includes('ignored'), false);
assert.match(listTripsByUserSource, /\.eq\('user_id', userId\)/);
assert.match(listTripsByUserSource, /\.is\('deleted_at', null\)/);
assert.doesNotMatch(listTripsByUserSource, /\.eq\('status', 'archived'\)/);
assert.match(
  listTripsByUserSource,
  /\.order\('start_date', \{ ascending: false, nullsFirst: false \}\)/,
);
assert.match(listTripsByUserSource, /\.order\('created_at', \{ ascending: false \}\)/);

console.log('My Page trip status query contract tests passed');
