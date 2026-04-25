/**
 * Enemy - Base enemy class with corrected AI:
 *  - deltaTime-based movement (no frame-rate dependency)
 *  - Speed clamped to type-defined max
 *  - Reaction delay before chase (0.5–1s)
 *  - Lose-aggro radius (stops chasing when player escapes)
 *  - States: idle → patrol → alerted → chase → attack → dead
 */
import { StateManager } from '../engine/StateManager.js';

export const ENEMY_TYPES = {
  slime: {
    name: 'Slime',
    maxHP: 30, damage: 5,
    speed: 38,          // px/s — properly respected via deltaTime
    maxSpeed: 42,       // hard cap
    visionRadius: 80,
    aggroRadius: 120,   // loses aggro beyond this distance
    reactionDelay: 0.8, // seconds before starting chase
    attackRange: 20, attackCooldown: 1.5,
    xpReward: 10,
    drops: [
      { itemId: 'slime_gel',  chance: 0.8, count: 1 },
      { itemId: 'potion',     chance: 0.15, count: 1 },
      { itemId: 'gold_coin',  chance: 0.5,  count: [1, 3] },
    ],
    color: '#44dd44', glowColor: '#88ff88', size: 14, patrolRadius: 48,
  },
  wolf: {
    name: 'Forest Wolf',
    maxHP: 55, damage: 12,
    speed: 85,
    maxSpeed: 95,
    visionRadius: 130,
    aggroRadius: 180,
    reactionDelay: 0.4,
    attackRange: 22, attackCooldown: 1.0,
    xpReward: 25,
    drops: [
      { itemId: 'wolf_fang',  chance: 0.7, count: 1 },
      { itemId: 'gold_coin',  chance: 0.6, count: [2, 5] },
      { itemId: 'herb',       chance: 0.2, count: 1 },
    ],
    color: '#886644', glowColor: '#bb9966', size: 16, patrolRadius: 96,
  },
  spirit: {
    name: 'Forest Spirit',
    maxHP: 45, damage: 18,
    speed: 55,
    maxSpeed: 65,
    visionRadius: 160,
    aggroRadius: 200,
    reactionDelay: 0.6,
    attackRange: 90, attackCooldown: 2.0, // ranged
    xpReward: 40,
    drops: [
      { itemId: 'spirit_essence', chance: 0.5, count: 1 },
      { itemId: 'mega_potion',    chance: 0.2, count: 1 },
      { itemId: 'gold_coin',      chance: 0.7, count: [3, 8] },
    ],
    color: '#aa88ff', glowColor: '#cc88ff', size: 14, patrolRadius: 64,
    isRanged: true,
  },
};

export class Enemy {
  constructor(type, x, y) {
    const def = ENEMY_TYPES[type];
    if (!def) throw new Error(`Unknown enemy type: ${type}`);

    this.type    = type;
    this.def     = def;
    this.id      = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    this.x = x; this.y = y;
    this.spawnX = x; this.spawnY = y;
    this.width  = def.size;
    this.height = def.size;

    this.maxHP   = def.maxHP;
    this.hp      = def.maxHP;
    this.damage  = def.damage;
    this.defense = 0;

    // Speed: clamped to maxSpeed each movement step
    this.speed    = Math.min(def.speed, def.maxSpeed);
    this.maxSpeed = def.maxSpeed;

    this.visionRadius = def.visionRadius;
    this.aggroRadius  = def.aggroRadius;
    this.isRanged     = !!def.isRanged;

    this.attackRange    = def.attackRange;
    this.attackCooldown = def.attackCooldown;
    this.attackTimer    = 0;

    // Reaction delay: enemy "notices" player but waits before chasing
    this.reactionDelay  = def.reactionDelay;
    this.reactionTimer  = 0; // counts up; chase starts when >= reactionDelay
    this._alertedByPlayer = false;

    // Patrol
    this.patrolAngle  = Math.random() * Math.PI * 2;
    this.patrolRadius = def.patrolRadius;
    this.patrolTimer  = 0;
    this.patrolWait   = 0;

    // State & animation
    this.state     = new StateManager('idle');
    this.facing    = 'down';
    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 0.2;
    this.moving    = false;

    // Knockback (pixels/sec)
    this.knockbackX = 0;
    this.knockbackY = 0;

    // Hurt flash
    this.hurtTimer = 0;

    // Death
    this.deadTimer    = 0;
    this.deadDuration = 0.75;
    this.isFullyDead  = false;

    // Pathfinding
    this.currentPath  = null;
    this.pathIndex    = 0;
    this.pathCooldown = 0;
    this.pathInterval = 0.6; // re-path every 0.6s

    this.xpReward = def.xpReward;
    this._hitThisSwing = false;
    this._processedDeath = false;
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }
  get isDead()  { return this.state.is('dead'); }

  distanceTo(target) {
    return Math.hypot(
      this.centerX - (target.centerX ?? target.x),
      this.centerY - (target.centerY ?? target.y)
    );
  }

  takeDamage(amount) {
    if (this.isDead) return 0;
    const effective = Math.max(1, amount - this.defense);
    this.hp = Math.max(0, this.hp - effective);
    this.hurtTimer = 0.2;
    if (this.hp <= 0) { this.state.setState('dead'); this.deadTimer = 0; }
    return effective;
  }

  applyKnockback(dx, dy, force = 80) {
    this.knockbackX = dx * force;
    this.knockbackY = dy * force;
  }

