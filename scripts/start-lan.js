const { networkInterfaces } = require('node:os');
const { spawn } = require('node:child_process');

function isPrivateIpv4(address) {
  if (address.startsWith('10.')) return true;
  if (address.startsWith('192.168.')) return true;
  const match = address.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function addressScore(name, address, netmask) {
  let score = address.startsWith('192.168.') ? 300 : address.startsWith('10.') ? 200 : 100;
  if (/wi-?fi|wireless|ethernet/i.test(name)) score += 60;
  if (/loopback|topaz|virtual|vethernet|docker|wsl|vpn/i.test(name)) score -= 500;
  if (netmask === '0.0.0.0') score -= 500;
  return score;
}

const candidates = Object.entries(networkInterfaces()).flatMap(([name, entries]) =>
  (entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal && isPrivateIpv4(entry.address))
    .map((entry) => ({
      name,
      address: entry.address,
      score: addressScore(name, entry.address, entry.netmask),
    })),
).sort((a, b) => b.score - a.score);

const selected = candidates[0];
if (!selected) {
  console.error('Não encontrei um endereço de rede local. Confira o Wi-Fi ou o cabo de rede.');
  process.exit(1);
}

console.log(`Rede detectada: ${selected.name} • ${selected.address}`);
console.log(`O QR Code deverá mostrar exp://${selected.address}:8081`);

const expoCli = require.resolve('expo/bin/cli');
const child = spawn(
  process.execPath,
  [expoCli, 'start', '--lan', '--clear', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      REACT_NATIVE_PACKAGER_HOSTNAME: selected.address,
    },
  },
);

child.on('exit', (code) => process.exit(code ?? 1));

