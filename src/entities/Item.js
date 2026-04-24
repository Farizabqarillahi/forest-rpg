/**
 * WorldItem - An item dropped/placed in the game world
 */
import { ITEM_DB } from '../systems/InventorySystem.js';

export class WorldItem {
  constructor(itemId, worldX, worldY) {
    this.itemId = itemId;
    this.x = worldX;
    this.y = worldY;
    this.width = 12;
    this.height = 12;

    // Bobbing animation
    this.bobTimer = Math.random() * Math.PI * 2;
    this.bobOffset = 0;

    // Pickup range
    this.pickupRange = 28;

    // Flash on spawn
    this.spawnTimer = 0.3;

    this.def = ITEM_DB[itemId];
  }

  update(deltaTime) {
    this.bobTimer += deltaTime * 2;
    this.bobOffset = Math.sin(this.bobTimer) * 2;
    if (this.spawnTimer > 0) this.spawnTimer -= deltaTime;
  }

  isNearPlayer(player) {
    const dx = this.x + this.width / 2 - player.centerX;
    const dy = this.y + this.height / 2 - player.centerY;
    return Math.sqrt(dx * dx + dy * dy) <= this.pickupRange;
  }

  /**
   * Get color for rendering the item pickup indicator
   */
  get color() {
    if (!this.def) return '#fff';
    return this.def.color;
  }

  get name() {
    return this.def ? this.def.name : this.itemId;
  }

  get emoji() {
    return this.def ? this.def.emoji : '❓';
  }
}
