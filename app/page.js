'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import HUD        from '../src/ui/HUD';
import DialogueUI from '../src/ui/DialogueUI';
import QuestLog   from '../src/ui/QuestLog';
import ChatInput  from '../src/ui/ChatInput';
import { InputLockSystem } from '../src/systems/InputLockSystem.js';
import { isOnline } from '../src/systems/SupabaseService.js';

// Dynamic imports prevent SSR hydration mismatches for browser-only components
const InventoryUI = dynamic(() => import('../src/ui/InventoryUI'), { ssr: false });
const WorldMap    = dynamic(() => import('../src/ui/WorldMap'),    { ssr: false });
const AuthPanel   = dynamic(() => import('../src/ui/AuthPanel'),   { ssr: false });

const TILESIZE = 32;

export default function GamePage() {
  const canvasRef = useRef(null);
  const gameRef   = useRef(null);
  const sceneRef  = useRef(null);

  // Game state
  const [stats,         setStats]         = useState({ hp:100, maxHP:100, energy:50, maxEnergy:50, time:'08:00', level:1, xp:0, xpToNext:100, attack:8, defense:0 });
  const [inventory,     setInventory]     = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showMap,       setShowMap]       = useState(false);
  const [nearItem,      setNearItem]      = useState(null);
  const [nearNPC,       setNearNPC]       = useState(null);
  const [dialogue,      setDialogue]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState(null);
  const [quests,        setQuests]        = useState([]);
  const [mapState,      setMapState]      = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState(1);

  // Auth
  const [user,     setUser]     = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // Death
  const [isDead, setIsDead] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);

  /* ── InputLockSystem sync for React-controlled modals ───────────────
   * CRITICAL FIX: Each modal uses its OWN useEffect with clearReason()
   * in the cleanup function. This guarantees the lock is always released
   * when the component unmounts OR when the boolean flips to false,
   * regardless of HOW the modal was closed.
   *
   * DO NOT call lock/unlock in event handlers — only in useEffect.
   * ChatInput and AuthPanel manage their own locks internally.
   * ─────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (showInventory) InputLockSystem.lock('inventory');
    return () => InputLockSystem.clearReason('inventory');
  }, [showInventory]);

  useEffect(() => {
    if (showMap) InputLockSystem.lock('map');
    return () => InputLockSystem.clearReason('map');
  }, [showMap]);

  // Auth panel lock is managed inside AuthPanel component itself

  /* ── GameScene callbacks ─────────────────────────────────────────── */

  const handleStatsUpdate = useCallback((s) => {
    setStats({
      hp: s.hp, maxHP: s.maxHP,
      energy: s.energy, maxEnergy: s.maxEnergy,
      time: s.time, level: s.level || 1,
      xp: s.xp || 0, xpToNext: s.xpToNext || 100,
      attack: s.attack || 8, defense: s.defense || 0,
    });
    if (s.inventory) setInventory({ ...s.inventory, slots: [...s.inventory.slots] });
    if (s.quests)    setQuests(s.quests);
    if (s.onlinePlayers !== undefined) setOnlinePlayers(s.onlinePlayers);
  }, []);

  const handleNearItem   = useCallback(item => setNearItem(item), []);
  const handleNearNPC    = useCallback(npc  => setNearNPC(npc ? { name: npc.name } : null), []);
  const handleDialogue   = useCallback(dlg  => setDialogue(dlg ? {
    npcName:       dlg.currentNPC?.name,
    displayText:   dlg.displayText,
    choices:       dlg.choices,
    selectedChoice:dlg.selectedChoice,
    typingDone:    dlg.typingDone,
  } : null), []);

  const handleAuthChange = useCallback(userData => {
    setUser(userData);
    if (userData) setShowAuth(false);
  }, []);

  const handleDeath   = useCallback(() => setIsDead(true),  []);
  const handleRespawn = useCallback(() => setIsDead(false), []);

  /* ── Game init ──────────────────────────────────────────────────── */

  useEffect(() => {
    let game = null;
    const init = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const { Game } = await import('../src/Game.js');
        game = new Game(canvas, {
          onStatsUpdate: handleStatsUpdate,
          onNearItem:    handleNearItem,
          onNearNPC:     handleNearNPC,
          onDialogue:    handleDialogue,
          onAuthChange:  handleAuthChange,
          onDeath:       handleDeath,
          onRespawn:     handleRespawn,
        });

        await game.init();
        game.start();
        gameRef.current  = game;
        sceneRef.current = game.scene;
        setLoading(false);
      } catch (err) {
        console.error('Game init error:', err);
        setLoadError(err.message);
        setLoading(false);
      }
    };

    init();

    return () => {
      // Clear ALL locks on unmount to prevent stale locks on hot reload
      InputLockSystem.clearAll();
      game?.stop();
    };
  }, [handleStatsUpdate, handleNearItem, handleNearNPC, handleDialogue, handleAuthChange, handleDeath, handleRespawn]);

  /* ── Keyboard shortcuts ─────────────────────────────────────────────
   * CRITICAL FIX: Never call InputLockSystem here.
   * Shortcuts only fire when InputLockSystem.locked is false
   * (because the keyboard controller gates them).
   * Opening a modal sets the lock via useEffect above, not here.
   * ─────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e) => {
      // Enter always opens chat (even if other UI is open — handled in ChatInput)
      // But don't open chat if another modal is active
      if (e.code === 'Enter' && !InputLockSystem.locked) {
        e.preventDefault();
        setChatOpen(true);
        return;
      }

      // All other shortcuts: only fire when NOT locked
      if (InputLockSystem.locked) return;

      if (e.code === 'KeyI') {
        e.preventDefault();
        setShowInventory(v => !v);
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        if (sceneRef.current) {
          const s = sceneRef.current;
          setMapState({
            fog:       s.fog,
            playerPos: { x: s.player.centerX, y: s.player.centerY },
            npcs:      s.npcs.map(n => ({ name: n.name, x: n.centerX, y: n.centerY })),
          });
        }
        setShowMap(v => !v);
      }

      if (e.code === 'KeyL') {
        e.preventDefault();
        setShowAuth(v => !v);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // Empty deps — we read InputLockSystem.locked at call time

  /* ── Escape closes all modals ───────────────────────────────────────
   * clearReason() is handled by each modal's useEffect cleanup,
   * so we just set state here.
   * ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onEsc = (e) => {
      if (e.code !== 'Escape') return;
      // Close modals in priority order (innermost first)
      if (chatOpen)      { setChatOpen(false);      return; }
      if (showInventory) { setShowInventory(false); return; }
      if (showMap)       { setShowMap(false);       return; }
      if (showAuth)      { setShowAuth(false);      return; }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [chatOpen, showInventory, showMap, showAuth]);

  /* ── Action proxies ─────────────────────────────────────────────── */

  const handleUseItem     = (i)    => gameRef.current?.useItem(i);
  const handleDropItem    = (i)    => gameRef.current?.dropItem(i);
  const handleUnequipSlot = (s)    => gameRef.current?.unequipSlot(s);
  const handleSave        = ()     => gameRef.current?.save();
  const handleLoad        = ()     => gameRef.current?.load();

  // Auth: username + password only
  const handleLogin       = (un, pw)  => gameRef.current?.login(un, pw);
  const handleRegister    = (un, pw)  => gameRef.current?.register(un, pw);
  const handleLogout      = async ()  => {
    await gameRef.current?.logout();
    setUser(null);
  };

  const handleChatSend  = (text) => {
    sceneRef.current?.sendChat(text);
  };

  /* ── Snapshot map state when opening map ────────────────────────── */
  const openMap = () => {
    if (sceneRef.current) {
      const s = sceneRef.current;
      setMapState({
        fog:       s.fog,
        playerPos: { x: s.player.centerX, y: s.player.centerY },
        npcs:      s.npcs.map(n => ({ name: n.name, x: n.centerX, y: n.centerY })),
      });
    }
    setShowMap(v => !v);
  };

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'monospace', userSelect: 'none',
    }}>
      {/* ── Title bar ─────────────────────────────────────────────── */}
      <div style={{
        height: 38, background: 'rgba(5,8,5,0.98)',
        borderBottom: '1px solid #1a3a1a',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px', flexShrink: 0, zIndex: 100, gap: 6,
      }}>
        <span style={{ color: '#7cbe7c', fontSize: 13, fontWeight: 'bold', letterSpacing: 2, whiteSpace: 'nowrap' }}>
          ⚔ FOREST REALM
        </span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: '💾', label: 'Save',  fn: handleSave,                  bg: '#1a3a1a', c: '#7cbe7c' },
            { icon: '📂', label: 'Load',  fn: handleLoad,                  bg: '#1a1a3a', c: '#7c7cbe' },
            { icon: '🎒', label: '[I]',   fn: () => setShowInventory(v=>!v), bg: '#2a1a1a', c: '#be7c7c' },
            { icon: '🗺', label: '[M]',   fn: openMap,                     bg: '#1a2a1a', c: '#7cbe8c' },
            { icon: '💬', label: '[↵]',   fn: () => setChatOpen(v=>!v),    bg: '#1a2a3a', c: '#7caabe' },
          ].map(b => (
            <button key={b.label} onClick={b.fn} style={{
              background: b.bg, border: `1px solid ${b.c}44`,
              borderRadius: 4, color: b.c, fontSize: 10,
              padding: '3px 7px', cursor: 'pointer', letterSpacing: 1,
              fontFamily: 'monospace', transition: 'filter 0.1s',
            }}
            onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.4)'}
            onMouseOut={e  => e.currentTarget.style.filter = ''}
            >{b.icon} {b.label}</button>
          ))}

          {/* Auth button */}
          <button
            onClick={() => setShowAuth(v => !v)}
            style={{
              background:   user ? '#1a3a2a' : '#2a1a0a',
              border:       `1px solid ${user ? '#3cbe6c' : '#aa6622'}55`,
              borderRadius: 4,
              color:        user ? '#7cbe7c' : '#cc9944',
              cursor:       'pointer', padding: '3px 9px', fontSize: 10,
              letterSpacing: 1, fontFamily: 'monospace', transition: 'filter 0.1s',
            }}
            onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.4)'}
            onMouseOut={e  => e.currentTarget.style.filter = ''}
          >
            {user ? `🧙 ${user.username}` : '🔑 Login [L]'}
          </button>
        </div>
      </div>

      {/* ── Game viewport ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
        />

        {/* Loading screen */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg,#0a1a0a,#0a0a1a)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, color: '#7cbe7c', zIndex: 200,
          }}>
            <div style={{ fontSize: 52 }}>🌲</div>
            <div style={{ fontSize: 22, letterSpacing: 4 }}>FOREST REALM</div>
            <div style={{ fontSize: 10, color: '#5a9a5a', letterSpacing: 2 }}>
              {isOnline ? '🌐 Connecting…' : '⚡ Starting offline…'}
            </div>
            <LoadingBar />
            <div style={{ color: '#1a4a2a', fontSize: 8, marginTop: 4 }}>
              Chat Bubbles · Safe Zones · Fixed Input · Username Auth
            </div>
          </div>
        )}

        {/* Error screen */}
        {loadError && (
          <div style={{
            position: 'absolute', inset: 0, background: '#1a0a0a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ff6666', fontSize: 13, zIndex: 200, textAlign: 'center', padding: 20,
          }}>
            <div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>💥</div>
              Error: {loadError}
              <br /><br />
              <button onClick={() => window.location.reload()} style={{
                background: '#2a1a1a', border: '1px solid #ff6666', borderRadius: 4,
                color: '#ff6666', cursor: 'pointer', padding: '6px 16px',
                fontSize: 11, fontFamily: 'monospace',
              }}>Reload</button>
            </div>
          </div>
        )}

        {/* HUD — top left */}
        {!loading && <HUD stats={stats} />}

        {/* Online badge — top center */}
        {!loading && isOnline && (
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)', border: '1px solid #1a4a2a',
            borderRadius: 10, padding: '2px 10px',
            color: '#44cc88', fontSize: 9, letterSpacing: 1, zIndex: 50, whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            🌐 {onlinePlayers} player{onlinePlayers !== 1 ? 's' : ''} online
          </div>
        )}

        {/* Quest log — top right */}
        {!loading && quests.length > 0 && !showInventory && !showMap && !showAuth && (
          <QuestLog quests={quests} />
        )}

        {/* Auth panel — top right */}
        {showAuth && (
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 120 }}>
            <AuthPanel
              user={user}
              isOnline={isOnline}
              onLogin={handleLogin}
              onRegister={handleRegister}
              onLogout={handleLogout}
            />
          </div>
        )}

        {/* Interaction hint */}
        {!loading && !dialogue && !showInventory && !showMap && !showAuth && !isDead && !chatOpen && (nearNPC || nearItem) && (
          <div style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)', border: '1px solid #7cbe7c',
            borderRadius: 4, padding: '6px 14px',
            color: '#7cbe7c', fontSize: 11, letterSpacing: 1,
            zIndex: 50, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            {nearNPC ? `[E] Talk to ${nearNPC.name}` : '[E] Pick up item'}
          </div>
        )}

        {/* Chat input — bottom center */}
        {!loading && (
          <ChatInput
            isOpen={chatOpen}
            onSend={handleChatSend}
            onClose={() => setChatOpen(false)}
          />
        )}

        {/* Chat hint — shown when chat closed */}
        {!loading && !chatOpen && !isDead && !showInventory && !showMap && !showAuth && !dialogue && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            color: '#1a3a1a', fontSize: 9, letterSpacing: 1,
            zIndex: 40, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            [Enter] Chat
          </div>
        )}

        {/* Dialogue */}
        {dialogue && !isDead && <DialogueUI dialogue={dialogue} />}

        {/* Inventory */}
        {showInventory && inventory && (
          <InventoryUI
            inventory={inventory}
            onClose={() => setShowInventory(false)}
            onUse={handleUseItem}
            onDrop={handleDropItem}
            onUnequip={handleUnequipSlot}
          />
        )}

        {/* World map */}
        {showMap && mapState && (
          <WorldMap
            fog={mapState.fog}
            playerPos={mapState.playerPos}
            npcs={mapState.npcs}
            tileSize={TILESIZE}
            onClose={() => setShowMap(false)}
          />
        )}

        {/* Controls hint — bottom right */}
        {!loading && !showInventory && !showMap && !showAuth && !chatOpen && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(0,0,0,0.65)', border: '1px solid #1a2a1a',
            borderRadius: 4, padding: '8px 10px', color: '#555',
            fontSize: 9, lineHeight: 1.8, letterSpacing: 1,
            zIndex: 50, pointerEvents: 'none',
          }}>
            WASD/↑↓←→&nbsp;&nbsp;Move<br />
            Space&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Attack<br />
            E&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Interact<br />
            I&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Inventory<br />
            M&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Map<br />
            L&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Login<br />
            Enter&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Chat
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::placeholder { color: #2a4a2a; }
        input:focus { outline: none; }
      `}</style>
    </div>
  );
}

function LoadingBar() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setW(v => Math.min(100, v + Math.random() * 13)), 90);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ width: 220, height: 4, background: '#1a2a1a', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        width: `${w}%`, height: '100%',
        background: 'linear-gradient(90deg,#3a7a3a,#7cbe7c)',
        transition: 'width 0.08s', borderRadius: 2,
      }} />
    </div>
  );
}
