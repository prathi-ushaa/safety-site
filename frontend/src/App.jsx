import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from './api.js';
import Login from './components/Login.jsx';
import ZoneCard from './components/ZoneCard.jsx';
import LiveChart from './components/LiveChart.jsx';
import AlertsPanel from './components/AlertsPanel.jsx';
import Incidents from './components/Incidents.jsx';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [zones, setZones] = useState({});
  const [history, setHistory] = useState({});
  const [selected, setSelected] = useState('A');
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem('auth') || 'null'));
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef();

  const notify = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  };

  const refreshStats = () => api('/stats').then(setStats).catch(() => {});

  useEffect(() => {
    api('/alerts').then(setAlerts).catch(() => {});
    api('/incidents').then(setIncidents).catch(() => {});
    refreshStats();

    const socket = io();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('reading', (r) => {
      setZones((z) => ({ ...z, [r.zoneId]: r }));
      setHistory((h) => ({ ...h, [r.zoneId]: [...(h[r.zoneId] || []).slice(-39), r] }));
    });
    socket.on('alert', (a) => {
      setAlerts((l) => [a, ...l].slice(0, 200));
      notify('⚠ ' + a.message);
      refreshStats();
    });
    socket.on('alert-updated', (a) => {
      setAlerts((l) => l.map((x) => (x.id === a.id ? a : x)));
      refreshStats();
    });
    socket.on('incident', (i) => {
      setIncidents((l) => (l.some((x) => x.id === i.id) ? l : [i, ...l]));
      refreshStats();
    });
    const t = setInterval(refreshStats, 10000);
    return () => { socket.close(); clearInterval(t); };
  }, []);

  const requireAuth = () => {
    if (auth) return true;
    setShowLogin(true);
    return false;
  };

  const handleLogin = (data) => {
    setAuth(data);
    localStorage.setItem('auth', JSON.stringify(data));
    setShowLogin(false);
  };
  const logout = () => { setAuth(null); localStorage.removeItem('auth'); };

  const withAuth = async (fn) => {
    try { return await fn(); }
    catch (e) {
      if (e.message.includes('Unauthorized')) { logout(); setShowLogin(true); }
      else notify(e.message);
    }
  };

  const ackAlert = (id) => {
    if (!requireAuth()) return;
    withAuth(() => api(`/alerts/${id}/ack`, { method: 'PATCH', token: auth.token }));
  };
  const createIncident = (form) => {
    if (!requireAuth()) return;
    return withAuth(() => api('/incidents', { method: 'POST', body: form, token: auth.token }));
  };
  const resolveIncident = (id) => {
    if (!requireAuth()) return;
    withAuth(async () => {
      const inc = await api(`/incidents/${id}`, { method: 'PATCH', body: { status: 'resolved' }, token: auth.token });
      setIncidents((l) => l.map((x) => (x.id === id ? inc : x)));
      refreshStats();
    });
  };

  const zoneList = Object.values(zones).sort((a, b) => a.zoneId.localeCompare(b.zoneId));

  return (
    <div className="app">
      <header>
        <div>
          <h1>🏗 Site Safety Monitoring</h1>
          <small>Cloud-Based Real-Time Platform</small>
        </div>
        <nav>
          {['dashboard', 'alerts', 'incidents'].map((t) => (
            <button key={t} className={tab === t ? 'active' : 'ghost'} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <div className="right">
          <span className={`dot ${connected ? 'on' : 'off'}`} /> {connected ? 'Live' : 'Offline'}
          {auth ? (
            <>
              <span className="user">👷 {auth.user.username}</span>
              <button className="ghost small" onClick={logout}>Logout</button>
            </>
          ) : (
            <button className="small" onClick={() => setShowLogin(true)}>Login</button>
          )}
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}
      {showLogin && <Login onLogin={handleLogin} onCancel={() => setShowLogin(false)} />}

      <main>
        {tab === 'dashboard' && (
          <>
            {stats && (
              <div className="grid stats">
                <div className="card stat"><span>Avg Safety Score</span><b>{stats.avgSafetyScore}</b></div>
                <div className="card stat"><span>Active Alerts</span><b className={stats.activeAlerts ? 'red' : ''}>{stats.activeAlerts}</b></div>
                <div className="card stat"><span>Open Incidents</span><b>{stats.openIncidents}</b></div>
                <div className="card stat"><span>Workers On Site</span><b>{stats.workersOnSite}</b></div>
              </div>
            )}
            <div className="grid zones">
              {zoneList.map((z) => (
                <ZoneCard key={z.zoneId} zone={z} selected={selected === z.zoneId} onSelect={() => setSelected(z.zoneId)} />
              ))}
              {zoneList.length === 0 && <p className="muted">Waiting for sensor data…</p>}
            </div>
            <div className="grid two">
              <LiveChart title={`Live sensors — ${zones[selected]?.zoneName || 'Zone ' + selected}`} data={history[selected] || []} />
              <AlertsPanel alerts={alerts} canAck={!!auth} onAck={ackAlert} limit={6} />
            </div>
          </>
        )}
        {tab === 'alerts' && <AlertsPanel alerts={alerts} canAck={!!auth} onAck={ackAlert} />}
        {tab === 'incidents' && (
          <Incidents incidents={incidents} zones={zoneList} canEdit={!!auth} onCreate={createIncident} onResolve={resolveIncident} />
        )}
      </main>
      <footer>Cloud Computing Mini Project • Docker • AWS • VirtualBox • CloudSim</footer>
    </div>
  );
}
