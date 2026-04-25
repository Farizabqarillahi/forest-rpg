'use client';

export default function HUD({ stats }) {
  const hp  = stats.hp  ?? 100;
  const mhp = stats.maxHP ?? 100;
  const en  = stats.energy ?? 50;
  const men = stats.maxEnergy ?? 50;
  const xp  = stats.xp ?? 0;
  const xpN = stats.xpToNext ?? 100;

  const hpPct  = Math.max(0, Math.min(100, (hp / mhp) * 100));
  const enPct  = Math.max(0, Math.min(100, (en / men) * 100));
  const xpPct  = Math.max(0, Math.min(100, (xp / xpN) * 100));

  const hpColor = hpPct > 60 ? '#4caf50' : hpPct > 30 ? '#ff9800' : '#f44336';

  return (
    <div style={{
      position: 'absolute', top: 10, left: 10,
      display: 'flex', flexDirection: 'column', gap: 5,
      zIndex: 50, minWidth: 190, fontFamily: 'monospace',
    }}>
      {/* Level badge */}
      <div style={{
        background: 'rgba(0,0,0,0.7)', border: '1px solid #ffd700',
        borderRadius: 3, padding: '2px 8px', display: 'inline-flex',
        alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      }}>
        <span style={{ color: '#ffd700', fontSize: 10, letterSpacing: 1 }}>
          ⭐ Lv.{stats.level ?? 1}
        </span>
        <span style={{ color: '#888', fontSize: 9 }}>
          {stats.attack ?? 0} ATK | {stats.defense ?? 0} DEF
        </span>
      </div>

      {/* HP */}
      <StatBar label="❤ HP" value={hp} max={mhp} pct={hpPct} color={hpColor} />
      {/* Energy */}
      <StatBar label="⚡ EN" value={en} max={men} pct={enPct} color="#58c4dd" />
      {/* XP */}
      <StatBar label="✨ XP" value={xp} max={xpN} pct={xpPct} color="#ffd700" hideValues />

      {/* Time */}
      <div style={{
        background: 'rgba(0,0,0,0.65)', border: '1px solid #2a3a2a',
        borderRadius: 3, padding: '3px 8px', color: '#7cbe7c',
        fontSize: 10, letterSpacing: 2, textAlign: 'center', marginTop: 2,
      }}>
        🕐 {stats.time ?? '08:00'}
      </div>
    </div>
  );
}

function StatBar({ label, value, max, pct, color, hideValues }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        color: '#ccc', fontSize: 9, marginBottom: 2, letterSpacing: 1,
      }}>
        <span>{label}</span>
        {!hideValues && <span style={{ color }}>{Math.floor(value)}/{max}</span>}
      </div>
      <div style={{
        height: 8, background: 'rgba(0,0,0,0.7)',
        border: '1px solid #444', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg,${color}99,${color})`,
          transition: 'width 0.25s, background 0.5s', borderRadius: 1,
        }} />
      </div>
    </div>
  );
}
