'use client';

import { useState } from 'react';

export default function AuthPanel({ onLogin, onRegister, onLogout, user, isOnline }) {
  const [mode,     setMode]     = useState('login'); // 'login' | 'register'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await onLogin(email, password);
      } else {
        if (!username.trim()) { setError('Username is required.'); setLoading(false); return; }
        result = await onRegister(email, password, username.trim());
      }
      if (result?.error) {
        setError(result.error.message || 'Unknown error.');
      } else {
        setSuccess(mode === 'register' ? 'Account created! You are now logged in.' : '');
        setEmail(''); setPassword(''); setUsername('');
      }
    } catch (err) {
      setError(err.message || 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  // ── Logged-in view ────────────────────────────────────────────────
  if (user) {
    return (
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🧙</span>
          <div>
            <div style={{ color: '#7cbe7c', fontSize: 11, letterSpacing: 1 }}>{user.username}</div>
            <div style={{ color: '#444', fontSize: 9 }}>{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            style={{ ...smallBtn('#4a1a1a', '#be7c7c'), marginLeft: 'auto' }}
          >
            Logout
          </button>
        </div>
        {!isOnline && (
          <div style={{ color: '#ff9944', fontSize: 8, marginTop: 6, textAlign: 'center' }}>
            ⚠ Offline mode — configure Supabase env vars
          </div>
        )}
      </div>
    );
  }

  // ── Auth form ─────────────────────────────────────────────────────
  return (
    <div style={panel}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['login', 'register'].map(m => (
          <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
            style={{
              ...smallBtn(mode === m ? '#1a3a1a' : 'transparent', mode === m ? '#7cbe7c' : '#3a5a3a'),
              fontSize: 10, flex: 1,
            }}>
            {m === 'login' ? '🔑 Login' : '✨ Register'}
          </button>
        ))}
      </div>

      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {mode === 'register' && (
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={inp}
            required
            maxLength={20}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inp}
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inp}
          required
          minLength={6}
        />

        {error   && <div style={{ color: '#ff6666', fontSize: 9 }}>⚠ {error}</div>}
        {success && <div style={{ color: '#90ee90', fontSize: 9 }}>✓ {success}</div>}

        <button type="submit" disabled={loading}
          style={{
            ...smallBtn('#1a4a2a', '#7cbe7c'),
            fontSize: 11, padding: '6px 0', opacity: loading ? 0.6 : 1,
          }}>
          {loading ? '...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>

      {!isOnline && (
        <div style={{ color: '#555', fontSize: 8, marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>
          No Supabase keys — running offline.<br/>
          Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
        </div>
      )}
    </div>
  );
}

const panel = {
  background: 'rgba(6,12,6,0.97)',
  border: '1px solid #2a4a2a',
  borderRadius: 6,
  padding: '12px 14px',
  minWidth: 220,
  fontFamily: 'monospace',
};

const inp = {
  background: '#0a140a',
  border: '1px solid #2a4a2a',
  borderRadius: 3,
  color: '#9cce9c',
  fontSize: 11,
  padding: '5px 8px',
  outline: 'none',
  fontFamily: 'monospace',
  width: '100%',
  boxSizing: 'border-box',
};

const smallBtn = (bg, color) => ({
  background: bg,
  border: `1px solid ${color}66`,
  borderRadius: 3,
  color,
  cursor: 'pointer',
  padding: '4px 10px',
  fontFamily: 'monospace',
  letterSpacing: 1,
  transition: 'filter 0.1s',
});
