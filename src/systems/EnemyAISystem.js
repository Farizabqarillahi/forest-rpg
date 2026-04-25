/**
 * EnemyAISystem - Spawns and manages enemies across regions
 */
import { Enemy } from '../entities/Enemy.js';

const REGION_ENEMIES = {
  forest:   [{ type: 'slime', density: 3 }, { type: 'wolf', density: 2 }],
  river:    [{ type: 'slime', density: 2 }],
  cliff:    [{ type: 'wolf', density: 2 }],
  ruins:    [{ type: 'spirit', density: 2 }, { type: 'wolf', density: 1 }],
  camp:     [{ type: 'slime', density: 1 }, { type: 'wolf', density: 1 }],
  deepForest: [{ type: 'wolf', density: 3 }, { type: 'spirit', density: 2 }],
};

export class EnemyAISystem {
  constructor(mapData, collisionMap, tileSize) {
    this.regions    = mapData.regions || [];
    this.collisionMap = collisionMap;
    this.tileSize   = tileSize;
    this.enemies    = [];
    this.respawnPool = []; // { type, x, y, timer, maxTimer }
    this.maxEnemies = 30;

    this._spawnInitialEnemies();
  }

  _spawnInitialEnemies() {
    for (const region of this.regions) {
      const defs = REGION_ENEMIES[region.biome] || [];
      for (const def of defs) {
        for (let i = 0; i < def.density; i++) {
          const pos = this._findFreePos(region);
          if (pos) {
            this.enemies.push(new Enemy(def.type, pos.x, pos.y));
          }
        }
      }
    }
  }

  _findFreePos(region, attempts = 20) {
    const ts = this.tileSize;
    for (let i = 0; i < attempts; i++) {
      const tx = region.x + 1 + Math.floor(Math.random() * (region.w - 2));
      const ty = region.y + 1 + Math.floor(Math.random() * (region.h - 2));
      if (tx >= 0 && ty >= 0 &&
          ty < this.collisionMap.length &&
          tx < this.collisionMap[0].length &&
          this.collisionMap[ty][tx] === 0) {
        return { x: tx * ts, y: ty * ts };
      }
    }
    return null;
  }

  /**
   * Update all enemies; handle deaths and respawning
   * Returns array of enemies that just died (for drops, XP, quests)
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
        // Queue respawn
        const region = this._regionFor(enemy.spawnX, enemy.spawnY);
        if (region) {
          this.respawnPool.push({
            type: enemy.type,
            region,
            timer: 30 + Math.random() * 30,
          });
        }
      }
    }

    // Remove fully dead
    this.enemies = this.enemies.filter(e => !e.isFullyDead);

    // Tick respawn timers
    for (const r of this.respawnPool) r.timer -= deltaTime;
    const ready = this.respawnPool.filter(r => r.timer <= 0);
    this.respawnPool = this.respawnPool.filter(r => r.timer > 0);

    // Respawn if under cap
    if (this.enemies.length < this.maxEnemies) {
      for (const r of ready) {
        const pos = this._findFreePos(r.region);
        if (pos) this.enemies.push(new Enemy(r.type, pos.x, pos.y));
      }
    }

    return justDied;
  }

  _regionFor(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return this.regions.find(r =>
      tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h
    );
  }

  /** Render all enemies */
  render(ctx, camera, assets) {
    for (const enemy of this.enemies) {
      if (!camera.isVisible(enemy.x, enemy.y, enemy.width + 4, enemy.height + 4)) continue;
      this._renderEnemy(ctx, camera, enemy);
    }
  }

