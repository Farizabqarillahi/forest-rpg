'use client';

export default function DialogueUI({ dialogue }) {
  if (!dialogue) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(600px, 92vw)',
      background: 'linear-gradient(135deg, #080f08 0%, #060608 100%)',
      border: '2px solid #2a4a2a',
      borderRadius: 8, padding: '14px 18px',
      zIndex: 80,
      boxShadow: '0 0 40px rgba(0,0,0,0.95), 0 0 20px rgba(40,120,40,0.08)',
      fontFamily: 'monospace',
    }}>
      {/* NPC Name banner */}
      {dialogue.npcName && (
        <div style={{
          position: 'absolute', top: -14, left: 16,
          background: '#1a3a1a', border: '1px solid #2a5a2a',
          borderRadius: 3, padding: '2px 12px',
          color: '#7cbe7c', fontSize: 10, letterSpacing: 2,
        }}>
          {dialogue.npcName.toUpperCase()}
        </div>
      )}

      {/* Dialogue text */}
      <div style={{
        color: '#d4e8d4', fontSize: 12, lineHeight: 1.75,
        minHeight: 44, letterSpacing: 0.4,
      }}>
        {dialogue.displayText}
        {!dialogue.typingDone && (
          <span style={{ animation: 'blink 0.55s step-end infinite' }}>▌</span>
        )}
      </div>

      {/* Choices */}
      {dialogue.typingDone && dialogue.choices && dialogue.choices.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid #1a3a1a', paddingTop: 10 }}>
          {dialogue.choices.map((choice, i) => (
            <div key={i} style={{
              padding: '5px 10px',
              color: i === dialogue.selectedChoice ? '#7cbe7c' : '#4a7a4a',
              fontSize: 11,
              borderLeft: `2px solid ${i === dialogue.selectedChoice ? '#7cbe7c' : 'transparent'}`,
              marginBottom: 3,
              background: i === dialogue.selectedChoice ? 'rgba(124,190,124,0.06)' : 'transparent',
              borderRadius: '0 3px 3px 0',
              transition: 'all 0.1s',
            }}>
              {i === dialogue.selectedChoice ? '▶ ' : '  '}{choice.text}
            </div>
          ))}
          <div style={{ color: '#2a4a2a', fontSize: 9, marginTop: 8, letterSpacing: 1 }}>
            ↑↓ Navigate &nbsp;·&nbsp; [E] Confirm
          </div>
        </div>
      )}

      {/* Continue prompt */}
      {dialogue.typingDone && (!dialogue.choices || dialogue.choices.length === 0) && (
        <div style={{
          textAlign: 'right', color: '#2a5a2a', fontSize: 9,
          marginTop: 8, letterSpacing: 1, animation: 'pulse 1.2s ease-in-out infinite',
        }}>
          [E] Continue ▶
        </div>
      )}

      <style>{`
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
