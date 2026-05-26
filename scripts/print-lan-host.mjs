import { networkInterfaces } from 'node:os';

/** VPN(172.x) 제외, Wi-Fi/LAN(192.168.x) 우선 */
export function getLanHost() {
  const candidates = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);

  const wifi = candidates.find((ip) => /^192\.168\./.test(ip));
  if (wifi) return wifi;

  const nonVpn = candidates.find((ip) => !/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip));
  if (nonVpn) return nonVpn;

  return candidates[0] ?? '127.0.0.1';
}

if (process.argv[1]?.endsWith('print-lan-host.mjs')) {
  console.log(getLanHost());
}
