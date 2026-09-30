import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function LiveChart({ title, data }) {
  const rows = data.map((d) => ({ ...d, time: new Date(d.timestamp).toLocaleTimeString() }));
  return (
    <div className="card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2b3444" />
          <XAxis dataKey="time" stroke="#8b98ad" tick={{ fontSize: 11 }} />
          <YAxis stroke="#8b98ad" />
          <Tooltip contentStyle={{ background: '#161c27', border: '1px solid #2b3444' }} />
          <Legend />
          <Line type="monotone" dataKey="temperature" stroke="#ff7a59" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="gas" stroke="#f5c542" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="noise" stroke="#4ea1ff" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="vibration" stroke="#b18cff" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