  _renderEnemy(ctx, camera, enemy) {
    const sp = camera.worldToScreen(enemy.x, enemy.y);
    const sx = Math.floor(sp.x), sy = Math.floor(sp.y);
    const w = enemy.width, h = enemy.height;

    // Death fade
    if (enemy.isDead) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - enemy.deadTimer / enemy.deadDuration);
    }

    // Hurt flash
    const hurt = enemy.hurtTimer > 0;
    ctx.save();
    if (hurt) { ctx.globalAlpha = 0.5; }

    // Draw enemy body based on type
    if (enemy.type === 'slime') {
      this._drawSlime(ctx, sx, sy, w, h, enemy);
    } else if (enemy.type === 'wolf') {
      this._drawWolf(ctx, sx, sy, w, h, enemy);
    } else if (enemy.type === 'spirit') {
      this._drawSpirit(ctx, sx, sy, w, h, enemy);
    }

    ctx.restore();

    // HP bar (don't show at full HP unless damaged recently)
    if (enemy.hp < enemy.maxHP && !enemy.isDead) {
      this._drawHPBar(ctx, sx, sy, w, enemy);
    }

    // State indicator for debug / player awareness
    if (enemy.state.is('chase') || enemy.state.is('attack')) {
      ctx.fillStyle = enemy.state.is('attack') ? '#ff3333' : '#ffaa00';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.state.is('attack') ? '!' : '👁', sx + w / 2, sy - 14);
      ctx.textAlign = 'left';
    }

    if (enemy.isDead) ctx.restore();
  }

  _drawSlime(ctx, sx, sy, w, h, enemy) {
    const bob = Math.sin(enemy.animTimer * 12) * 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h + 1, w / 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = enemy.hurtTimer > 0 ? '#ffffff' : '#44cc44';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2 + bob, w / 2, h / 2 - bob * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 - 2, sy + h / 2 - 2 + bob, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(sx + 4, sy + 4 + bob, 2, 2);
    ctx.fillRect(sx + w - 6, sy + 4 + bob, 2, 2);
  }

  _drawWolf(ctx, sx, sy, w, h, enemy) {
    const run = Math.sin(enemy.animTimer * 16) * 1.5;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h + 1, w / 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = enemy.hurtTimer > 0 ? '#ffffff' : '#775533';
    ctx.fillRect(sx + 2, sy + 5, w - 4, h - 7);
    // Head
    ctx.fillStyle = enemy.hurtTimer > 0 ? '#ffffff' : '#8B6644';
    ctx.fillRect(sx + (enemy.facing === 'left' ? 0 : w - 6), sy + 2, 7, 7);
    // Ears
    ctx.fillStyle = '#553311';
    ctx.fillRect(sx + (enemy.facing === 'left' ? 1 : w - 5), sy, 2, 3);
    // Legs
    ctx.fillStyle = '#553311';
    ctx.fillRect(sx + 3, sy + h - 5 + run, 3, 5 - run);
    ctx.fillRect(sx + w - 6, sy + h - 5 - run, 3, 5 + run);
    // Tail
    ctx.fillStyle = '#886644';
    if (enemy.facing === 'right') {
      ctx.fillRect(sx, sy + 6, 3, 3);
    } else {
      ctx.fillRect(sx + w - 3, sy + 6, 3, 3);
    }
    // Eyes glow red when chasing
    ctx.fillStyle = enemy.state.is('chase') || enemy.state.is('attack') ? '#ff2200' : '#ffcc00';
    const eyeX = enemy.facing === 'left' ? sx + 1 : sx + w - 5;
    ctx.fillRect(eyeX, sy + 4, 2, 2);
  }

  _drawSpirit(ctx, sx, sy, w, h, enemy) {
    const float = Math.sin(Date.now() / 400) * 3;
    const pulse  = 0.6 + Math.sin(Date.now() / 200) * 0.4;
    // Outer glow
    ctx.save();
    ctx.globalAlpha = 0.2 * pulse;
    ctx.fillStyle = '#cc88ff';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2 + float, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Core body
    ctx.fillStyle = enemy.hurtTimer > 0 ? '#ffffff' : '#9955ee';
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2 + float, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Inner glow
    ctx.fillStyle = `rgba(220,180,255,${0.5 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(sx + w / 2, sy + h / 2 + float, w / 4, h / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye slits
    ctx.fillStyle = '#220044';
    ctx.fillRect(sx + 4, sy + h / 2 - 1 + float, 3, 2);
    ctx.fillRect(sx + w - 7, sy + h / 2 - 1 + float, 3, 2);
    // Wisp trails
    ctx.fillStyle = 'rgba(170,136,255,0.3)';
    ctx.fillRect(sx + w / 2 - 1, sy + h + float, 2, 4);
  }

  _drawHPBar(ctx, sx, sy, w, enemy) {
    const barW = w + 4;
    const barH = 3;
    const bx = sx - 2, by = sy - 8;
    const pct = enemy.hp / enemy.maxHP;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx, by, barW, barH);

    const barColor = pct > 0.5 ? '#44cc44' : pct > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillStyle = barColor;
    ctx.fillRect(bx, by, Math.floor(barW * pct), barH);
  }
}
