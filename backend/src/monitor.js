const THRESHOLDS = require('./thresholds');
const { db, save } = require('./db');

const HISTORY_LIMIT = 200;
const COOLDOWN_MS = 30000; // don't repeat same alert for a zone within 30s
const latest = {};   // zoneId -> latest reading
const history = {};  // zoneId -> [readings]
const lastAlertAt = {};

let emitter = { reading() {}, alert() {} };
function setEmitter(e) { emitter = e; }

function isBreach(t, v) { return t.type === 'max' ? v > t.limit : v < t.limit; }

function safetyScore(r) {
  let score = 100;
  for (const [k, t] of Object.entries(THRESHOLDS)) {
    if (r[k] !== undefined && isBreach(t, r[k])) score -= 20;
  }
  return Math.max(0, score);
}

function processReading(input) {
  const reading = { ...input, timestamp: input.timestamp || new Date().toISOString() };
  reading.score = safetyScore(reading);
  latest[reading.zoneId] = reading;
  if (!history[reading.zoneId]) history[reading.zoneId] = [];
  history[reading.zoneId].push(reading);
  if (history[reading.zoneId].length > HISTORY_LIMIT) history[reading.zoneId].shift();
  emitter.reading(reading);

  for (const [metric, t] of Object.entries(THRESHOLDS)) {
    const v = reading[metric];
    if (v === undefined || !isBreach(t, v)) continue;
    const key = reading.zoneId + ':' + metric;
    if (Date.now() - (lastAlertAt[key] || 0) < COOLDOWN_MS) continue;
    lastAlertAt[key] = Date.now();
    const alert = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      zoneId: reading.zoneId,
      zoneName: reading.zoneName,
      metric,
      message: `${t.label} in ${reading.zoneName}: ${v}${t.unit} (limit ${t.limit}${t.unit})`,
      severity: Math.abs(v - t.limit) / t.limit > 0.2 ? 'critical' : 'warning',
      value: v,
      timestamp: reading.timestamp,
      acknowledged: false,
    };
    db.alerts.unshift(alert);
    if (db.alerts.length > 500) db.alerts.pop();
    save();
    emitter.alert(alert);
  }
  return reading;
}

module.exports = {
  processReading, setEmitter,
  getLatest: () => Object.values(latest),
  getHistory: (zoneId, limit = 50) => (history[zoneId] || []).slice(-limit),
};
