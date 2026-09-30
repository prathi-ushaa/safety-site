const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { db, save } = require('./db');
const monitor = require('./monitor');
const THRESHOLDS = require('./thresholds');
const { startSimulator } = require('./simulator');

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const INGEST_KEY = process.env.INGEST_KEY || 'device-key-123';
const SIMULATE = process.env.SIMULATE !== 'false';
const USERS = {
  admin: { password: process.env.ADMIN_PASSWORD || 'admin123', role: 'admin' },
  supervisor: { password: process.env.SUPERVISOR_PASSWORD || 'safe123', role: 'supervisor' },
};

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

monitor.setEmitter({
  reading: (r) => io.emit('reading', r),
  alert: (a) => io.emit('alert', a),
});

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch (e) { res.status(401).json({ error: 'Unauthorized - please log in' }); }
}

// ---------- Public / health ----------
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() }));
app.get('/api/thresholds', (req, res) => res.json(THRESHOLDS));

// ---------- Auth ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = USERS[username];
  if (!u || u.password !== password) return res.status(401).json({ error: 'Invalid username or password' });
  const token = jwt.sign({ username, role: u.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { username, role: u.role } });
});

// ---------- Sensor data ----------
app.get('/api/zones', (req, res) => res.json(monitor.getLatest()));
app.get('/api/readings/:zoneId', (req, res) =>
  res.json(monitor.getHistory(req.params.zoneId, Number(req.query.limit) || 50)));

// Endpoint for real IoT devices / edge gateways (secured by API key)
app.post('/api/sensors/ingest', (req, res) => {
  if (req.headers['x-api-key'] !== INGEST_KEY) return res.status(401).json({ error: 'Bad API key' });
  const b = req.body || {};
  if (!b.zoneId || !b.zoneName) return res.status(400).json({ error: 'zoneId and zoneName required' });
  res.status(201).json(monitor.processReading(b));
});

// ---------- Alerts ----------
app.get('/api/alerts', (req, res) => {
  let list = db.alerts;
  if (req.query.active === 'true') list = list.filter((a) => !a.acknowledged);
  res.json(list.slice(0, Number(req.query.limit) || 100));
});
app.patch('/api/alerts/:id/ack', auth, (req, res) => {
  const a = db.alerts.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Alert not found' });
  a.acknowledged = true; a.acknowledgedBy = req.user.username; save();
  io.emit('alert-updated', a);
  res.json(a);
});

// ---------- Incidents ----------
app.get('/api/incidents', (req, res) => res.json(db.incidents));
app.post('/api/incidents', auth, (req, res) => {
  const { title, zoneId, severity, description } = req.body || {};
  if (!title || !zoneId) return res.status(400).json({ error: 'title and zoneId are required' });
  const inc = {
    id: Date.now().toString(36), title, zoneId,
    severity: severity || 'low', description: description || '',
    status: 'open', reportedBy: req.user.username, timestamp: new Date().toISOString(),
  };
  db.incidents.unshift(inc); save();
  io.emit('incident', inc);
  res.status(201).json(inc);
});
app.patch('/api/incidents/:id', auth, (req, res) => {
  const inc = db.incidents.find((x) => x.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'Incident not found' });
  if (req.body.status) inc.status = req.body.status;
  save(); res.json(inc);
});

// ---------- Stats ----------
app.get('/api/stats', (req, res) => {
  const zones = monitor.getLatest();
  const avg = zones.length ? Math.round(zones.reduce((s, z) => s + z.score, 0) / zones.length) : 100;
  res.json({
    zones: zones.length,
    activeAlerts: db.alerts.filter((a) => !a.acknowledged).length,
    openIncidents: db.incidents.filter((i) => i.status === 'open').length,
    workersOnSite: zones.reduce((s, z) => s + (z.workers || 0), 0),
    avgSafetyScore: avg,
  });
});

io.on('connection', (socket) => {
  monitor.getLatest().forEach((r) => socket.emit('reading', r));
});

server.listen(PORT, () => {
  console.log(`Site Safety backend running on port ${PORT}`);
  if (SIMULATE) { startSimulator(monitor.processReading); console.log('Sensor simulator started'); }
});
