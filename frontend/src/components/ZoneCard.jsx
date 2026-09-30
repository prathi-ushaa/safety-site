import React from 'react';

const METRICS = [
  ['temperature', 'Temp', '°C', (v) => v > 40],
  ['gas', 'Gas', 'ppm', (v) => v > 50],
  ['noise', 'Noise', 'dB', (v) => v > 95],
  ['vibration', 'Vibration', 'mm/s', (v) => v > 7],
  ['helmetCompliance', 'Helmets', '%', (v) => v < 80],
];

export default function ZoneCard({ zone, selected, onSelect }) {
  const level = zone.score >= 80 ? 'safe' : zone.score >= 60 ? 'warn' : 'danger';
  return (
    <div className={`card zone ${level} ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="zone-head">
        <h3>{zone.zoneName}</h3>
        <span className={`badge ${level}`}>{zone.score}</span>
      </div>
      <div className="metrics">
        {METRICS.map(([key, label, unit, bad]) => (
          <div key={key} className={`metric ${bad(zone[key]) ? 'bad' : ''}`}>
            <span>{label}</span>
            <b>{zone[key]}{unit}</b>
          </div>
        ))}
      </div>
      <small>Workers on zone: {zone.workers}</small>
    </div>
  );
}
