/**
 * EquipmentSystem - Applies equipment stat bonuses to player and manages visual layers
 */
import { ITEM_DB, EQUIPMENT_SLOTS } from './InventorySystem.js';

export class EquipmentSystem {
  constructor(player) {
    this.player = player;
    // Base stats before equipment
    this.baseStats = {
      attack: 8,
      defense: 0,
      speed: 90,
      maxHP: 100,
      maxEnergy: 50,
      energyRegen: 5,
      attackRange: 28,
    };
  }

  /** Recompute all player stats from base + equipment bonuses */
  recalculate() {
    const bonus = this.player.inventory.statBonuses;
    const p = this.player;

    p.attack       = this.baseStats.attack + (bonus.attack || 0);
    p.defense      = this.baseStats.defense + (bonus.defense || 0);
    p.speed        = this.baseStats.speed + (bonus.speed || 0);
    p.maxHP        = this.baseStats.maxHP + (bonus.maxHP || 0);
    p.maxEnergy    = this.baseStats.maxEnergy;
    p.energyRegen  = this.baseStats.energyRegen + (bonus.energyRegen || 0);
    p.attackRange  = this.baseStats.attackRange;

    // Get weapon range
    const weaponId = p.inventory.equipped.weapon;
    if (weaponId && ITEM_DB[weaponId]) {
      const eff = ITEM_DB[weaponId].effect;
      if (eff && eff.range) p.attackRange = eff.range;
    }

    // Clamp HP
    p.hp = Math.min(p.hp, p.maxHP);
  }

  /** Get array of visual overlay layers for equipped items */
  getVisualLayers(equipped) {
    const layers = [];
    for (const slotId of EQUIPMENT_SLOTS) {
      const itemId = equipped[slotId];
      if (!itemId) continue;
      const def = ITEM_DB[itemId];
      if (!def) continue;
      layers.push({ slotId, itemId, color: def.color, rarity: def.rarity, emoji: def.emoji });
    }
    return layers;
  }

  /** Draw equipment overlays on player sprite */
  renderEquipmentOverlay(ctx, screenX, screenY, player) {
    const eq = player.inventory.equipped;

    // Weapon indicator (small icon near hand)
    if (eq.weapon) {
      const def = ITEM_DB[eq.weapon];
      ctx.save();
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      const wx = player.facing === 'right' ? screenX + 22 : screenX - 6;
      const wy = screenY + 6;
      ctx.fillText(def.emoji, wx, wy);
      ctx.restore();
    }

    // Helmet glow on head
    if (eq.helmet) {
      const def = ITEM_DB[eq.helmet];
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = def.color;
      ctx.fillRect(Math.floor(screenX + 2), Math.floor(screenY - 2), 12, 5);
      ctx.restore();
    }

    // Armor tint on body
    if (eq.armor) {
      const def = ITEM_DB[eq.armor];
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = def.color;
      ctx.fillRect(Math.floor(screenX + 2), Math.floor(screenY + 5), 12, 8);
      ctx.restore();
    }

    // Boots tint on feet
    if (eq.boots) {
      const def = ITEM_DB[eq.boots];
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = def.color;
      ctx.fillRect(Math.floor(screenX + 2), Math.floor(screenY + 12), 5, 4);
      ctx.fillRect(Math.floor(screenX + 9), Math.floor(screenY + 12), 5, 4);
      ctx.restore();
    }

    // Accessory sparkle
    if (eq.accessory) {
      const def = ITEM_DB[eq.accessory];
      const sparkle = Math.sin(Date.now() / 300) * 0.4 + 0.6;
      ctx.save();
      ctx.globalAlpha = sparkle * 0.6;
      ctx.fillStyle = def.color;
      ctx.fillRect(Math.floor(screenX + 7), Math.floor(screenY - 4), 3, 3);
      ctx.restore();
    }
  }

  serialize() {
    return { equipped: { ...this.player.inventory.equipped } };
  }
}
