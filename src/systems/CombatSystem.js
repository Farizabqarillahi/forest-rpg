/**
 * CombatSystem - Resolves all combat interactions between player and enemies.
 * Handles: player attacks, enemy attacks, knockback, damage numbers, projectiles.
 */
import { CollisionSystem } from './CollisionSystem.js';

export class DamageNumber {
  constructor(x, y, amount, color = '#fff', isCrit = false) {
    this.x = x; this.y = y;
    this.startY = y;
    this.amount = amount;
    this.color  = color;
    this.isCrit = isCrit;
    this.timer  = 0;
    this.duration = isCrit ? 1.2 : 0.9;
    this.vy = -60; // Rise speed px/s
  }
  get alive() { return this.timer < this.duration; }
  get alpha()  { return Math.max(0, 1 - (this.timer / this.duration) * 1.4); }
  update(dt)   { this.timer += dt; this.y += this.vy * dt; }
}

export class Projectile {
  constructor(x, y, angle, speed, damage, ownerId, color) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage  = damage;
    this.ownerId = ownerId; // enemy id that fired it
    this.color   = color || '#aa88ff';
    this.radius  = 5;
    this.life    = 2.0; // seconds
    this.alive   = true;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }
}

export class CombatSystem {
  constructor() {
    this.damageNumbers = [];
    this.projectiles   = [];
    this.playerInvincTimer = 0; // Invincibility after being hit
    this.playerInvincDuration = 0.7;
  }

  /**
   * Main update — call every frame.
   * Resolves player attacks against enemies, enemy attacks against player,
   * projectile movement and hits.
   */
  update(deltaTime, player, enemies, onEnemyDied, onPlayerHit) {
    // Update invincibility window
    if (this.playerInvincTimer > 0) this.playerInvincTimer -= deltaTime;

    // Update and cull damage numbers
    for (const dn of this.damageNumbers) dn.update(deltaTime);
    this.damageNumbers = this.damageNumbers.filter(d => d.alive);

    // Update projectiles
    for (const proj of this.projectiles) proj.update(deltaTime);
    this.projectiles = this.projectiles.filter(p => p.alive);

    // Player attacks enemies
    if (player.isAttacking) {
      this._resolvePlayerAttacks(player, enemies, onEnemyDied);
    }

    // Enemy attacks / contact damage
    this._resolveEnemyAttacks(deltaTime, player, enemies, onPlayerHit);

    // Projectile hits
    this._resolveProjectileHits(player, enemies, onEnemyDied, onPlayerHit);
  }

  _resolvePlayerAttacks(player, enemies, onEnemyDied) {
    const range = player.attackRange || 28;

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      if (enemy._hitThisSwing) continue; // Already hit this attack swing

      const dist = enemy.distanceTo(player);
      if (dist > range + enemy.width / 2) continue;

      // Directional check — must be roughly in front of player
      const dx = enemy.centerX - player.centerX;
      const dy = enemy.centerY - player.centerY;
      const angleToEnemy = Math.atan2(dy, dx);
      const playerAngle = this._dirToAngle(player.facing);
      const angleDiff = Math.abs(this._normalizeAngle(angleToEnemy - playerAngle));
      if (angleDiff > Math.PI * 0.7) continue;

      // Crit chance (15%)
      const isCrit = Math.random() < 0.15;
      const rawDmg = player.attack * (isCrit ? 1.8 : 1);
      const actual = enemy.takeDamage(rawDmg);

      enemy._hitThisSwing = true;

      // Knockback enemy away from player
      const kbDist = Math.sqrt(dx * dx + dy * dy) || 1;
      enemy.applyKnockback(dx / kbDist, dy / kbDist, isCrit ? 130 : 90);

      // Spawn damage number at enemy position
      this.damageNumbers.push(new DamageNumber(
        enemy.centerX, enemy.y - 8,
        actual,
        isCrit ? '#ffd700' : '#ff6666',
        isCrit
      ));

      if (enemy.isDead) {
        if (onEnemyDied) onEnemyDied(enemy);
      }
    }
  }

  /** Clear per-swing hit flags when attack ends */
  clearSwingFlags(enemies) {
    for (const e of enemies) e._hitThisSwing = false;
  }

  _resolveEnemyAttacks(deltaTime, player, enemies, onPlayerHit) {
    if (this.playerInvincTimer > 0) return; // Player is temporarily invincible

    for (const enemy of enemies) {
      if (enemy.isDead) continue;

      if (enemy.isRanged) {
        // Ranged: fire projectile when in attack state
        if (enemy.state.is('attack') && enemy.attackTimer > enemy.attackCooldown - 0.05) {
          const angle = Math.atan2(
            player.centerY - enemy.centerY,
            player.centerX - enemy.centerX
          );
          this.projectiles.push(new Projectile(
            enemy.centerX, enemy.centerY,
            angle, 180, enemy.damage,
            enemy.id, enemy.def.color
          ));
        }
      } else {
        // Melee: contact damage
        const overlap = CollisionSystem.overlaps(player, enemy);
        if (overlap && enemy.state.is('attack')) {
          this._hitPlayer(player, enemy.damage, onPlayerHit);
        }
      }
    }
  }

  _resolveProjectileHits(player, enemies, onEnemyDied, onPlayerHit) {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;

      // Check hit on player (enemy projectiles)
      if (proj.ownerId) {
        const dx = proj.x - player.centerX;
        const dy = proj.y - player.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < proj.radius + 10 && this.playerInvincTimer <= 0) {
          this._hitPlayer(player, proj.damage, onPlayerHit);
          proj.alive = false;
        }
      }
    }
  }

  _hitPlayer(player, damage, onPlayerHit) {
    const effective = Math.max(1, damage - (player.defense || 0));
    player.takeDamage(effective);
    this.playerInvincTimer = this.playerInvincDuration;
    this.damageNumbers.push(new DamageNumber(
      player.centerX, player.y - 8,
      effective, '#ff4444', false
    ));
    if (onPlayerHit) onPlayerHit(effective);
  }

  _dirToAngle(dir) {
    switch (dir) {
      case 'right': return 0;
      case 'down':  return Math.PI / 2;
      case 'left':  return Math.PI;
      case 'up':    return -Math.PI / 2;
      default:      return 0;
    }
  }

  _normalizeAngle(a) {
    while (a > Math.PI)  a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  /** Render damage numbers and projectiles */
  render(ctx, camera) {
    // Projectiles
    for (const proj of this.projectiles) {
      const sp = camera.worldToScreen(proj.x, proj.y);
      const pulse = 0.7 + Math.sin(Date.now() / 80) * 0.3;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = proj.color;
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(Math.floor(sp.x), Math.floor(sp.y), proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Damage numbers
    for (const dn of this.damageNumbers) {
      const sx = dn.x - camera.x;
      const sy = dn.y - camera.y;
      ctx.save();
      ctx.globalAlpha = dn.alpha;
      if (dn.isCrit) {
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 6;
      } else {
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = dn.color;
      }
      ctx.textAlign = 'center';
      ctx.fillText(dn.isCrit ? `${dn.amount}!` : `${dn.amount}`, Math.floor(sx), Math.floor(sy));
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }
}
