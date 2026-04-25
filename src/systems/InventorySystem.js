/**
 * InventorySystem - Extended with equipment slots, rarity, and new item types
 */

export const RARITY = { common: 'common', rare: 'rare', epic: 'epic' };

export const ITEM_DB = {
  // ── Consumables ───────────────────────────────────────────────────
  potion: {
    id: 'potion', name: 'Health Potion', type: 'consumable',
    description: 'Restores 30 HP.', stackable: true, weight: 1, maxStack: 9,
    effect: { heal: 30 }, color: '#ff4444', emoji: '🧪', rarity: 'common',
    slot: null,
  },
  mega_potion: {
    id: 'mega_potion', name: 'Mega Potion', type: 'consumable',
    description: 'Restores 80 HP.', stackable: true, weight: 2, maxStack: 5,
    effect: { heal: 80 }, color: '#ff88aa', emoji: '💊', rarity: 'rare',
    slot: null,
  },
  herb: {
    id: 'herb', name: 'Forest Herb', type: 'consumable',
    description: 'Heals 10 HP slowly.', stackable: true, weight: 1, maxStack: 9,
    effect: { heal: 10 }, color: '#44cc44', emoji: '🌿', rarity: 'common',
    slot: null,
  },
  energy_drink: {
    id: 'energy_drink', name: 'Energy Tonic', type: 'consumable',
    description: 'Restores 30 Energy.', stackable: true, weight: 1, maxStack: 9,
    effect: { energy: 30 }, color: '#44aaff', emoji: '⚗️', rarity: 'common',
    slot: null,
  },

  // ── Materials ─────────────────────────────────────────────────────
  wood: {
    id: 'wood', name: 'Wood', type: 'material',
    description: 'Useful building material.', stackable: true, weight: 2, maxStack: 9,
    effect: null, color: '#8B6914', emoji: '🪵', rarity: 'common', slot: null,
  },
  stone: {
    id: 'stone', name: 'Stone', type: 'material',
    description: 'Hard stone for construction.', stackable: true, weight: 3, maxStack: 9,
    effect: null, color: '#888', emoji: '🪨', rarity: 'common', slot: null,
  },
  slime_gel: {
    id: 'slime_gel', name: 'Slime Gel', type: 'material',
    description: 'Dropped by slimes. Used for crafting.', stackable: true, weight: 1, maxStack: 9,
    effect: null, color: '#88ff44', emoji: '🟢', rarity: 'common', slot: null,
  },
  wolf_fang: {
    id: 'wolf_fang', name: 'Wolf Fang', type: 'material',
    description: 'Dropped by wolves. Sharp and durable.', stackable: true, weight: 1, maxStack: 9,
    effect: null, color: '#eee', emoji: '🦷', rarity: 'common', slot: null,
  },
  spirit_essence: {
    id: 'spirit_essence', name: 'Spirit Essence', type: 'material',
    description: 'Rare essence from forest spirits.', stackable: true, weight: 1, maxStack: 5,
    effect: null, color: '#aa88ff', emoji: '✨', rarity: 'rare', slot: null,
  },
  gold_coin: {
    id: 'gold_coin', name: 'Gold Coin', type: 'material',
    description: 'Currency for trading.', stackable: true, weight: 0, maxStack: 99,
    effect: null, color: '#ffd700', emoji: '🪙', rarity: 'common', slot: null,
  },

  // ── Weapons (slot: weapon) ────────────────────────────────────────
  sword: {
    id: 'sword', name: 'Iron Sword', type: 'equipment',
    description: 'A sturdy iron sword.', stackable: false, weight: 5, maxStack: 1,
    effect: { attack: 8, range: 32 }, color: '#aab8c8', emoji: '⚔️', rarity: 'common',
    slot: 'weapon', statBonus: { attack: 8 },
  },
  silver_sword: {
    id: 'silver_sword', name: 'Silver Sword', type: 'equipment',
    description: 'Gleaming silver blade. Very effective.', stackable: false, weight: 4, maxStack: 1,
    effect: { attack: 18, range: 36 }, color: '#c8d8f0', emoji: '🗡️', rarity: 'rare',
    slot: 'weapon', statBonus: { attack: 18 },
  },
  magic_staff: {
    id: 'magic_staff', name: 'Magic Staff', type: 'equipment',
    description: 'Channels arcane power. Bonus energy regen.', stackable: false, weight: 3, maxStack: 1,
    effect: { attack: 12, range: 48 }, color: '#aa88ff', emoji: '🔮', rarity: 'epic',
    slot: 'weapon', statBonus: { attack: 12, energyRegen: 5 },
  },

  // ── Helmets (slot: helmet) ────────────────────────────────────────
  leather_cap: {
    id: 'leather_cap', name: 'Leather Cap', type: 'equipment',
    description: 'Basic head protection.', stackable: false, weight: 2, maxStack: 1,
    effect: {}, color: '#8B6914', emoji: '🪖', rarity: 'common',
    slot: 'helmet', statBonus: { defense: 3, maxHP: 10 },
  },
  iron_helm: {
    id: 'iron_helm', name: 'Iron Helm', type: 'equipment',
    description: 'Solid iron protection.', stackable: false, weight: 5, maxStack: 1,
    effect: {}, color: '#888', emoji: '⛑️', rarity: 'rare',
    slot: 'helmet', statBonus: { defense: 8, maxHP: 20 },
  },

  // ── Armors (slot: armor) ──────────────────────────────────────────
  leather_armor: {
    id: 'leather_armor', name: 'Leather Armor', type: 'equipment',
    description: 'Light and flexible.', stackable: false, weight: 6, maxStack: 1,
    effect: {}, color: '#8B6000', emoji: '🥋', rarity: 'common',
    slot: 'armor', statBonus: { defense: 5, maxHP: 15 },
  },
  chain_mail: {
    id: 'chain_mail', name: 'Chain Mail', type: 'equipment',
    description: 'Interlocked rings for superior defense.', stackable: false, weight: 10, maxStack: 1,
    effect: {}, color: '#999', emoji: '🛡️', rarity: 'rare',
    slot: 'armor', statBonus: { defense: 12, maxHP: 30 },
  },

  // ── Boots (slot: boots) ───────────────────────────────────────────
  leather_boots: {
    id: 'leather_boots', name: 'Leather Boots', type: 'equipment',
    description: 'Increases movement speed.', stackable: false, weight: 2, maxStack: 1,
    effect: {}, color: '#8B4513', emoji: '👢', rarity: 'common',
    slot: 'boots', statBonus: { speed: 15 },
  },
  swift_boots: {
    id: 'swift_boots', name: 'Swift Boots', type: 'equipment',
    description: 'Enchanted for great speed.', stackable: false, weight: 1, maxStack: 1,
    effect: {}, color: '#4488ff', emoji: '👟', rarity: 'epic',
    slot: 'boots', statBonus: { speed: 30, energyRegen: 2 },
  },

  // ── Accessories (slot: accessory) ────────────────────────────────
  wolf_amulet: {
    id: 'wolf_amulet', name: 'Wolf Amulet', type: 'equipment',
    description: 'Crafted from wolf fangs. Increases attack.', stackable: false, weight: 1, maxStack: 1,
    effect: {}, color: '#ddddee', emoji: '📿', rarity: 'rare',
    slot: 'accessory', statBonus: { attack: 6, speed: 5 },
  },
  spirit_ring: {
    id: 'spirit_ring', name: 'Spirit Ring', type: 'equipment',
    description: 'Glows with otherworldly energy.', stackable: false, weight: 0, maxStack: 1,
    effect: {}, color: '#cc88ff', emoji: '💍', rarity: 'epic',
    slot: 'accessory', statBonus: { attack: 4, defense: 4, maxHP: 20, energyRegen: 3 },
  },
};

