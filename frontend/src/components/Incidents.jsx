import React, { useState } from 'react';

export default function Incidents({ incidents, zones, canEdit, onCreate, onResolve }) {
  const [form, setForm] = useState({ title: '', zoneId: 'A', severity: 'low', description: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    await onCreate(form);
    setForm({ ...form, title: '', description: '' });
  };

  return (
    <div className="grid two">
      <form className="card" onSubmit={submit}>
        <h3>Report Incident</h3>
        <input required placeholder="Title (e.g. Worker slipped near ramp)" value={form.title} onChange={set('title')} />
        <select value={form.zoneId} onChange={set('zoneId')}>
          {(zones.length ? zones : [{ zoneId: 'A', zoneName: 'Zone A' }]).map((z) => (
            <option key={z.zoneId} value={z.zoneId}>{z.zoneName}</option>
          ))}
        </select>
        <select value={form.severity} onChange={set('severity')}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <textarea rows="3" placeholder="Description" value={form.description} onChange={set('description')} />
        <button type="submit">{canEdit ? 'Submit incident' : 'Login to submit'}</button>
      </form>

      <div className="card">
        <h3>Incident Log</h3>
        {incidents.length === 0 && <p className="muted">No incidents reported.</p>}
        <ul className="list">
          {incidents.map((i) => (
            <li key={i.id} className={`alert ${i.severity === 'high' ? 'critical' : 'warning'} ${i.status === 'resolved' ? 'done' : ''}`}>
              <div>
                <b>{i.title}</b> <span className="badge">{i.status}</span>
                <small>Zone {i.zoneId} • {i.severity} • by {i.reportedBy} • {new Date(i.timestamp).toLocaleString()}</small>
                {i.description && <small>{i.description}</small>}
              </div>
              {i.status === 'open' && <button className="small" onClick={() => onResolve(i.id)}>Resolve</button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
