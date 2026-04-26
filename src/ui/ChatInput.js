'use client';

import { useRef, useEffect, useState } from 'react';
import { InputLockSystem } from '../systems/InputLockSystem.js';

const LOCK_REASON = 'chat';

/**
 * ChatInput - Minimal floating input bar rendered above the canvas.
 *
 * Input lock contract (the key fix):
 *   - On open:   InputLockSystem.lock(LOCK_REASON)
 *   - On close:  InputLockSystem.clearReason(LOCK_REASON)   ← ALWAYS clearReason
 *
 * We NEVER call unlock() — only clearReason(). This guarantees the lock is
 * released regardless of HOW the component closes (Escape, click-outside,
 * parent state flip, React StrictMode double-mount, hot reload, etc.).
 *
 * The useEffect cleanup function runs on EVERY close path, so putting
 * clearReason there covers all cases without any extra logic.
 */
export default function ChatInput({ isOpen, onSend, onClose }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      InputLockSystem.lock(LOCK_REASON);
      // Delay focus slightly so the Enter key that opened chat
      // doesn't immediately trigger browser form behaviour
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => {
        clearTimeout(t);
        // clearReason on every cleanup path — this is the root-fix
        InputLockSystem.clearReason(LOCK_REASON);
      };
    }
    // Also clear if isOpen becomes false without unmounting
    InputLockSystem.clearReason(LOCK_REASON);
  }, [isOpen]);

  // Also clear on unmount (belt-and-suspenders)
  useEffect(() => {
    return () => InputLockSystem.clearReason(LOCK_REASON);
  }, []);

  const handleKeyDown = (e) => {
    // Stop ALL key events from reaching the game while chat is open
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = text.trim();
      if (trimmed) onSend(trimmed);
      setText('');
      onClose();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setText('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position:  'absolute',
        bottom:    20,
        left:      '50%',
        transform: 'translateX(-50%)',
        zIndex:    200,
        display:   'flex',
        alignItems:'center',
        gap:       8,
        fontFamily:'monospace',
        // Allow clicks to pass through the outer div but not the input itself
        pointerEvents: 'none',
      }}
    >
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           8,
        background:    'rgba(0,0,0,0.82)',
        border:        '1px solid #3a6a3a',
        borderRadius:  6,
        padding:       '5px 10px',
        boxShadow:     '0 2px 16px rgba(0,0,0,0.7)',
        pointerEvents: 'auto',
      }}>
        <span style={{ color:'#7cbe7c', fontSize:10, whiteSpace:'nowrap' }}>
          💬
        </span>
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value.slice(0, 120))}
          onKeyDown={handleKeyDown}
          placeholder="Say something… (Enter to send)"
          style={{
            background:  'transparent',
            border:      'none',
            color:       '#d4e8d4',
            fontSize:    11,
            width:       280,
            outline:     'none',
            fontFamily:  'monospace',
            letterSpacing: 0.3,
          }}
          maxLength={120}
        />
        <span style={{ color:'#2a5a2a', fontSize:8, whiteSpace:'nowrap' }}>
          {text.length}/120
        </span>
        <span style={{ color:'#1a3a1a', fontSize:8, whiteSpace:'nowrap' }}>
          [Esc]
        </span>
      </div>
    </div>
  );
}