export const EQUIPMENT_SLOTS = ['weapon', 'helmet', 'armor', 'boots', 'accessory'];

export class InventorySystem {
  constructor(maxWeight = 80, gridSize = 20) {
    this.maxWeight = maxWeight;
    this.gridSize = gridSize;
    this.slots = new Array(gridSize).fill(null);
    // Equipment slots: { weapon, helmet, armor, boots, accessory }
    this.equipped = { weapon: null, helmet: null, armor: null, boots: null, accessory: null };
  }

  get currentWeight() {
    let w = 0;
    for (const slot of this.slots) {
      if (slot) { const d = ITEM_DB[slot.itemId]; if (d) w += d.weight * slot.count; }
    }
    return w;
  }

  /** Computed stat bonuses from all equipped items */
  get statBonuses() {
    const bonus = { attack: 0, defense: 0, speed: 0, maxHP: 0, energyRegen: 0 };
    for (const slotId of EQUIPMENT_SLOTS) {
      const itemId = this.equipped[slotId];
      if (!itemId) continue;
      const def = ITEM_DB[itemId];
      if (!def || !def.statBonus) continue;
      for (const [key, val] of Object.entries(def.statBonus)) {
        if (bonus[key] !== undefined) bonus[key] += val;
      }
    }
    return bonus;
  }

