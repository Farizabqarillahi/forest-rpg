/**
 * EnemyAISystem - Manages enemy updates, rendering, and delegates
 * spawn decisions to EnemySpawnSystem.
 * Integrates SafeZoneSystem to keep enemies out of safe areas.
 */
import { EnemySpawnSystem } from './EnemySpawnSystem.js';

export class EnemyAISystem {
  /**
   * @param {object} mapData
   * @param {number[][]} collisionMap
   * @param {number} tileSize
   * @param {import('./SafeZoneSystem.js').SafeZoneSystem} safeZone
   * @param {number} spawnX  Player spawn world X
   * @param {number} spawnY  Player spawn world Y
   */
  constructor(mapData, collisionMap, tileSize, safeZone, spawnX = 0, spawnY = 0) {
    this.safeZone = safeZone;

    this.spawnSys = new EnemySpawnSystem(
      mapData.regions || [],
      collisionMap,
      tileSize,
      safeZone,
      spawnX,
      spawnY,
    );

    // Enemies array lives here — EnemySpawnSystem populates it initially
    this.enemies = this.spawnSys.enemies;
  }

  /**
   * Main update loop.
   * Returns array of enemies that died this frame.
   */
  update(deltaTime, player, collisionSystem, pathfinding) {
    const justDied = [];

    for (const enemy of this.enemies) {
      if (!enemy.isFullyDead) {
        enemy.update(deltaTime, player, collisionSystem, pathfinding);
      }
      if (enemy.isFullyDead && !enemy._processedDeath) {
        enemy._processedDeath = true;
        justDied.push(enemy);
        this.spawnSys.onEnemyDied(enemy);
      }
    }

    // Remove fully dead enemies from shared array
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].isFullyDead) this.enemies.splice(i, 1);
    }

    // Safe zone enforcement — redirect enemies that wandered in
    this.safeZone.enforceAll(this.enemies);

    // Tick spawn system — get any newly spawned enemies
    const newEnemies = this.spawnSys.tick(deltaTime);
    for (const e of newEnemies) this.enemies.push(e);

    return justDied;
  }

  /** Render all visible enemies */
  render(ctx, camera, assets) {
    for (const enemy of this.enemies) {
      if (!camera.isVisible(enemy.x, enemy.y, enemy.width + 4, enemy.height + 4)) continue;
      this._renderEnemy(ctx, camera, enemy);
    }
  }

  _renderEnemy(ctx, camera, enemy) {
    const sp = camera.worldToScreen(enemy.x, enemy.y);
    const sx = Math.floor(sp.x), sy = Math.floor(sp.y);
    const w  = enemy.width,     h  = enemy.height;

    // Death fade
    if (enemy.isDead) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - enemy.deadTimer / enemy.deadDuration);
    }

    ctx.save();
    if (enemy.hurtTimer > 0) ctx.globalAlpha = 0.45;

    if      (enemy.type === 'slime')  this._drawSlime(ctx, sx, sy, w, h, enemy);
    else if (enemy.type === 'wolf')   this._drawWolf(ctx, sx, sy, w, h, enemy);
    else if (enemy.type === 'spirit') this._drawSpirit(ctx, sx, sy, w, h, enemy);

    ctx.restore();

    // HP bar
    if (enemy.hp < enemy.maxHP && !enemy.isDead) this._drawHPBar(ctx, sx, sy, w, enemy);

    // Aggression indicator
    if (enemy.state.is('chase') || enemy.state.is('attack') || enemy.state.is('alerted')) {
      const col = enemy.state.is('attack') ? '#ff3333'
                : enemy.state.is('alerted') ? '#ffdd00' : '#ffaa00';
      ctx.fillStyle = col;
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        enemy.state.is('alerted') ? '…' : enemy.state.is('attack') ? '!' : '👁',
        sx + w / 2, sy - 14
      );
      ctx.textAlign = 'left';
    }

    if (enemy.isDead) ctx.restore();
  }

  _drawSlime(ctx, sx, sy, w, h, enemy) {
    const bob = Math.sin(enemy.animTimer * 12) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx + w/2, sy + h + 1, w/2, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = enemy.hurtTimer > 0 ? '#fff' : '#44cc44';
    ctx.beginPath();
    ctx.ellipse(sx + w/2, sy + h/2 + bob, w/2, h/2 - bob*0.3, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(sx + w/2 - 2, sy + h/2 - 2 + bob, 2, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(sx + 4, sy + 4 + bob, 2, 2);
    ctx.fillRect(sx + w - 6, sy + 4 + bob, 2, 2);
  }

  _drawWolf(ctx, sx, sy, w, h, enemy) {
    const run = Math.sin(enemy.animTimer * 16) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx + w/2, sy + h + 1, w/2, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = enemy.hurtTimer > 0 ? '#fff' : '#775533';
    ctx.fillRect(sx + 2, sy + 5, w - 4, h - 7);
    ctx.fillStyle = enemy.hurtTimer > 0 ? '#fff' : '#8B6644';
    ctx.fillRect(sx + (enemy.facing === 'left' ? 0 : w - 6), sy + 2, 7, 7);
    ctx.fillStyle = '#553311';
    ctx.fillRect(sx + (enemy.facing === 'left' ? 1 : w - 5), sy, 2, 3);
    ctx.fillRect(sx + 3, sy + h - 5 + run, 3, 5 - run);
    ctx.fillRect(sx + w - 6, sy + h - 5 - run, 3, 5 + run);
    ctx.fillStyle = '#886644';
    ctx.fillRect(enemy.facing === 'right' ? sx : sx + w - 3, sy + 6, 3, 3);
    ctx.fillStyle = (enemy.state.is('chase') || enemy.state.is('attack')) ? '#ff2200' : '#ffcc00';
    ctx.fillRect(enemy.facing === 'left' ? sx + 1 : sx + w - 5, sy + 4, 2, 2);
  }

  _drawSpirit(ctx, sx, sy, w, h, enemy) {
    const float = Math.sin(Date.now() / 400) * 3;
    const pulse  = 0.6 + Math.sin(Date.now() / 200) * 0.4;
    ctx.save();
    ctx.globalAlpha = 0.2 * pulse;
    ctx.fillStyle = '#cc88ff';
    ctx.beginPath();
    ctx.ellipse(sx + w/2, sy + h/2 + float, w, h, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = enemy.hurtTimer > 0 ? '#fff' : '#9955ee';
    ctx.beginPath();
    ctx.ellipse(sx + w/2, sy + h/2 + float, w/2 - 1, h/2 - 1, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(220,180,255,${0.5 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(sx + w/2, sy + h/2 + float, w/4, h/4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#220044';
    ctx.fillRect(sx + 4, sy + h/2 - 1 + float, 3, 2);
    ctx.fillRect(sx + w - 7, sy + h/2 - 1 + float, 3, 2);
    ctx.fillStyle = 'rgba(170,136,255,0.3)';
    ctx.fillRect(sx + w/2 - 1, sy + h + float, 2, 4);
  }

  _drawHPBar(ctx, sx, sy, w, enemy) {
    const bw  = w + 4, bh = 3, bx = sx - 2, by = sy - 8;
    const pct = enemy.hp / enemy.maxHP;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = pct > 0.5 ? '#44cc44' : pct > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillRect(bx, by, Math.floor(bw * pct), bh);
  }
}
