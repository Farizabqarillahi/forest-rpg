/**
 * EnemySpawnSystem - Manages enemy spawning with:
 *   - Safe zone awareness (never spawns inside zones)
 *   - Minimum distance from player spawn
 *   - Per-region enemy caps
 *   - Timed respawn pool
 *
 * This replaces the ad-hoc spawn logic in EnemyAISystem._spawnInitialEnemies().
 * EnemyAISystem delegates to this system for all spawn decisions.
 */
import { Enemy } from '../entities/Enemy.js';

const REGION_CONFIGS = {
  village:    [],
  camp:       [{ type: 'slime', max: 1 }, { type: 'wolf',  max: 1 }],
  forest:     [{ type: 'slime', max: 3 }, { type: 'wolf',  max: 2 }],
  river:      [{ type: 'slime', max: 2 }],
  cliff:      [{ type: 'wolf',  max: 2 }],
  ruins:      [{ type: 'spirit',max: 2 }, { type: 'wolf',  max: 1 }],
  deepForest: [{ type: 'wolf',  max: 3 }, { type: 'spirit',max: 2 }],
};

const RESPAWN_DELAY_MIN = 20; // seconds
const RESPAWN_DELAY_MAX = 40;
const MIN_DIST_FROM_SPAWN = 200; // pixels — never spawn this close to player spawn

export class EnemySpawnSystem {
  /**
   * @param {Array}  regions      - from mapData.regions
   * @param {Array}  collisionMap - 2D tile collision grid
   * @param {number} tileSize
   * @param {import('./SafeZoneSystem.js').SafeZoneSystem} safeZone
   * @param {number} spawnX      - player spawn world X (to keep enemies away at start)
   * @param {number} spawnY      - player spawn world Y
   */
  constructor(regions, collisionMap, tileSize, safeZone, spawnX, spawnY) {
    this.regions      = regions;
    this.collisionMap = collisionMap;
    this.tileSize     = tileSize;
    this.safeZone     = safeZone;
    this.spawnX       = spawnX;
    this.spawnY       = spawnY;

    /** @type {Enemy[]} */
    this.enemies      = [];

    /** @type {Array<{type:string, region:object, timer:number}>} */
    this.respawnQueue = [];

    this._initialSpawn();
  }

  /* ── Initial population ──────────────────────────────────────────── */

  _initialSpawn() {
    for (const region of this.regions) {
      const configs = REGION_CONFIGS[region.biome] || [];
      for (const cfg of configs) {
        const count = cfg.max;
        for (let i = 0; i < count; i++) {
          const pos = this._findSpawnPos(region, true);
          if (pos) this.enemies.push(new Enemy(cfg.type, pos.x, pos.y));
        }
      }
    }
  }

  /* ── Per-frame update ────────────────────────────────────────────── */

  /**
   * Tick the respawn queue and spawn ready enemies.
   * Returns newly created Enemy instances for GameScene to store.
   *
   * @param {number} deltaTime
   * @returns {Enemy[]}
   */
  tick(deltaTime) {
    // Tick respawn timers
    for (const entry of this.respawnQueue) entry.timer -= deltaTime;

    const ready   = this.respawnQueue.filter(e => e.timer <= 0);
    this.respawnQueue = this.respawnQueue.filter(e => e.timer > 0);

    const spawned = [];
    for (const entry of ready) {
      // Check per-region cap before spawning
      const regionEnemies = this.enemies.filter(e =>
        !e.isFullyDead && this._enemyInRegion(e, entry.region)
      );
      const cap = this._capFor(entry.type, entry.region);
      if (regionEnemies.filter(e => e.type === entry.type).length >= cap) continue;

      const pos = this._findSpawnPos(entry.region, false);
      if (!pos) continue;

      const enemy = new Enemy(entry.type, pos.x, pos.y);
      this.enemies.push(enemy);
      spawned.push(enemy);
    }

    return spawned;
  }

  /**
   * Notify the spawn system that an enemy died.
   * Queues a respawn for its region.
   *
   * @param {Enemy} enemy
   */
  onEnemyDied(enemy) {
    const region = this._regionFor(enemy.spawnX, enemy.spawnY);
    if (!region) return;

    this.respawnQueue.push({
      type:   enemy.type,
      region,
      timer:  RESPAWN_DELAY_MIN + Math.random() * (RESPAWN_DELAY_MAX - RESPAWN_DELAY_MIN),
    });
  }

  /* ── Helpers ─────────────────────────────────────────────────────── */

  /**
   * Try to find a valid spawn position inside a region.
   * Rejects safe zone, unwalkable tiles, and (on initial spawn) proximity to player spawn.
   */
  _findSpawnPos(region, initialSpawn, attempts = 30) {
    const ts = this.tileSize;
    for (let i = 0; i < attempts; i++) {
      const tx = region.x + 1 + Math.floor(Math.random() * (region.w - 2));
      const ty = region.y + 1 + Math.floor(Math.random() * (region.h - 2));

      if (tx < 0 || ty < 0) continue;
      if (ty >= this.collisionMap.length || tx >= this.collisionMap[0].length) continue;
      if (this.collisionMap[ty][tx] !== 0) continue; // solid tile

      const wx = tx * ts + ts / 2;
      const wy = ty * ts + ts / 2;

      if (this.safeZone.containsPoint(wx, wy)) continue;

      if (initialSpawn) {
        const dx = wx - this.spawnX;
        const dy = wy - this.spawnY;
        if (Math.sqrt(dx * dx + dy * dy) < MIN_DIST_FROM_SPAWN) continue;
      }

      return { x: wx, y: wy };
    }
    return null;
  }

  _regionFor(wx, wy) {
    const tx = Math.floor(wx / this.tileSize);
    const ty = Math.floor(wy / this.tileSize);
    return this.regions.find(r =>
      tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h
    ) || null;
  }

  _enemyInRegion(enemy, region) {
    const tx = Math.floor(enemy.spawnX / this.tileSize);
    const ty = Math.floor(enemy.spawnY / this.tileSize);
    return tx >= region.x && tx < region.x + region.w &&
           ty >= region.y && ty < region.y + region.h;
  }

  _capFor(type, region) {
    const configs = REGION_CONFIGS[region.biome] || [];
    const cfg = configs.find(c => c.type === type);
    return cfg ? cfg.max : 0;
  }
}