  addItem(itemId, count = 1) {
    const def = ITEM_DB[itemId];
    if (!def) return false;
    if (this.currentWeight + def.weight * count > this.maxWeight) return false;

    if (def.stackable) {
      for (let i = 0; i < this.slots.length; i++) {
        const s = this.slots[i];
        if (s && s.itemId === itemId && s.count < def.maxStack) {
          const add = Math.min(count, def.maxStack - s.count);
          s.count += add; count -= add;
          if (count <= 0) return true;
        }
      }
    }
    const idx = this.slots.indexOf(null);
    if (idx === -1) return false;
    this.slots[idx] = { itemId, count };
    return true;
  }

  removeItem(itemId, count = 1) {
    let rem = count;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s || s.itemId !== itemId) continue;
      if (s.count <= rem) { rem -= s.count; this.slots[i] = null; }
      else { s.count -= rem; rem = 0; }
      if (rem <= 0) return true;
    }
    return rem === 0;
  }

  countItem(itemId) {
    let t = 0;
    for (const s of this.slots) if (s && s.itemId === itemId) t += s.count;
    return t;
  }

  hasItem(itemId, count = 1) { return this.countItem(itemId) >= count; }

  useItemAt(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot) return null;
    const def = ITEM_DB[slot.itemId];
    if (!def) return null;

    if (def.type === 'consumable') {
      slot.count--;
      if (slot.count <= 0) this.slots[slotIndex] = null;
      return { ...def.effect };
    }
    if (def.type === 'equipment') {
      return this.equipItem(slotIndex);
    }
    return null;
  }

  /** Equip an item from inventory slot, unequip old if needed */
  equipItem(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot) return null;
    const def = ITEM_DB[slot.itemId];
    if (!def || !def.slot) return null;

    const equipSlot = def.slot;
    const previously = this.equipped[equipSlot];

    // Unequip current item back to inventory
    if (previously) {
      const added = this.addItem(previously, 1);
      if (!added) return null; // No room
    }

    // Remove from inventory and equip
    this.slots[slotIndex] = null;
    this.equipped[equipSlot] = def.id;
    return { equipped: def.id, slot: equipSlot, statBonus: def.statBonus || {} };
  }

  unequipSlot(slotId) {
    const itemId = this.equipped[slotId];
    if (!itemId) return false;
    const added = this.addItem(itemId, 1);
    if (added) { this.equipped[slotId] = null; return true; }
    return false;
  }

  swapSlots(from, to) {
    const t = this.slots[from]; this.slots[from] = this.slots[to]; this.slots[to] = t;
  }

  removeAtSlot(slotIndex) {
    const s = this.slots[slotIndex]; this.slots[slotIndex] = null; return s;
  }

  serialize() {
    return { slots: this.slots.slice(), equipped: { ...this.equipped } };
  }

  deserialize(data) {
    if (!data) return;
    if (data.slots) this.slots = data.slots.slice();
    if (data.equipped) this.equipped = { ...data.equipped };
  }
}
