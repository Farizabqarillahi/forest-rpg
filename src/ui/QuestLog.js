'use client';

export default function QuestLog({ quests, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 10, right: 10,
      background: 'rgba(8,12,8,0.92)',
      border: '1px solid #2a4a2a',
      borderRadius: 6, padding: '10px 12px',
      zIndex: 60, fontFamily: 'monospace',
      minWidth: 200, maxWidth: 260,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#7cbe7c', fontSize: 10, letterSpacing: 2 }}>📜 QUESTS</span>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#555',
            cursor: 'pointer', fontSize: 10,
          }}>✕</button>
        )}
      </div>

      {quests.length === 0 && (
        <div style={{ color: '#333', fontSize: 9, textAlign: 'center', padding: '8px 0' }}>
          No active quests.<br/>Talk to villagers to find tasks.
        </div>
      )}

      {quests.map(q => {
        const allDone = q.def.objectives.every((obj, i) => q.progress[i] >= obj.count);
        return (
          <div key={q.id} style={{
            borderTop: '1px solid #1a2a1a', paddingTop: 6, marginTop: 6,
          }}>
            <div style={{
              color: allDone ? '#ffd700' : q.def.color,
              fontSize: 10, marginBottom: 3, letterSpacing: 0.5,
            }}>
              {allDone ? '✓ ' : ''}{q.def.title}
            </div>
            <div style={{ color: '#666', fontSize: 8, marginBottom: 4 }}>
              {q.def.description}
            </div>
            {q.def.objectives.map((obj, i) => {
              const prog = q.progress[i] || 0;
              const done = prog >= obj.count;
              const pct  = Math.min(100, (prog / obj.count) * 100);
              return (
                <div key={i} style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: done ? '#7cbe7c' : '#888', fontSize: 8 }}>
                      {done ? '✓' : '○'} {obj.label}
                    </span>
                    <span style={{ color: done ? '#7cbe7c' : '#555', fontSize: 8 }}>
                      {prog}/{obj.count}
                    </span>
                  </div>
                  <div style={{
                    height: 3, background: 'rgba(0,0,0,0.5)',
                    border: '1px solid #1a2a1a', borderRadius: 1, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: done ? '#7cbe7c' : '#3a6a3a',
                    }} />
                  </div>
                </div>
              );
            })}
            {allDone && (
              <div style={{
                color: '#ffd700', fontSize: 8, textAlign: 'center',
                marginTop: 2, animation: 'pulse 1s ease-in-out infinite',
              }}>
                Return to quest giver!
              </div>
            )}
          </div>
        );
      })}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
