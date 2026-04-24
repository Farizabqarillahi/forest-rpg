/**
 * InventorySystem - Manages item definitions, stacking, and inventory grid
 */

// Item database - all game items defined here
export const ITEM_DB = {
  sword: {
    id: 'sword',
    name: 'Iron Sword',
    type: 'equipment',
    description: 'A sturdy iron sword. +5 attack.',
    stackable: false,
    weight: 5,
    maxStack: 1,
    effect: { attack: 5 },
    spriteIndex: 0, // Index in items sprite sheet (16px each)
    color: '#aaa',
    emoji: '⚔️',
  },
  potion: {
    id: 'potion',
    name: 'Health Potion',
    type: 'consumable',
    description: 'Restores 30 HP when used.',
    stackable: true,
    weight: 1,
    maxStack: 9,
    effect: { heal: 30 },
    spriteIndex: 1,
    color: '#ff4444',
    emoji: '🧪',
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    type: 'material',
    description: 'Useful building material.',
    stackable: true,
    weight: 2,
    maxStack: 9,
    effect: null,
    spriteIndex: 2,
    color: '#8B6914',
    emoji: '🪵',
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    type: 'material',
    description: 'Hard stone for construction.',
    stackable: true,
    weight: 3,
    maxStack: 9,
    effect: null,
    spriteIndex: 3,
    color: '#888',
    emoji: '🪨',
  },
};

export class InventorySystem {
  constructor(maxWeight = 50, gridSize = 16) {
    this.maxWeight = maxWeight;
    this.gridSize = gridSize; // Total slots
    this.slots = new Array(gridSize).fill(null); // null = empty, { itemId, count }
    this.totalWeight = 0;
  }

  get currentWeight() {
    let w = 0;
    for (const slot of this.slots) {
      if (slot) {
        const def = ITEM_DB[slot.itemId];
        if (def) w += def.weight * slot.count;
      }
    }
    return w;
  }

  /**
   * Add item to inventory. Returns true if successful.
   */
  addItem(itemId, count = 1) {
    const def = ITEM_DB[itemId];
    if (!def) return false;

    const weightNeeded = def.weight * count;
    if (this.currentWeight + weightNeeded > this.maxWeight) return false;

    // Try to stack first
    if (def.stackable) {
      for (let i = 0; i < this.slots.length; i++) {
        const slot = this.slots[i];
        if (slot && slot.itemId === itemId && slot.count < def.maxStack) {
          const canAdd = Math.min(count, def.maxStack - slot.count);
          slot.count += canAdd;
          count -= canAdd;
          if (count <= 0) return true;
        }
      }
    }

    // Find empty slot
    const emptyIdx = this.slots.indexOf(null);
    if (emptyIdx === -1) return false; // No space

    this.slots[emptyIdx] = { itemId, count };
    return true;
  }

  /**
   * Remove item by id and count. Returns true if successful.
   */
  removeItem(itemId, count = 1) {
    let remaining = count;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot || slot.itemId !== itemId) continue;

      if (slot.count <= remaining) {
        remaining -= slot.count;
        this.slots[i] = null;
      } else {
        slot.count -= remaining;
        remaining = 0;
      }
      if (remaining <= 0) return true;
    }
    return remaining === 0;
  }

  /**
   * Count total of an item type
   */
  countItem(itemId) {
    let total = 0;
    for (const slot of this.slots) {
      if (slot && slot.itemId === itemId) total += slot.count;
    }
    return total;
  }

  hasItem(itemId, count = 1) {
    return this.countItem(itemId) >= count;
  }

  /**
   * Use item at slot index. Returns effect data or null.
   */
  useItemAt(slotIndex) {
    const slot = this.slots[slotIndex];
    if (!slot) return null;

    const def = ITEM_DB[slot.itemId];
    if (!def || !def.effect) return null;

    if (def.type === 'consumable') {
      slot.count--;
      if (slot.count <= 0) this.slots[slotIndex] = null;
      return def.effect;
    }

    if (def.type === 'equipment') {
      return { equip: def.id, ...def.effect };
    }

    return null;
  }

  /**
   * Swap items between two slot indices
   */
  swapSlots(from, to) {
    const temp = this.slots[from];
    this.slots[from] = this.slots[to];
    this.slots[to] = temp;
  }

  /**
   * Remove item at a specific slot, return { itemId, count } or null
   */
  removeAtSlot(slotIndex) {
    const slot = this.slots[slotIndex];
    this.slots[slotIndex] = null;
    return slot;
  }

  /**
   * Serialize for save system
   */
  serialize() {
    return { slots: this.slots.slice() };
  }

  /**
   * Load from serialized data
   */
  deserialize(data) {
    if (data && data.slots) {
      this.slots = data.slots.slice();
    }
  }
}
