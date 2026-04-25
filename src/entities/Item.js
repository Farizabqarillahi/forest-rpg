/**
 * WorldItem - An item dropped or spawned in the game world
 */
import { ITEM_DB } from '../systems/InventorySystem.js';

export class WorldItem {
  constructor(itemId, worldX, worldY) {
    this.itemId  = itemId;
    this.x = worldX;
    this.y = worldY;
    this.width  = 12;
    this.height = 12;

    this.bobTimer  = Math.random() * Math.PI * 2;
    this.bobOffset = 0;
    this.spawnTimer = 0.3;
    this.pickupRange = 30;

    // Spawner linkage
    this.spawnPointId = null;
    this.rarity = 'common';

    this.def = ITEM_DB[itemId] || null;
  }

  update(deltaTime) {
    this.bobTimer  += deltaTime * 2;
    this.bobOffset  = Math.sin(this.bobTimer) * 2;
    if (this.spawnTimer > 0) this.spawnTimer -= deltaTime;
  }

  isNearPlayer(player) {
    const dx = this.x + this.width / 2 - player.centerX;
    const dy = this.y + this.height / 2 - player.centerY;
    return Math.sqrt(dx * dx + dy * dy) <= this.pickupRange;
  }

  get color()  { return this.def?.color  || '#fff'; }
  get name()   { return this.def?.name   || this.itemId; }
  get emoji()  { return this.def?.emoji  || '❓'; }
}