  rollDrops() {
    const drops = [];
    for (const drop of this.def.drops) {
      if (Math.random() >= drop.chance) continue;
      const count = Array.isArray(drop.count)
        ? drop.count[0] + Math.floor(Math.random() * (drop.count[1] - drop.count[0] + 1))
        : drop.count;
      drops.push({ itemId: drop.itemId, count });
    }
    return drops;
  }

  update(deltaTime, player, collisionSystem, pathfinding) {
    if (this.isDead) {
      this.deadTimer += deltaTime;
      if (this.deadTimer >= this.deadDuration) this.isFullyDead = true;
      return;
    }

    // Timers
    if (this.hurtTimer   > 0) this.hurtTimer   -= deltaTime;
    if (this.attackTimer > 0) this.attackTimer  -= deltaTime;
    if (this.pathCooldown > 0) this.pathCooldown -= deltaTime;

    // Knockback with friction
    if (Math.abs(this.knockbackX) > 0.5 || Math.abs(this.knockbackY) > 0.5) {
      const res = collisionSystem.resolveMovement(this,
        this.knockbackX * deltaTime, this.knockbackY * deltaTime);
      this.x = res.x; this.y = res.y;
      this.knockbackX *= 0.82;
      this.knockbackY *= 0.82;
    }

    const dist = this.distanceTo(player);

    // ── Reaction delay logic ──────────────────────────────────────────────────
    if (dist <= this.visionRadius) {
      if (!this._alertedByPlayer) {
        // First sighting: enter alerted state, start reaction timer
        this._alertedByPlayer = true;
        this.reactionTimer    = 0;
        this.state.setState('alerted');
        this.moving = false;
      }
    } else if (dist > this.aggroRadius) {
      // Player escaped aggro radius → reset
      this._alertedByPlayer = false;
      this.reactionTimer    = 0;
      this.state.setState('patrol');
    }

    // Tick reaction timer while alerted
    if (this._alertedByPlayer && this.state.is('alerted')) {
      this.reactionTimer += deltaTime;
      if (this.reactionTimer >= this.reactionDelay) {
        this.state.setState('chase');
      }
    }

    // ── State execution ───────────────────────────────────────────────────────
    if (this.state.is('chase') || (this._alertedByPlayer && !this.state.is('alerted'))) {
      if (this.attackTimer <= 0 && dist <= this.attackRange) {
        this.state.setState('attack');
        this.attackTimer = this.attackCooldown;
        this.moving = false;
      } else if (!this.state.is('attack') || this.attackTimer <= 0) {
        this.state.setState('chase');
        this._chasePlayer(deltaTime, player, collisionSystem, pathfinding);
      }
    } else if (this.state.is('patrol') || this.state.is('idle')) {
      this._patrol(deltaTime, collisionSystem);
    }

    this._updateAnimation(deltaTime);
  }

  _chasePlayer(deltaTime, player, collisionSystem, pathfinding) {
    // Re-path periodically
    if (this.pathCooldown <= 0) {
      const s = pathfinding.worldToTile(this.centerX, this.centerY);
      const g = pathfinding.worldToTile(player.centerX, player.centerY);
      this.currentPath  = pathfinding.findPath(s.x, s.y, g.x, g.y);
      this.pathIndex    = 0;
      this.pathCooldown = this.pathInterval;
    }

    if (this.currentPath?.length) {
      const next = this.currentPath[this.pathIndex];
      if (!next) { this.currentPath = null; return; }
      const target = pathfinding.tileToWorld(next.x, next.y);
      const dx = target.x - this.centerX;
      const dy = target.y - this.centerY;
      if (Math.hypot(dx, dy) < 8) { this.pathIndex++; return; }
      this._moveDir(dx, dy, deltaTime, collisionSystem);
    } else {
      // Direct fallback
      const dx = player.centerX - this.centerX;
      const dy = player.centerY - this.centerY;
      this._moveDir(dx, dy, deltaTime, collisionSystem);
    }
    this.moving = true;
  }

  _patrol(deltaTime, collisionSystem) {
    this.patrolTimer -= deltaTime;
    if (this.patrolWait > 0) {
      this.patrolWait -= deltaTime;
      this.moving = false;
      return;
    }
    if (this.patrolTimer <= 0) {
      this.patrolAngle += (Math.random() - 0.5) * Math.PI;
      this.patrolTimer  = 1.5 + Math.random() * 2;
      this.patrolWait   = 0.5 + Math.random();
    }
    const tx = this.spawnX + Math.cos(this.patrolAngle) * this.patrolRadius;
    const ty = this.spawnY + Math.sin(this.patrolAngle) * this.patrolRadius;
    this._moveDir(tx - this.centerX, ty - this.centerY, deltaTime, collisionSystem);
    this.moving = true;
  }

  _moveDir(dx, dy, deltaTime, collisionSystem) {
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    // Clamp actual speed to maxSpeed (fixes the "too fast" bug)
    const actualSpeed = Math.min(this.speed, this.maxSpeed);
    const step = actualSpeed * deltaTime;

    const nx = dx / dist;
    const ny = dy / dist;
    const res = collisionSystem.resolveMovement(this, nx * step, ny * step);
    this.x = res.x;
    this.y = res.y;

    this.facing = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down'  : 'up');
  }

  _updateAnimation(deltaTime) {
    if (this.moving) {
      this.animTimer += deltaTime;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animFrame = 0; this.animTimer = 0;
    }
  }

  serialize() {
    return { id: this.id, type: this.type, x: this.x, y: this.y, hp: this.hp };
  }
}
