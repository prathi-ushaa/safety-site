// Simulates IoT sensors on a construction site. Real devices can instead POST to /api/sensors/ingest
const ZONES = [
  { zoneId: 'A', zoneName: 'Zone A - Excavation' },
  { zoneId: 'B', zoneName: 'Zone B - Crane Area' },
  { zoneId: 'C', zoneName: 'Zone C - Welding Bay' },
  { zoneId: 'D', zoneName: 'Zone D - Material Storage' },
];

const rnd = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const state = {};
ZONES.forEach((z) => {
  state[z.zoneId] = { temperature: rnd(28, 34), gas: rnd(8, 25), noise: rnd(65, 85), vibration: rnd(1, 4), helmetCompliance: rnd(88, 99), workers: Math.floor(rnd(5, 20)) };
});

function step(zone) {
  const s = state[zone.zoneId];
  s.temperature = clamp(s.temperature + rnd(-1.2, 1.4), 24, 48);
  s.gas = clamp(s.gas + rnd(-4, 5), 2, 75);
  s.noise = clamp(s.noise + rnd(-4, 4.5), 55, 110);
  s.vibration = clamp(s.vibration + rnd(-0.8, 0.9), 0, 10);
  s.helmetCompliance = clamp(s.helmetCompliance + rnd(-3, 2.5), 60, 100);
  s.workers = clamp(s.workers + Math.round(rnd(-1, 1)), 0, 40);
  const r = (n, d = 1) => Number(n.toFixed(d));
  return {
    ...zone,
    temperature: r(s.temperature), gas: r(s.gas), noise: r(s.noise),
    vibration: r(s.vibration), helmetCompliance: r(s.helmetCompliance, 0), workers: s.workers,
  };
}

function startSimulator(onReading, intervalMs = 2000) {
  return setInterval(() => ZONES.forEach((z) => onReading(step(z))), intervalMs);
}

module.exports = { startSimulator, ZONES };
