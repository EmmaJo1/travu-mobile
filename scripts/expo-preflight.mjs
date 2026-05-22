import { appendFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { execSync } from 'node:child_process';

const LOG = new URL('../debug-1cabea.log', import.meta.url);
const sessionId = '1cabea';

function log(hypothesisId, message, data) {
  const line = JSON.stringify({
    sessionId,
    timestamp: Date.now(),
    hypothesisId,
    location: 'scripts/expo-preflight.mjs',
    message,
    data,
  });
  appendFileSync(LOG, `${line}\n`);
}

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, error: String(err?.message ?? err) };
  }
}

const nets = networkInterfaces();
const ipv4 = Object.values(nets)
  .flat()
  .filter(Boolean)
  .find((n) => n.family === 'IPv4' && !n.internal)?.address;

log('E', 'detected_ipv4', { ipv4, interfaces: nets });
log('C', 'preflight_start', { port: 8081 });

const localhost = await probe('http://127.0.0.1:8081/status');
log('A', 'metro_localhost', localhost);

if (ipv4) {
  const lan = await probe(`http://${ipv4}:8081/status`);
  log('A', 'metro_lan_from_pc', lan);
}

try {
  const ps = execSync(
    'powershell -NoProfile -Command "Get-NetConnectionProfile | Select-Object -First 1 Name,NetworkCategory,InterfaceAlias | ConvertTo-Json -Compress"',
    { encoding: 'utf8' },
  );
  log('D', 'windows_network_profile', JSON.parse(ps.trim()));
} catch (err) {
  log('D', 'windows_network_profile_error', { error: String(err?.message ?? err) });
}

log('B', 'preflight_done', { recommendation: 'If phone times out on LAN, use npm run start:clear (tunnel).' });
