'use client';

import { useState } from 'react';
import { ITEM_DB, EQUIPMENT_SLOTS } from '../systems/InventorySystem.js';

const SLOT_ICONS = { weapon:'⚔️', helmet:'⛑️', armor:'🥋', boots:'👢', accessory:'📿' };
const SLOT_LABELS = { weapon:'Weapon', helmet:'Helmet', armor:'Armor', boots:'Boots', accessory:'Ring' };

export default function InventoryUI({ inventory, onClose, onUse, onDrop, onUnequip }) {
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [hoveredEquip, setHoveredEquip] = useState(null);
  const [tab, setTab] = useState('bag'); // 'bag' | 'equip'

  const slots   = inventory.slots;
  const equipped = inventory.equipped || {};
  const weight  = slots.reduce((a, s) => {
    if (!s) return a;
    const d = ITEM_DB[s.itemId];
    return a + (d ? d.weight * s.count : 0);
  }, 0);

  const typeColor = t => t === 'equipment' ? '#ffd700' : t === 'consumable' ? '#90ee90' : '#aaa';
  const rarityColor = r => r === 'epic' ? '#cc88ff' : r === 'rare' ? '#4488ff' : '#888';

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, fontFamily: 'monospace',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(135deg,#0d1a0d,#0a0a1a)',
        border: '2px solid #2a4a2a', borderRadius: 8, padding: 16,
        width: 400, maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 0 40px rgba(0,0,0,0.9)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['bag','equip'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? '#1a3a1a' : 'none',
                border: `1px solid ${tab === t ? '#7cbe7c' : '#2a4a2a'}`,
                borderRadius: 3, color: tab === t ? '#7cbe7c' : '#556655',
                cursor: 'pointer', padding: '3px 10px', fontSize: 10, letterSpacing: 1,
              }}>
                {t === 'bag' ? '🎒 Bag' : '🥋 Equipment'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ color: '#555', fontSize: 9 }}>⚖ {weight}/{inventory.maxWeight}</span>
            <button onClick={onClose} style={{
              background: 'none', border: '1px solid #4a2a2a',
              color: '#be7c7c', cursor: 'pointer', borderRadius: 3,
              padding: '2px 8px', fontSize: 11,
            }}>✕</button>
          </div>
        </div>

        {tab === 'bag' && (
          <>
            {/* Inventory grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginBottom: 10 }}>
              {slots.map((slot, i) => {
                const def = slot ? ITEM_DB[slot.itemId] : null;
                const hov = hoveredSlot === i;
                return (
                  <div key={i}
                    onMouseEnter={() => setHoveredSlot(i)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    style={{
                      width: 80, height: 80, position: 'relative',
                      background: hov && slot ? 'rgba(124,190,124,0.1)' : 'rgba(0,0,0,0.5)',
                      border: slot
                        ? `1px solid ${hov ? '#7cbe7c' : (def?.rarity === 'epic' ? '#cc88ff55' : def?.rarity === 'rare' ? '#4488ff55' : '#2a4a2a')}`
                        : '1px solid #1a2a1a',
                      borderRadius: 4,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: slot ? 'pointer' : 'default',
                      transition: 'all 0.1s',
                      transform: hov && slot ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    {slot && def ? (
                      <>
                        <div style={{
                          width: 40, height: 40,
                          background: `${def.color}22`,
                          border: `1px solid ${def.color}55`,
                          borderRadius: 4,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22,
                        }}>{def.emoji}</div>
                        {slot.count > 1 && (
                          <span style={{ position: 'absolute', bottom: 3, right: 5, color: '#fff', fontSize: 9, textShadow: '0 0 4px #000' }}>
                            ×{slot.count}
                          </span>
                        )}
                        <span style={{ position: 'absolute', top: 2, left: 3, fontSize: 7, color: rarityColor(def.rarity) }}>
                          {def.rarity?.[0]?.toUpperCase()}
                        </span>
                        <span style={{ position: 'absolute', top: 2, right: 3, fontSize: 7, color: typeColor(def.type) }}>
                          {def.type?.[0]?.toUpperCase()}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: '#1a2a1a', fontSize: 18 }}>·</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hovered slot tooltip */}
            {hoveredSlot !== null && slots[hoveredSlot] && (() => {
              const s = slots[hoveredSlot];
              const def = s && ITEM_DB[s.itemId];
              if (!def) return null;
              return (
                <div style={{
                  background: 'rgba(0,0,0,0.8)',
                  border: `1px solid ${def.color}44`,
                  borderRadius: 4, padding: '8px 10px',
                }}>
                  <div style={{ color: def.color, fontSize: 11, marginBottom: 2 }}>
                    {def.emoji} {def.name}
                    {s.count > 1 && <span style={{ color: '#888' }}> ×{s.count}</span>}
                    <span style={{ color: rarityColor(def.rarity), fontSize: 9, marginLeft: 6 }}>
                      [{def.rarity}]
                    </span>
                  </div>
                  <div style={{ color: '#888', fontSize: 9, marginBottom: 4 }}>{def.description}</div>
                  {def.statBonus && (
                    <div style={{ color: '#7cbe7c', fontSize: 9, marginBottom: 4 }}>
                      {Object.entries(def.statBonus).map(([k,v]) => `+${v} ${k}`).join('  ')}
                    </div>
                  )}
                  <div style={{ color: '#555', fontSize: 9 }}>
                    ⚖ {def.weight * s.count}kg &nbsp;|&nbsp;
                    <span style={{ color: typeColor(def.type) }}>{def.type}</span>
                    {def.slot && <span style={{ color: '#ffd700', marginLeft: 6 }}>→ {def.slot}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {def.type !== 'material' && (
                      <button onClick={() => onUse(hoveredSlot)}
                        style={btn('#1a4a1a','#7cbe7c')}>
                        {def.type === 'consumable' ? '🍶 Use' : '⚔ Equip'}
                      </button>
                    )}
                    <button onClick={() => onDrop(hoveredSlot)}
                      style={btn('#4a1a1a','#be7c7c')}>🗑 Drop</button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {tab === 'equip' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EQUIPMENT_SLOTS.map(slotId => {
                const itemId = equipped[slotId];
                const def    = itemId ? ITEM_DB[itemId] : null;
                const hov    = hoveredEquip === slotId;
                return (
                  <div key={slotId}
                    onMouseEnter={() => setHoveredEquip(slotId)}
                    onMouseLeave={() => setHoveredEquip(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: hov ? 'rgba(124,190,124,0.08)' : 'rgba(0,0,0,0.4)',
                      border: `1px solid ${hov ? '#2a5a2a' : '#1a3a1a'}`,
                      borderRadius: 5, padding: '8px 10px',
                      transition: 'all 0.1s',
                    }}
                  >
                    {/* Slot icon */}
                    <div style={{
                      width: 36, height: 36, flexShrink: 0,
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid #2a3a2a', borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {def ? def.emoji : SLOT_ICONS[slotId]}
                    </div>
                    {/* Item info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: def ? def.color : '#334433', fontSize: 10 }}>
                        {def ? def.name : `— ${SLOT_LABELS[slotId]} —`}
                      </div>
                      {def?.statBonus && (
                        <div style={{ color: '#7cbe7c', fontSize: 8, marginTop: 1 }}>
                          {Object.entries(def.statBonus).map(([k,v]) => `+${v} ${k}`).join('  ')}
                        </div>
                      )}
                      {!def && (
                        <div style={{ color: '#2a4a2a', fontSize: 8 }}>Empty slot</div>
                      )}
                    </div>
                    {/* Unequip button */}
                    {def && (
                      <button onClick={() => onUnequip(slotId)}
                        style={{ ...btn('#4a1a1a','#be7c7c'), fontSize: 9 }}>
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ color: '#2a4a2a', fontSize: 9, textAlign: 'center', marginTop: 10 }}>
              Equip items from Bag tab to fill these slots
            </div>
          </>
        )}

        <div style={{ color: '#1a3a1a', fontSize: 8, textAlign: 'center', marginTop: 10 }}>
          Hover to inspect · Use/Equip · Drop to world
        </div>
      </div>
    </div>
  );
}

const btn = (bg, color) => ({
  background: bg, border: `1px solid ${color}55`,
  borderRadius: 3, color, cursor: 'pointer',
  padding: '3px 8px', fontSize: 9, fontFamily: 'monospace',
});
