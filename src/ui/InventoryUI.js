'use client';

import { useState } from 'react';
import { ITEM_DB, EQUIPMENT_SLOTS } from '../systems/InventorySystem.js';
import { InputLockSystem } from '../systems/InputLockSystem.js';

// Register inventory as a lock source when mounted
// (handled in the component via useEffect equivalent — inline with open state)

const SLOT_ICONS  = { weapon:'⚔️', helmet:'⛑️', armor:'🥋', boots:'👢', accessory:'📿' };
const SLOT_LABELS = { weapon:'Weapon', helmet:'Helmet', armor:'Armor', boots:'Boots', accessory:'Ring' };

export default function InventoryUI({ inventory, onClose, onUse, onDrop, onUnequip }) {
  const [selectedSlot, setSelectedSlot] = useState(null); // index of clicked slot
  const [hoveredEquip, setHoveredEquip] = useState(null);
  const [tab, setTab] = useState('bag');

  // Lock input while open
  if (typeof window !== 'undefined') InputLockSystem.lock('inventory');

  const handleClose = () => {
    InputLockSystem.unlock('inventory');
    setSelectedSlot(null);
    onClose();
  };

  const slots   = inventory.slots;
  const equipped = inventory.equipped || {};
  const weight  = slots.reduce((a, s) => {
    if (!s) return a;
    const d = ITEM_DB[s.itemId];
    return a + (d ? d.weight * s.count : 0);
  }, 0);

  const typeColor   = t => t === 'equipment' ? '#ffd700' : t === 'consumable' ? '#90ee90' : '#aaa';
  const rarityColor = r => r === 'epic' ? '#cc88ff' : r === 'rare' ? '#4488ff' : '#888';

  const selectedDef = selectedSlot !== null && slots[selectedSlot]
    ? ITEM_DB[slots[selectedSlot].itemId] : null;

  return (
    <div
      onClick={handleClose}
      style={{
        position:'absolute', inset:0,
        background:'rgba(0,0,0,0.6)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:100, fontFamily:'monospace',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background:'linear-gradient(135deg,#0d1a0d,#0a0a1a)',
        border:'2px solid #2a4a2a', borderRadius:8, padding:16,
        width:420, maxHeight:'88vh', overflowY:'auto',
        boxShadow:'0 0 40px rgba(0,0,0,0.95)',
      }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ display:'flex', gap:8 }}>
            {['bag','equip'].map(t => (
              <button key={t} onClick={() => { setTab(t); setSelectedSlot(null); }} style={{
                background: tab === t ? '#1a3a1a' : 'none',
                border:`1px solid ${tab === t ? '#7cbe7c' : '#2a4a2a'}`,
                borderRadius:3, color: tab === t ? '#7cbe7c' : '#4a6a4a',
                cursor:'pointer', padding:'3px 10px', fontSize:10, letterSpacing:1,
                fontFamily:'monospace',
              }}>
                {t === 'bag' ? '🎒 Bag' : '🥋 Equipment'}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ color:'#555', fontSize:9 }}>⚖ {weight}/{inventory.maxWeight}</span>
            <button onClick={handleClose} style={{
              background:'none', border:'1px solid #4a2a2a', color:'#be7c7c',
              cursor:'pointer', borderRadius:3, padding:'2px 8px', fontSize:11, fontFamily:'monospace',
            }}>✕</button>
          </div>
        </div>

        {/* ── BAG TAB ─────────────────────────────────────────────── */}
        {tab === 'bag' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:10 }}>
              {slots.map((slot, i) => {
                const def     = slot ? ITEM_DB[slot.itemId] : null;
                const selected = selectedSlot === i;
                const rarity  = def?.rarity || 'common';
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedSlot(selected ? null : (slot ? i : null))}
                    style={{
                      width:82, height:82, position:'relative',
                      background: selected
                        ? 'rgba(124,190,124,0.18)'
                        : 'rgba(0,0,0,0.5)',
                      border: selected
                        ? '2px solid #7cbe7c'
                        : slot
                          ? `1px solid ${rarity === 'epic' ? '#cc88ff55' : rarity === 'rare' ? '#4488ff55' : '#2a4a2a'}`
                          : '1px solid #1a2a1a',
                      borderRadius:4,
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                      cursor: slot ? 'pointer' : 'default',
                      transition:'all 0.1s',
                      transform: selected ? 'scale(1.06)' : 'scale(1)',
                      boxShadow: selected ? `0 0 8px ${rarityColor(rarity)}66` : 'none',
                    }}
                  >
                    {slot && def ? (
                      <>
                        <div style={{
                          width:40, height:40,
                          background:`${def.color}22`,
                          border:`1px solid ${def.color}55`,
                          borderRadius:4,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:22,
                        }}>{def.emoji}</div>
                        {slot.count > 1 && (
                          <span style={{
                            position:'absolute', bottom:3, right:5,
                            color:'#fff', fontSize:9, textShadow:'0 0 4px #000',
                          }}>×{slot.count}</span>
                        )}
                        <span style={{ position:'absolute', top:2, left:3, fontSize:7, color:rarityColor(rarity) }}>
                          {rarity[0].toUpperCase()}
                        </span>
                        <span style={{ position:'absolute', top:2, right:3, fontSize:7, color:typeColor(def.type) }}>
                          {def.type[0].toUpperCase()}
                        </span>
                        {selected && (
                          <span style={{
                            position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)',
                            fontSize:8, color:'#7cbe7c', letterSpacing:0,
                          }}>●</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color:'#1a2a1a', fontSize:20 }}>·</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Action panel for selected slot ────────────────── */}
            {selectedSlot !== null && selectedDef ? (
              <div style={{
                background:'rgba(0,0,0,0.75)',
                border:`1px solid ${selectedDef.color}55`,
                borderRadius:6, padding:'10px 12px',
                marginTop:4,
              }}>
                {/* Item header */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:24 }}>{selectedDef.emoji}</span>
                  <div>
                    <div style={{ color:selectedDef.color, fontSize:11 }}>
                      {selectedDef.name}
                      {slots[selectedSlot].count > 1 && (
                        <span style={{ color:'#888' }}> ×{slots[selectedSlot].count}</span>
                      )}
                      <span style={{ color:rarityColor(selectedDef.rarity), fontSize:9, marginLeft:6 }}>
                        [{selectedDef.rarity}]
                      </span>
                    </div>
                    <div style={{ color:'#666', fontSize:9, marginTop:1 }}>
                      {selectedDef.description}
                    </div>
                    {selectedDef.statBonus && (
                      <div style={{ color:'#7cbe7c', fontSize:9, marginTop:2 }}>
                        {Object.entries(selectedDef.statBonus).map(([k,v]) => `+${v} ${k}`).join('  ')}
                      </div>
                    )}
                    <div style={{ color:'#555', fontSize:8, marginTop:2 }}>
                      ⚖ {selectedDef.weight * slots[selectedSlot].count}kg
                      {selectedDef.slot && <span style={{ color:'#ffd700', marginLeft:8 }}>→ {selectedDef.slot}</span>}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {selectedDef.type === 'consumable' && (
                    <ActionBtn color='#7cbe7c' bg='#1a4a1a' onClick={() => {
                      onUse(selectedSlot); setSelectedSlot(null);
                    }}>🍶 Use</ActionBtn>
                  )}
                  {selectedDef.type === 'equipment' && (
                    <ActionBtn color='#ffd700' bg='#3a2a00' onClick={() => {
                      onUse(selectedSlot); setSelectedSlot(null);
                    }}>⚔ Equip</ActionBtn>
                  )}
                  <ActionBtn color='#be7c7c' bg='#4a1a1a' onClick={() => {
                    onDrop(selectedSlot); setSelectedSlot(null);
                  }}>🗑 Drop</ActionBtn>
                  <ActionBtn color='#888' bg='#1a1a2a' onClick={() => setSelectedSlot(null)}>
                    Cancel
                  </ActionBtn>
                </div>
              </div>
            ) : (
              <div style={{ color:'#1a3a1a', fontSize:9, textAlign:'center', padding:'6px 0' }}>
                Click an item to see actions
              </div>
            )}
          </>
        )}

        {/* ── EQUIP TAB ───────────────────────────────────────────── */}
        {tab === 'equip' && (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {EQUIPMENT_SLOTS.map(slotId => {
                const itemId = equipped[slotId];
                const def    = itemId ? ITEM_DB[itemId] : null;
                const hov    = hoveredEquip === slotId;
                return (
                  <div key={slotId}
                    onMouseEnter={() => setHoveredEquip(slotId)}
                    onMouseLeave={() => setHoveredEquip(null)}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      background: hov ? 'rgba(124,190,124,0.07)' : 'rgba(0,0,0,0.4)',
                      border:`1px solid ${hov ? '#2a5a2a' : '#1a3a1a'}`,
                      borderRadius:5, padding:'8px 10px', transition:'all 0.1s',
                    }}
                  >
                    <div style={{
                      width:36, height:36, flexShrink:0,
                      background:'rgba(0,0,0,0.5)', border:'1px solid #2a3a2a',
                      borderRadius:4, display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:18,
                    }}>
                      {def ? def.emoji : SLOT_ICONS[slotId]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ color: def ? def.color : '#334433', fontSize:10 }}>
                        {def ? def.name : `— ${SLOT_LABELS[slotId]} —`}
                      </div>
                      {def?.statBonus && (
                        <div style={{ color:'#7cbe7c', fontSize:8, marginTop:1 }}>
                          {Object.entries(def.statBonus).map(([k,v]) => `+${v} ${k}`).join('  ')}
                        </div>
                      )}
                      {!def && <div style={{ color:'#2a4a2a', fontSize:8 }}>Empty slot</div>}
                    </div>
                    {def && (
                      <button onClick={() => onUnequip(slotId)} style={{
                        background:'#4a1a1a', border:'1px solid #be7c7c44',
                        borderRadius:3, color:'#be7c7c', cursor:'pointer',
                        padding:'3px 8px', fontSize:9, fontFamily:'monospace',
                      }}>Remove</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ color:'#1a3a1a', fontSize:9, textAlign:'center', marginTop:10 }}>
              Equip items from the Bag tab
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, color, bg }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, border:`1px solid ${color}55`,
        borderRadius:4, color, cursor:'pointer',
        padding:'5px 12px', fontSize:10, fontFamily:'monospace',
        letterSpacing:0.5, transition:'filter 0.1s',
      }}
      onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.4)'}
      onMouseOut={e  => e.currentTarget.style.filter = ''}
    >{children}</button>
  );
}
