import React, { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin, onCancel }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/login', { method: 'POST', body: { username, password } });
      onLogin(data);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="modal">
      <form className="card login" onSubmit={submit}>
        <h2>Supervisor Login</h2>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="submit">Login</button>
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        </div>
        <small>Demo: admin / admin123 &nbsp;|&nbsp; supervisor / safe123</small>
      </form>
    </div>
  );
}
