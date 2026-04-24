'use client';

export default function HUD({ stats }) {
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHP) * 100));
  const energyPct = Math.max(0, Math.min(100, (stats.energy / stats.maxEnergy) * 100));

  const hpColor = hpPct > 60 ? '#4caf50' : hpPct > 30 ? '#ff9800' : '#f44336';

  return (
    <div style={{
      position: 'absolute', top: '10px', left: '10px',
      display: 'flex', flexDirection: 'column', gap: '5px',
      zIndex: 50, minWidth: '180px',
    }}>
      {/* HP Bar */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          color: '#ccc', fontSize: '9px', marginBottom: '2px', letterSpacing: '1px',
        }}>
          <span>❤ HP</span>
          <span style={{ color: hpColor }}>{Math.floor(stats.hp)}/{stats.maxHP}</span>
        </div>
        <div style={{
          height: '8px', background: 'rgba(0,0,0,0.7)',
          border: '1px solid #444', borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${hpPct}%`, height: '100%',
            background: `linear-gradient(90deg, ${hpColor}aa, ${hpColor})`,
            transition: 'width 0.3s, background 0.5s',
            borderRadius: '1px',
          }} />
        </div>
      </div>

      {/* Energy Bar */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          color: '#ccc', fontSize: '9px', marginBottom: '2px', letterSpacing: '1px',
        }}>
          <span>⚡ EN</span>
          <span style={{ color: '#58c4dd' }}>{Math.floor(stats.energy)}/{stats.maxEnergy}</span>
        </div>
        <div style={{
          height: '8px', background: 'rgba(0,0,0,0.7)',
          border: '1px solid #444', borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${energyPct}%`, height: '100%',
            background: 'linear-gradient(90deg, #1a5f7a, #58c4dd)',
            transition: 'width 0.2s',
            borderRadius: '1px',
          }} />
        </div>
      </div>

      {/* Time */}
      <div style={{
        marginTop: '4px',
        background: 'rgba(0,0,0,0.65)',
        border: '1px solid #2a3a2a',
        borderRadius: '3px',
        padding: '3px 8px',
        color: '#7cbe7c',
        fontSize: '10px',
        letterSpacing: '2px',
        textAlign: 'center',
      }}>
        🕐 {stats.time}
      </div>
    </div>
  );
}
