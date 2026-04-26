'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import HUD        from '../src/ui/HUD';
import DialogueUI from '../src/ui/DialogueUI';
import QuestLog   from '../src/ui/QuestLog';
import ChatInput  from '../src/ui/ChatInput';
import { InputLockSystem } from '../src/systems/InputLockSystem.js';
import { isOnline } from '../src/systems/SupabaseService.js';

// Lazy-load panels that touch browser APIs so SSR never runs them
const InventoryUI = dynamic(() => import('../src/ui/InventoryUI'), { ssr: false });
const WorldMap    = dynamic(() => import('../src/ui/WorldMap'),    { ssr: false });
const AuthPanel   = dynamic(() => import('../src/ui/AuthPanel'),   { ssr: false });

const TILESIZE = 32;

export default function GamePage() {
  const canvasRef  = useRef(null);
  const gameRef    = useRef(null);
  const sceneRef   = useRef(null);

  /* ── Game state ─────────────────────────────────────────────────── */
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

  /* ── Auth state ─────────────────────────────────────────────────── */
  const [user,     setUser]     = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  /* ── Death state ────────────────────────────────────────────────── */
  const [isDead, setIsDead] = useState(false);

  /* ── Chat state ─────────────────────────────────────────────────── */
  const [chatOpen, setChatOpen] = useState(false);

  /* ── InputLockSystem sync helpers ───────────────────────────────── */
  // Keep lock in sync whenever modal states change
  useEffect(() => {
    if (showInventory) InputLockSystem.lock('inventory');
    else               InputLockSystem.unlock('inventory');
  }, [showInventory]);

  useEffect(() => {
    if (showAuth) InputLockSystem.lock('auth');
    else          InputLockSystem.unlock('auth');
  }, [showAuth]);

  useEffect(() => {
    if (showMap) InputLockSystem.lock('map');
    else         InputLockSystem.unlock('map');
  }, [showMap]);

  /* ── GameScene callbacks ────────────────────────────────────────── */
  const handleStatsUpdate = useCallback((s) => {
    setStats({
      hp:s.hp, maxHP:s.maxHP,
      energy:s.energy, maxEnergy:s.maxEnergy,
      time:s.time, level:s.level||1,
      xp:s.xp||0, xpToNext:s.xpToNext||100,
      attack:s.attack||8, defense:s.defense||0,
    });
    if (s.inventory) setInventory({ ...s.inventory, slots:[...s.inventory.slots] });
    if (s.quests)    setQuests(s.quests);
    if (s.onlinePlayers !== undefined) setOnlinePlayers(s.onlinePlayers);
  }, []);

  const handleNearItem = useCallback(item => setNearItem(item), []);
  const handleNearNPC  = useCallback(npc  => setNearNPC(npc ? { name:npc.name } : null), []);
  const handleDialogue = useCallback(dlg  => setDialogue(dlg ? {
    npcName:dlg.currentNPC?.name,
    displayText:dlg.displayText,
    choices:dlg.choices,
    selectedChoice:dlg.selectedChoice,
    typingDone:dlg.typingDone,
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
      InputLockSystem.clearAll();
      game?.stop();
    };
  }, [handleStatsUpdate, handleNearItem, handleNearNPC, handleDialogue, handleAuthChange, handleDeath, handleRespawn]);

  /* ── Global keyboard shortcuts ──────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      // Never fire shortcuts when input is locked (typing in chat/forms)
      if (InputLockSystem.locked) return;

      if (e.code === 'KeyI') {
        e.preventDefault();
        setShowInventory(v => !v);
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        if (!showMap && sceneRef.current) {
          const s = sceneRef.current;
          setMapState({
            fog:       s.fog,
            playerPos: { x: s.player.centerX, y: s.player.centerY },
            npcs:      s.npcs.map(n => ({ name:n.name, x:n.centerX, y:n.centerY })),
          });
        }
        setShowMap(v => !v);
      }
      if (e.code === 'KeyL') {
        e.preventDefault();
        setShowAuth(v => !v);
      }
      if (e.code === 'Enter') {
        e.preventDefault();
        setChatOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMap]);

  /* ── Action proxies ─────────────────────────────────────────────── */
  const handleUseItem      = (i) => gameRef.current?.useItem(i);
  const handleDropItem     = (i) => gameRef.current?.dropItem(i);
  const handleUnequipSlot  = (s) => gameRef.current?.unequipSlot(s);
  const handleSave         = ()  => gameRef.current?.save();
  const handleLoad         = ()  => gameRef.current?.load();
  const handleLogin        = (e, p)    => gameRef.current?.login(e, p);
  const handleRegister     = (e, p, u) => gameRef.current?.register(e, p, u);
  const handleLogout       = async ()  => { await gameRef.current?.logout(); setUser(null); };

  const handleChatSend = (text) => {
    sceneRef.current?.sendChat(text);
  };
  const handleChatClose = () => setChatOpen(false);
  const handleChatOpen  = () => setChatOpen(true);

  /* ── Close inventory with escape ────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape') {
        if (showInventory) { setShowInventory(false); }
        if (showMap)       { setShowMap(false); }
        if (showAuth)      { setShowAuth(false); }
        if (chatOpen)      { setChatOpen(false); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showInventory, showMap, showAuth, chatOpen]);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div style={{
      width:'100vw', height:'100vh', background:'#0a0a0a',
      display:'flex', flexDirection:'column', overflow:'hidden',
      fontFamily:'monospace', userSelect:'none',
    }}>
      {/* Title bar */}
      <div style={{
        height:38, background:'rgba(5,8,5,0.98)',
        borderBottom:'1px solid #1a3a1a',
        display:'flex', alignItems:'center',
        justifyContent:'space-between',
        padding:'0 10px', flexShrink:0, zIndex:100, gap:6,
      }}>
        <span style={{ color:'#7cbe7c', fontSize:13, fontWeight:'bold', letterSpacing:2, whiteSpace:'nowrap' }}>
          ⚔ FOREST REALM
        </span>
        <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
          {[
            { icon:'💾', label:'Save',  fn: handleSave,                bg:'#1a3a1a', c:'#7cbe7c' },
            { icon:'📂', label:'Load',  fn: handleLoad,                bg:'#1a1a3a', c:'#7c7cbe' },
            { icon:'🎒', label:'[I]',   fn:()=>setShowInventory(v=>!v),bg:'#2a1a1a', c:'#be7c7c' },
            { icon:'🗺', label:'[M]',   fn:()=>{
                if (!showMap && sceneRef.current) {
                  const s = sceneRef.current;
                  setMapState({ fog:s.fog,
                    playerPos:{x:s.player.centerX,y:s.player.centerY},
                    npcs:s.npcs.map(n=>({name:n.name,x:n.centerX,y:n.centerY})),
                  });
                }
                setShowMap(v=>!v);
              }, bg:'#1a2a1a', c:'#7cbe8c' },
            { icon:'💬', label:'[↵]',   fn: handleChatOpen,            bg:'#1a2a3a', c:'#7caabe' },
          ].map(b => (
            <button key={b.label} onClick={b.fn} style={{
              background:b.bg, border:`1px solid ${b.c}44`,
              borderRadius:4, color:b.c, fontSize:10,
              padding:'3px 7px', cursor:'pointer', letterSpacing:1,
              fontFamily:'monospace', transition:'filter 0.1s',
            }}
            onMouseOver={e=>e.currentTarget.style.filter='brightness(1.4)'}
            onMouseOut={e=>e.currentTarget.style.filter=''}
            >{b.icon} {b.label}</button>
          ))}

          {/* Auth button */}
          <button onClick={() => setShowAuth(v => !v)} style={{
            background: user ? '#1a3a2a' : '#2a1a0a',
            border:`1px solid ${user ? '#3cbe6c' : '#aa6622'}55`,
            borderRadius:4, color: user ? '#7cbe7c' : '#cc9944',
            cursor:'pointer', padding:'3px 8px', fontSize:10,
            letterSpacing:1, fontFamily:'monospace',
            transition:'filter 0.1s',
          }}
          onMouseOver={e=>e.currentTarget.style.filter='brightness(1.4)'}
          onMouseOut={e=>e.currentTarget.style.filter=''}
          >
            {user ? `🧙 ${user.username}` : '🔑 Login [L]'}
          </button>
        </div>
      </div>

      {/* Game viewport */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width:'100%', height:'100%', display:'block', imageRendering:'pixelated' }}
        />

        {/* Loading screen */}
        {loading && (
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(135deg,#0a1a0a,#0a0a1a)',
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:16, color:'#7cbe7c', zIndex:200,
          }}>
            <div style={{ fontSize:52 }}>🌲</div>
            <div style={{ fontSize:22, letterSpacing:4 }}>FOREST REALM</div>
            <div style={{ fontSize:10, color:'#5a9a5a', letterSpacing:2 }}>
              {isOnline ? '🌐 Connecting to server…' : '⚡ Starting offline…'}
            </div>
            <LoadingBar />
            <div style={{ color:'#1a4a2a', fontSize:8, marginTop:4 }}>
              Chat · Safe Zones · Smart Spawns · Input Lock
            </div>
          </div>
        )}

        {/* Error screen */}
        {loadError && (
          <div style={{
            position:'absolute', inset:0, background:'#1a0a0a',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#ff6666', fontSize:13, zIndex:200, textAlign:'center', padding:20,
          }}>
            <div>
              <div style={{ fontSize:28, marginBottom:12 }}>💥</div>
              <div>Error: {loadError}</div>
              <button onClick={()=>window.location.reload()} style={{
                marginTop:16, background:'#2a1a1a', border:'1px solid #ff6666',
                borderRadius:4, color:'#ff6666', cursor:'pointer',
                padding:'6px 16px', fontSize:11, fontFamily:'monospace',
              }}>Reload</button>
            </div>
          </div>
        )}

        {/* HUD — top left */}
        {!loading && <HUD stats={stats} />}

        {/* Online badge — top center */}
        {!loading && isOnline && (
          <div style={{
            position:'absolute', top:10, left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.6)', border:'1px solid #1a4a2a',
            borderRadius:10, padding:'2px 10px',
            color:'#44cc88', fontSize:9, letterSpacing:1, zIndex:50, whiteSpace:'nowrap',
          }}>
            🌐 {onlinePlayers} player{onlinePlayers !== 1 ? 's' : ''} online
          </div>
        )}

        {/* Quest log — top right (when no modal open) */}
        {!loading && quests.length > 0 && !showInventory && !showMap && !showAuth && (
          <QuestLog quests={quests} />
        )}

        {/* Auth panel */}
        {showAuth && (
          <div style={{ position:'absolute', top:10, right:10, zIndex:120 }}>
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
            position:'absolute', bottom:80, left:'50%', transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.85)', border:'1px solid #7cbe7c',
            borderRadius:4, padding:'6px 14px', color:'#7cbe7c',
            fontSize:11, letterSpacing:1, zIndex:50, whiteSpace:'nowrap',
          }}>
            {nearNPC ? `[E] Talk to ${nearNPC.name}` : '[E] Pick up item'}
          </div>
        )}

        {/* Chat input (bottom center, above controls hint) */}
        {!loading && (
          <ChatInput
            isOpen={chatOpen}
            onSend={handleChatSend}
            onOpen={handleChatOpen}
            onClose={handleChatClose}
          />
        )}

        {/* Chat hint when closed */}
        {!loading && !chatOpen && !isDead && !showInventory && !showMap && !showAuth && (
          <div style={{
            position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)',
            color:'#1a3a1a', fontSize:9, letterSpacing:1, zIndex:40, whiteSpace:'nowrap',
            pointerEvents:'none',
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
            position:'absolute', bottom:12, right:12,
            background:'rgba(0,0,0,0.65)', border:'1px solid #1a2a1a',
            borderRadius:4, padding:'8px 10px', color:'#555',
            fontSize:9, lineHeight:1.8, letterSpacing:1, zIndex:50,
            pointerEvents:'none',
          }}>
            WASD/↑↓←→&nbsp;&nbsp;Move<br/>
            Space&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Attack<br/>
            E&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Interact<br/>
            I&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Inventory<br/>
            M&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Map<br/>
            L&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Login<br/>
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
    <div style={{ width:220, height:4, background:'#1a2a1a', borderRadius:2, overflow:'hidden' }}>
      <div style={{
        width:`${w}%`, height:'100%',
        background:'linear-gradient(90deg,#3a7a3a,#7cbe7c)',
        transition:'width 0.08s', borderRadius:2,
      }} />
    </div>
  );
}
