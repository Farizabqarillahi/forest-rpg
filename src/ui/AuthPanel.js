'use client';

import { useState, useEffect } from 'react';
import { InputLockSystem } from '../systems/InputLockSystem.js';

const LOCK_REASON = 'auth';

export default function AuthPanel({ onLogin, onRegister, onLogout, user, isOnline }) {
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  useEffect(() => {
    InputLockSystem.lock(LOCK_REASON);
    return () => InputLockSystem.clearReason(LOCK_REASON);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError(''); setSuccess(''); setLoading(true);

    if (!email.trim()) {
      setError('Email is required.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (mode === 'login') {
        result = await onLogin(email.trim(), password);
      } else {
        result = await onRegister(email.trim(), password);
      }

      if (result?.error) {
        const msg = result.error.message || '';
        if (msg.includes('already registered')) {
          setError('Email already registered.');
        } else if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
          setError('Wrong email or password.');
        } else if (msg.includes('Email rate limit')) {
          setError('Too many attempts. Please wait a moment.');
        } else {
          setError(msg || 'Something went wrong.');
        }
      } else {
        setSuccess(mode === 'register' ? 'Account created! Welcome.' : '');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div style={panelStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>🧙</span>
          <div style={{ flex:1 }}>
            <div style={{ color:'#7cbe7c', fontSize:12, letterSpacing:1, fontWeight:'bold' }}>
              {user.email}
            </div>
            <div style={{ color:'#2a5a2a', fontSize:9, marginTop:1 }}>
              Logged in
            </div>
          </div>
          <button onClick={onLogout} style={btn('#4a1a1a','#be7c7c')}>
            Logout
          </button>
        </div>
        {!isOnline && <OfflineNote />}
      </div>
    );
  }

  return (
    <div style={panelStyle} onClick={e => e.stopPropagation()}>
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        {['login','register'].map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); setSuccess(''); }}
            style={{
              ...btn(mode === m ? '#1a3a1a' : 'transparent', mode === m ? '#7cbe7c' : '#3a5a3a'),
              flex:1, fontSize:10,
            }}
          >
            {m === 'login' ? '🔑 Login' : '✨ Register'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <label style={{ color:'#4a7a4a', fontSize:9, letterSpacing:1 }}>EMAIL</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.stopPropagation()}
          placeholder="you@email.com"
          style={inputStyle}
          autoComplete="email"
          required
        />

        <label style={{ color:'#4a7a4a', fontSize:9, letterSpacing:1, marginTop:2 }}>PASSWORD</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.stopPropagation()}
          placeholder="••••••••"
          style={inputStyle}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={6}
        />

        {error   && <div style={{ color:'#ff7777', fontSize:9, padding:'4px 0' }}>⚠ {error}</div>}
        {success && <div style={{ color:'#7cbe7c', fontSize:9, padding:'4px 0' }}>✓ {success}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ ...btn('#1a4a2a','#7cbe7c'), fontSize:11, padding:'7px 0', marginTop:2, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '…' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>

      {!isOnline && <OfflineNote />}
    </div>
  );
}

function OfflineNote() {
  return (
    <div style={{ color:'#555', fontSize:8, marginTop:10, textAlign:'center', lineHeight:1.6 }}>
      Offline mode — multiplayer disabled.<br/>
      Set NEXT_PUBLIC_SUPABASE_URL in .env.local
    </div>
  );
}

const panelStyle = {
  background: 'rgba(6,12,6,0.97)',
  border:     '1px solid #2a4a2a',
  borderRadius: 8,
  padding:    '14px 16px',
  minWidth:   230,
  fontFamily: 'monospace',
  boxShadow:  '0 4px 24px rgba(0,0,0,0.8)',
};

const inputStyle = {
  background:   '#0a150a',
  border:       '1px solid #2a4a2a',
  borderRadius: 4,
  color:        '#9cce9c',
  fontSize:     11,
  padding:      '6px 9px',
  fontFamily:   'monospace',
  width:        '100%',
  boxSizing:    'border-box',
  outline:      'none',
};

const btn = (bg, color) => ({
  background:   bg,
  border:       `1px solid ${color}55`,
  borderRadius: 4,
  color,
  cursor:       'pointer',
  padding:      '4px 10px',
  fontFamily:   'monospace',
  letterSpacing: 1,
  transition:   'filter 0.1s',
});