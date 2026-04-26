/**
 * SafeZoneSystem - Defines rectangular safe zones around the player spawn area.
 *
 * Rules enforced:
 *   1. Enemies cannot be spawned inside a safe zone
 *   2. Enemies that wander into a safe zone immediately exit chase/attack
 *      and are redirected back to their spawn point
 *   3. The safe zone is visualised as a subtle overlay during debug mode
 *
 * Safe zones are axis-aligned rectangles in world-pixel coordinates.
 */
export class SafeZoneSystem {
  constructor() {
    /** @type {Array<{x:number, y:number, w:number, h:number, label:string}>} */
    this.zones = [];
  }

  /**
   * Register a safe zone.
   * @param {number} x      World pixel X (top-left)
   * @param {number} y      World pixel Y (top-left)
   * @param {number} w      Width in pixels
   * @param {number} h      Height in pixels
   * @param {string} label  Human-readable name (for debug)
   */
  addZone(x, y, w, h, label = 'zone') {
    this.zones.push({ x, y, w, h, label });
  }

  /**
   * Add a safe zone defined by tile coordinates.
   * @param {number} tileX   Left tile column
   * @param {number} tileY   Top tile row
   * @param {number} tilePad Padding in tiles around the rectangle
   * @param {number} tileW   Width in tiles
   * @param {number} tileH   Height in tiles
   * @param {number} tileSize
   * @param {string} label
   */
  addTileZone(tileX, tileY, tileW, tileH, tilePad, tileSize, label = 'zone') {
    const pad = tilePad * tileSize;
    this.addZone(
      (tileX - tilePad) * tileSize,
      (tileY - tilePad) * tileSize,
      (tileW + tilePad * 2) * tileSize,
      (tileH + tilePad * 2) * tileSize,
      label
    );
  }

  /** Returns true if the world-pixel point (x, y) is inside any safe zone */
  containsPoint(x, y) {
    for (const z of this.zones) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return true;
    }
    return false;
  }

  /** Returns true if a world-pixel AABB rect overlaps any safe zone */
  overlapsRect(x, y, w, h) {
    for (const z of this.zones) {
      if (x < z.x + z.w && x + w > z.x && y < z.y + z.h && y + h > z.y) return true;
    }
    return false;
  }

  /**
   * Enforce safe zone rules on a single enemy each frame.
   * If the enemy centre is inside a safe zone:
   *   - Cancel chase / attack state
   *   - Redirect to its own spawnX / spawnY
   *
   * @param {import('../entities/Enemy.js').Enemy} enemy
   */
  enforceEnemy(enemy) {
    if (!this.containsPoint(enemy.centerX, enemy.centerY)) return;

    // Cancel aggression
    enemy._alertedByPlayer = false;
    enemy.reactionTimer    = 0;
    enemy.currentPath      = null;

    // Force back to idle / patrol toward spawn
    if (!enemy.state.is('dead')) {
      enemy.state.setState('patrol');
      // Nudge the patrol angle toward home
      const dx = enemy.spawnX - enemy.centerX;
      const dy = enemy.spawnY - enemy.centerY;
      enemy.patrolAngle = Math.atan2(dy, dx);
      enemy.patrolTimer = 0;
      enemy.patrolWait  = 0;
    }
  }

  /**
   * Run enforceEnemy on every enemy in the provided array.
   * Call once per frame from EnemyAISystem or GameScene.
   *
   * @param {Array} enemies
   */
  enforceAll(enemies) {
    for (const enemy of enemies) {
      this.enforceEnemy(enemy);
    }
  }

  /**
   * Check whether a proposed spawn position is acceptable.
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} minDistFromPlayer  Extra distance guard around player
   * @param {number} playerX
   * @param {number} playerY
   */
  isValidSpawn(worldX, worldY, minDistFromPlayer = 160, playerX = 0, playerY = 0) {
    // Reject if inside any safe zone
    if (this.containsPoint(worldX, worldY)) return false;

    // Reject if too close to player
    const dx = worldX - playerX;
    const dy = worldY - playerY;
    if (Math.sqrt(dx * dx + dy * dy) < minDistFromPlayer) return false;

    return true;
  }

  /**
   * Debug render — draws semi-transparent green rectangles for each safe zone.
   * Only call during development.
   */
  renderDebug(ctx, camera) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle   = '#00ff88';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth   = 2;
    for (const z of this.zones) {
      const sx = z.x - camera.x;
      const sy = z.y - camera.y;
      ctx.fillRect(sx, sy, z.w, z.h);
      ctx.strokeRect(sx, sy, z.w, z.h);
    }
    ctx.restore();
  }
}
