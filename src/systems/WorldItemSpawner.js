/**
 * WorldItemSpawner - Manages dynamic item spawn points with rarity and respawning
 */
import { WorldItem } from '../entities/Item.js';

// Spawn point definitions — biome determines what can spawn
const BIOME_SPAWNS = {
  forest: [
    { itemId: 'wood',     weight: 50, rarity: 'common' },
    { itemId: 'herb',     weight: 30, rarity: 'common' },
    { itemId: 'potion',   weight: 15, rarity: 'common' },
    { itemId: 'wolf_fang',weight: 5,  rarity: 'rare' },
  ],
  river: [
    { itemId: 'herb',         weight: 40, rarity: 'common' },
    { itemId: 'energy_drink', weight: 30, rarity: 'common' },
    { itemId: 'stone',        weight: 20, rarity: 'common' },
    { itemId: 'spirit_essence',weight: 10, rarity: 'rare' },
  ],
  cliff: [
    { itemId: 'stone',    weight: 50, rarity: 'common' },
    { itemId: 'iron_helm',weight: 5,  rarity: 'rare' },
    { itemId: 'gold_coin',weight: 20, rarity: 'common' },
    { itemId: 'leather_armor', weight: 8, rarity: 'rare' },
  ],
  ruins: [
    { itemId: 'gold_coin',    weight: 30, rarity: 'common' },
    { itemId: 'silver_sword', weight: 8,  rarity: 'rare' },
    { itemId: 'magic_staff',  weight: 4,  rarity: 'epic' },
    { itemId: 'spirit_ring',  weight: 3,  rarity: 'epic' },
    { itemId: 'mega_potion',  weight: 15, rarity: 'rare' },
    { itemId: 'chain_mail',   weight: 6,  rarity: 'rare' },
  ],
  camp: [
    { itemId: 'wood',         weight: 40, rarity: 'common' },
    { itemId: 'leather_armor',weight: 10, rarity: 'rare' },
    { itemId: 'leather_boots',weight: 10, rarity: 'common' },
    { itemId: 'leather_cap',  weight: 10, rarity: 'common' },
    { itemId: 'potion',       weight: 25, rarity: 'common' },
    { itemId: 'sword',        weight: 5,  rarity: 'common' },
  ],
};

const RARITY_RESPAWN = { common: 60, rare: 180, epic: 600 }; // Seconds to respawn

export class SpawnPoint {
  constructor(id, x, y, biome) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.biome = biome;
    this.activeItem = null; // WorldItem currently spawned here
    this.respawnTimer = 0;
    this.respawnTime  = 30 + Math.random() * 30; // Initial variety
    this.lastItemId   = null;
    this.lastRarity   = null;
  }

  isReady() { return !this.activeItem && this.respawnTimer <= 0; }

  tick(deltaTime) {
    if (!this.activeItem && this.respawnTimer > 0) {
      this.respawnTimer -= deltaTime;
    }
  }

  spawnItem() {
    const pool = BIOME_SPAWNS[this.biome] || BIOME_SPAWNS.forest;
    const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        const item = new WorldItem(entry.itemId, this.x, this.y);
        item.rarity = entry.rarity;
        item.spawnPointId = this.id;
        this.activeItem = item;
        this.lastItemId = entry.itemId;
        this.lastRarity = entry.rarity;
        this.respawnTimer = RARITY_RESPAWN[entry.rarity] || 60;
        return item;
      }
    }
    return null;
  }

  itemPickedUp() {
    this.respawnTimer = RARITY_RESPAWN[this.lastRarity] || 60;
    this.activeItem = null;
  }
}

export class WorldItemSpawner {
  constructor(mapData) {
    this.spawnPoints = [];
    this._initSpawnPoints(mapData);
  }

  _initSpawnPoints(mapData) {
    // Generate spawn points from map regions
    const regions = mapData.regions || [];
    let id = 0;

    for (const region of regions) {
      const count = region.itemSpawnCount || 4;
      for (let i = 0; i < count; i++) {
        // Scatter within region bounds
        const x = (region.x + 1 + Math.floor(Math.random() * (region.w - 2))) * mapData.tileSize;
        const y = (region.y + 1 + Math.floor(Math.random() * (region.h - 2))) * mapData.tileSize;
        this.spawnPoints.push(new SpawnPoint(`sp_${id++}`, x, y, region.biome));
      }
    }

    // Initial spawn — populate all points immediately
    for (const sp of this.spawnPoints) {
      sp.respawnTimer = 0;
    }
  }

  /**
   * Update spawner — tick respawn timers and create new items
   * Returns array of newly spawned WorldItems
   */
  update(deltaTime, existingWorldItems) {
    const newItems = [];

    for (const sp of this.spawnPoints) {
      sp.tick(deltaTime);

      if (sp.isReady()) {
        const item = sp.spawnItem();
        if (item) newItems.push(item);
      }
    }

    return newItems;
  }

  /**
   * Notify spawner that an item was picked up
   */
  onItemPickedUp(worldItem) {
    if (!worldItem.spawnPointId) return;
    const sp = this.spawnPoints.find(s => s.id === worldItem.spawnPointId);
    if (sp) sp.itemPickedUp();
  }

  /** Get all currently active items managed by spawn points */
  getActiveItems() {
    return this.spawnPoints.map(sp => sp.activeItem).filter(Boolean);
  }
}
