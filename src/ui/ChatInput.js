'use client';

import { useState, useRef, useEffect } from 'react';
import { InputLockSystem } from '../systems/InputLockSystem.js';

/**
 * ChatInput - floating chat bar at the bottom of the screen.
 *
 * - Press Enter (when chat NOT open) → open + lock input
 * - Type message → press Enter → send + close
 * - Press Escape → cancel + close
 * - Auto-focuses text input when opened
 * - Registers/deregisters 'chat' lock source with InputLockSystem
 */
export default function ChatInput({ onSend, isOpen, onOpen, onClose }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  // Focus when opened
  useEffect(() => {
    if (isOpen) {
      InputLockSystem.lock('chat');
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      InputLockSystem.unlock('chat');
    }
    return () => {
      // Cleanup on unmount
      InputLockSystem.unlock('chat');
    };
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (text.trim()) {
        onSend(text.trim());
      }
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
    <div style={{
      position:   'absolute',
      bottom:     16,
      left:       '50%',
      transform:  'translateX(-50%)',
      zIndex:     200,
      display:    'flex',
      alignItems: 'center',
      gap:        6,
      fontFamily: 'monospace',
    }}>
      {/* Label */}
      <span style={{ color: '#7cbe7c', fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap' }}>
        💬 Say:
      </span>

      {/* Input */}
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value.slice(0, 120))}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send, Esc to cancel)"
        style={{
          background:  'rgba(0,0,0,0.85)',
          border:      '1px solid #4a8a4a',
          borderRadius: 4,
          color:       '#d4e8d4',
          fontSize:    11,
          padding:     '5px 10px',
          width:       320,
          outline:     'none',
          fontFamily:  'monospace',
          letterSpacing: 0.5,
          boxShadow:   '0 0 12px rgba(0,0,0,0.8)',
        }}
        maxLength={120}
      />

      {/* Char counter */}
      <span style={{ color: '#2a5a2a', fontSize: 9, whiteSpace: 'nowrap' }}>
        {text.length}/120
      </span>

      {/* Hint */}
      <span style={{ color: '#1a3a1a', fontSize: 9, whiteSpace: 'nowrap' }}>
        [Esc] cancel
      </span>
    </div>
  );
}
