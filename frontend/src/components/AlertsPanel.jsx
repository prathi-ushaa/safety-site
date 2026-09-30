import React from 'react';

export default function AlertsPanel({ alerts, canAck, onAck, limit }) {
  const list = limit ? alerts.slice(0, limit) : alerts;
  return (
    <div className="card">
      <h3>Alerts {limit ? '(latest)' : ''}</h3>
      {list.length === 0 && <p className="muted">No alerts yet. Site looks safe.</p>}
      <ul className="list">
        {list.map((a) => (
          <li key={a.id} className={`alert ${a.severity} ${a.acknowledged ? 'done' : ''}`}>
            <div>
              <b>{a.severity.toUpperCase()}</b> — {a.message}
              <small>{new Date(a.timestamp).toLocaleString()}{a.acknowledged ? ` • ack by ${a.acknowledgedBy}` : ''}</small>
            </div>
            {!a.acknowledged && (
              <button className="small" onClick={() => onAck(a.id)} title={canAck ? '' : 'Login required'}>
                Acknowledge
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
