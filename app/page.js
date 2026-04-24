'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import HUD from '../src/ui/HUD';
import InventoryUI from '../src/ui/InventoryUI';
import DialogueUI from '../src/ui/DialogueUI';

export default function GamePage() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  const [stats, setStats] = useState({ hp: 100, maxHP: 100, energy: 50, maxEnergy: 50, time: '08:00' });
  const [inventory, setInventory] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [nearItem, setNearItem] = useState(null);
  const [nearNPC, setNearNPC] = useState(null);
  const [dialogue, setDialogue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const handleStatsUpdate = useCallback((newStats) => {
    setStats({
      hp: newStats.hp,
      maxHP: newStats.maxHP,
      energy: newStats.energy,
      maxEnergy: newStats.maxEnergy,
      time: newStats.time,
    });
    if (newStats.inventory) {
      setInventory({ ...newStats.inventory, slots: [...newStats.inventory.slots] });
    }
  }, []);

  const handleNearItem = useCallback((item) => setNearItem(item), []);
  const handleNearNPC = useCallback((npc) => setNearNPC(npc ? { name: npc.name } : null), []);
  const handleDialogue = useCallback((dlg) => setDialogue(dlg ? {
    npcName: dlg.currentNPC?.name,
    displayText: dlg.displayText,
    choices: dlg.choices,
    selectedChoice: dlg.selectedChoice,
    typingDone: dlg.typingDone,
  } : null), []);

  useEffect(() => {
    let game = null;

    const initGame = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const { Game } = await import('../src/Game.js');
        game = new Game(canvas, {
          onStatsUpdate: handleStatsUpdate,
          onNearItem: handleNearItem,
          onNearNPC: handleNearNPC,
          onDialogue: handleDialogue,
        });

        await game.init();
        game.start();
        gameRef.current = game;
        setLoading(false);
      } catch (err) {
        console.error('Game init error:', err);
        setLoadError(err.message);
        setLoading(false);
      }
    };

    initGame();

    return () => {
      if (game) game.stop();
    };
  }, [handleStatsUpdate, handleNearItem, handleNearNPC, handleDialogue]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'KeyI') setShowInventory(prev => !prev);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleUseItem = (slotIndex) => gameRef.current?.useItem(slotIndex);
  const handleDropItem = (slotIndex) => gameRef.current?.dropItem(slotIndex);
  const handleSave = () => gameRef.current?.save();
  const handleLoad = () => gameRef.current?.load();

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'monospace', userSelect: 'none',
    }}>
      <div style={{
        height: '36px', background: 'rgba(10,10,20,0.95)',
        borderBottom: '1px solid #2a3a2a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', flexShrink: 0, zIndex: 100,
      }}>
        <span style={{ color: '#7cbe7c', fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px' }}>
          ⚔ FOREST REALM RPG
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSave} style={btnStyle('#2a4a2a', '#7cbe7c')}>💾 Save</button>
          <button onClick={handleLoad} style={btnStyle('#2a2a4a', '#7c7cbe')}>📂 Load</button>
          <button onClick={() => setShowInventory(v => !v)} style={btnStyle('#4a2a2a', '#be7c7c')}>
            🎒 [I] Bag
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
        />

        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #0a1a0a 0%, #0a0a1a 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '16px', color: '#7cbe7c', zIndex: 200,
          }}>
            <div style={{ fontSize: '48px' }}>🌲</div>
            <div style={{ fontSize: '20px', letterSpacing: '4px' }}>FOREST REALM</div>
            <div style={{ fontSize: '12px', color: '#5a9a5a', letterSpacing: '2px' }}>Loading world...</div>
            <LoadingBar />
          </div>
        )}

        {loadError && (
          <div style={{
            position: 'absolute', inset: 0, background: '#1a0a0a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ff6666', fontSize: '14px', zIndex: 200,
          }}>
            Error: {loadError}
          </div>
        )}

        {!loading && <HUD stats={stats} />}

        {!loading && !dialogue && (nearNPC || nearItem) && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.8)', border: '1px solid #7cbe7c',
            borderRadius: '4px', padding: '6px 14px',
            color: '#7cbe7c', fontSize: '11px', letterSpacing: '1px', zIndex: 50,
          }}>
            {nearNPC ? `[E] Talk to ${nearNPC.name}` : '[E] Pick up item'}
          </div>
        )}

        {dialogue && <DialogueUI dialogue={dialogue} />}

        {showInventory && inventory && (
          <InventoryUI
            inventory={inventory}
            onClose={() => setShowInventory(false)}
            onUse={handleUseItem}
            onDrop={handleDropItem}
          />
        )}

        {!loading && (
          <div style={{
            position: 'absolute', bottom: '12px', right: '12px',
            background: 'rgba(0,0,0,0.65)', border: '1px solid #333',
            borderRadius: '4px', padding: '8px 10px',
            color: '#666', fontSize: '9px', lineHeight: '1.7',
            letterSpacing: '1px', zIndex: 50,
          }}>
            WASD / ↑↓←→ &nbsp;Move<br/>
            E &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Interact<br/>
            SPACE &nbsp;&nbsp;&nbsp;&nbsp;Attack<br/>
            I &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Inventory<br/>
            ↑↓ in dialog Select
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        button:hover { filter: brightness(1.4); transform: translateY(-1px); }
        button { transition: all 0.1s; }
      `}</style>
    </div>
  );
}

function btnStyle(bg, color) {
  return {
    background: bg, border: `1px solid ${color}55`,
    borderRadius: '3px', color: color, fontSize: '10px',
    padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px',
  };
}

function LoadingBar() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setWidth(w => Math.min(100, w + Math.random() * 18)), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ width: '200px', height: '4px', background: '#1a2a1a', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', background: 'linear-gradient(90deg, #3a7a3a, #7cbe7c)', borderRadius: '2px' }} />
    </div>
  );
}
