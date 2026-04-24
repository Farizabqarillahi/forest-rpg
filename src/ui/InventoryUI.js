'use client';

import { useState } from 'react';
import { ITEM_DB } from '../systems/InventorySystem.js';

export default function InventoryUI({ inventory, onClose, onUse, onDrop }) {
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const slots = inventory.slots;
  const currentWeight = slots.reduce((acc, slot) => {
    if (!slot) return acc;
    const def = ITEM_DB[slot.itemId];
    return acc + (def ? def.weight * slot.count : 0);
  }, 0);

  const handleRightClick = (e, slotIndex) => {
    e.preventDefault();
    const slot = slots[slotIndex];
    if (!slot) return;
    setContextMenu({ slotIndex, x: e.clientX, y: e.clientY, slot });
  };

  const handleDragStart = (e, slotIndex) => {
    setDragFrom(slotIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    if (dragFrom !== null && dragFrom !== toIndex) {
      // Swap logic handled in game, just call via index
      // For now, visual only - real swap would need game integration
    }
    setDragFrom(null);
  };

  const closeContext = () => setContextMenu(null);

  return (
    <div
      onClick={closeContext}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #0d1a0d 0%, #0a0a1a 100%)',
          border: '2px solid #2a4a2a',
          borderRadius: '8px', padding: '16px',
          minWidth: '320px',
          boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(50,150,50,0.1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '12px',
        }}>
          <span style={{ color: '#7cbe7c', fontSize: '13px', letterSpacing: '2px', fontFamily: 'monospace' }}>
            🎒 INVENTORY
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#888', fontSize: '10px', fontFamily: 'monospace' }}>
              ⚖ {currentWeight}/{inventory.maxWeight}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid #4a2a2a',
                color: '#be7c7c', cursor: 'pointer', borderRadius: '3px',
                padding: '2px 8px', fontSize: '11px', fontFamily: 'monospace',
              }}
            >✕</button>
          </div>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
        }}>
          {slots.map((slot, i) => {
            const def = slot ? ITEM_DB[slot.itemId] : null;
            const isHovered = hoveredSlot === i;
            return (
              <div
                key={i}
                draggable={!!slot}
                onDragStart={(e) => slot && handleDragStart(e, i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, i)}
                onMouseEnter={() => setHoveredSlot(i)}
                onMouseLeave={() => setHoveredSlot(null)}
                onContextMenu={(e) => handleRightClick(e, i)}
                style={{
                  width: '68px', height: '68px',
                  background: isHovered && slot
                    ? 'rgba(124,190,124,0.1)'
                    : 'rgba(0,0,0,0.4)',
                  border: slot
                    ? `1px solid ${isHovered ? '#7cbe7c' : '#2a4a2a'}`
                    : '1px solid #1a2a1a',
                  borderRadius: '4px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: slot ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'all 0.1s',
                  transform: isHovered && slot ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {slot && def ? (
                  <>
                    {/* Item icon */}
                    <div style={{
                      width: '36px', height: '36px',
                      background: `${def.color}22`,
                      border: `1px solid ${def.color}55`,
                      borderRadius: '4px',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}>
                      {def.emoji}
                    </div>
                    {/* Count */}
                    {slot.count > 1 && (
                      <div style={{
                        position: 'absolute', bottom: '3px', right: '5px',
                        color: '#fff', fontSize: '9px', fontFamily: 'monospace',
                        textShadow: '0 0 4px #000',
                      }}>
                        ×{slot.count}
                      </div>
                    )}
                    {/* Type badge */}
                    <div style={{
                      position: 'absolute', top: '2px', left: '3px',
                      fontSize: '7px', color: typeColor(def.type),
                      fontFamily: 'monospace',
                    }}>
                      {def.type[0].toUpperCase()}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#1a2a1a', fontSize: '18px' }}>·</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Item tooltip on hover */}
        {hoveredSlot !== null && slots[hoveredSlot] && (() => {
          const slot = slots[hoveredSlot];
          const def = ITEM_DB[slot?.itemId];
          if (!def) return null;
          return (
            <div style={{
              marginTop: '10px', background: 'rgba(0,0,0,0.7)',
              border: `1px solid ${def.color}44`,
              borderRadius: '4px', padding: '8px 10px',
            }}>
              <div style={{ color: def.color, fontSize: '11px', fontFamily: 'monospace', marginBottom: '2px' }}>
                {def.emoji} {def.name}
                {slot.count > 1 && <span style={{ color: '#888' }}> ×{slot.count}</span>}
              </div>
              <div style={{ color: '#888', fontSize: '9px', fontFamily: 'monospace', marginBottom: '4px' }}>
                {def.description}
              </div>
              <div style={{ color: '#555', fontSize: '9px', fontFamily: 'monospace' }}>
                ⚖ {def.weight * slot.count}kg &nbsp;|&nbsp;
                <span style={{ color: typeColor(def.type) }}>{def.type}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {def.type !== 'material' && (
                  <button
                    onClick={() => { onUse(hoveredSlot); closeContext(); }}
                    style={actionBtn('#1a4a1a', '#7cbe7c')}
                  >
                    {def.type === 'consumable' ? '🍶 Use' : '⚔ Equip'}
                  </button>
                )}
                <button
                  onClick={() => { onDrop(hoveredSlot); closeContext(); }}
                  style={actionBtn('#4a1a1a', '#be7c7c')}
                >
                  🗑 Drop
                </button>
              </div>
            </div>
          );
        })()}

        {/* Right-click context menu */}
        {contextMenu && (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y, left: contextMenu.x,
              background: '#0d1a0d', border: '1px solid #2a4a2a',
              borderRadius: '4px', padding: '4px',
              zIndex: 200, minWidth: '100px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const def = ITEM_DB[contextMenu.slot.itemId];
              return (
                <>
                  {def.type !== 'material' && (
                    <button
                      onClick={() => { onUse(contextMenu.slotIndex); closeContext(); }}
                      style={{ ...menuItemStyle, color: '#7cbe7c' }}
                    >
                      {def.type === 'consumable' ? '🍶 Use' : '⚔ Equip'}
                    </button>
                  )}
                  <button
                    onClick={() => { onDrop(contextMenu.slotIndex); closeContext(); }}
                    style={{ ...menuItemStyle, color: '#be7c7c' }}
                  >
                    🗑 Drop
                  </button>
                  <button onClick={closeContext} style={{ ...menuItemStyle, color: '#888' }}>
                    ✕ Cancel
                  </button>
                </>
              );
            })()}
          </div>
        )}

        <div style={{ color: '#333', fontSize: '9px', fontFamily: 'monospace', marginTop: '10px', textAlign: 'center' }}>
          Right-click or hover to use/drop items
        </div>
      </div>
    </div>
  );
}

const menuItemStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '5px 10px', fontSize: '10px', fontFamily: 'monospace',
  borderRadius: '2px',
};

const actionBtn = (bg, color) => ({
  background: bg, border: `1px solid ${color}44`,
  borderRadius: '3px', color, cursor: 'pointer',
  padding: '3px 8px', fontSize: '9px', fontFamily: 'monospace',
});

function typeColor(type) {
  return type === 'equipment' ? '#ffd700'
    : type === 'consumable' ? '#90ee90'
    : '#aaa';
}
