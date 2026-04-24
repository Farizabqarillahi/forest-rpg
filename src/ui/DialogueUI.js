'use client';

export default function DialogueUI({ dialogue }) {
  if (!dialogue) return null;

  return (
    <div style={{
      position: 'absolute', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(580px, 90vw)',
      background: 'linear-gradient(135deg, #0a140a 0%, #080810 100%)',
      border: '2px solid #2a4a2a',
      borderRadius: '8px',
      padding: '14px 18px',
      zIndex: 80,
      boxShadow: '0 0 30px rgba(0,0,0,0.9), 0 0 15px rgba(50,150,50,0.08)',
      fontFamily: 'monospace',
    }}>
      {/* NPC Name banner */}
      {dialogue.npcName && (
        <div style={{
          position: 'absolute', top: '-13px', left: '16px',
          background: '#1a3a1a', border: '1px solid #2a5a2a',
          borderRadius: '3px', padding: '2px 10px',
          color: '#7cbe7c', fontSize: '10px', letterSpacing: '2px',
        }}>
          {dialogue.npcName.toUpperCase()}
        </div>
      )}

      {/* Dialogue text */}
      <div style={{
        color: '#d4e8d4', fontSize: '12px', lineHeight: '1.7',
        minHeight: '40px', letterSpacing: '0.5px',
      }}>
        {dialogue.displayText}
        {/* Blinking cursor while typing */}
        {!dialogue.typingDone && (
          <span style={{ animation: 'blink 0.6s step-end infinite' }}>▌</span>
        )}
      </div>

      {/* Choices */}
      {dialogue.typingDone && dialogue.choices && dialogue.choices.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #1a3a1a', paddingTop: '10px' }}>
          {dialogue.choices.map((choice, i) => (
            <div
              key={i}
              style={{
                padding: '5px 10px',
                color: i === dialogue.selectedChoice ? '#7cbe7c' : '#5a8a5a',
                fontSize: '11px',
                letterSpacing: '0.5px',
                borderLeft: i === dialogue.selectedChoice
                  ? '2px solid #7cbe7c'
                  : '2px solid transparent',
                marginBottom: '3px',
                transition: 'all 0.1s',
                background: i === dialogue.selectedChoice
                  ? 'rgba(124,190,124,0.07)'
                  : 'transparent',
                borderRadius: '0 3px 3px 0',
              }}
            >
              {i === dialogue.selectedChoice ? '▶ ' : '  '}{choice.text}
            </div>
          ))}
          <div style={{ color: '#2a4a2a', fontSize: '9px', marginTop: '8px', letterSpacing: '1px' }}>
            ↑↓ Navigate &nbsp;·&nbsp; [E] Confirm
          </div>
        </div>
      )}

      {/* Continue prompt when no choices */}
      {dialogue.typingDone && (!dialogue.choices || dialogue.choices.length === 0) && (
        <div style={{
          textAlign: 'right', color: '#3a6a3a', fontSize: '9px',
          marginTop: '8px', letterSpacing: '1px',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}>
          [E] Continue ▶
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
