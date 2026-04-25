/**
 * NPC - Non-player character with schedule-based behavior, pathfinding, and dialogue
 * Supports roles: quest_giver, merchant, guard, healer
 */
import { StateManager } from '../engine/StateManager.js';

export class NPC {
  constructor(data, pathfinding) {
    this.id   = data.id;
    this.name = data.name;
    this.role = data.role || 'quest_giver';
    this.x    = data.x * 32;
    this.y    = data.y * 32;
    this.width  = 16;
    this.height = 16;
    this.spriteKey = data.sprite || 'npc_elder';
    this.facing = 'down';
    this.speed  = 45;

    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 0.2;
    this.moving    = false;

    this.schedule    = data.schedule || [];
    this.pathfinding = pathfinding;
    this.patrolIndex = 0;

    this.state        = new StateManager('idle');
    this.dialogueTree = data.dialogue || {};

    this.memory = { hasSpokenBefore: false, questGiven: false };
    this.questState = 'none';

    this.interactRange = 52;
  }

  getCurrentSchedule(hour) {
    for (const entry of this.schedule) {
      const { startHour: s, endHour: e } = entry;
      if (s <= e ? (hour >= s && hour < e) : (hour >= s || hour < e)) return entry;
    }
    return this.schedule[0] || { behavior: 'idle' };
  }

  update(deltaTime, gameHour, collisionSystem) {
    const sched = this.getCurrentSchedule(gameHour);
    this.moving = false;

    if (sched.behavior === 'patrol' && sched.path?.length) {
      this._doPatrol(sched, deltaTime, collisionSystem);
    } else if (sched.behavior === 'idle' && sched.position) {
      const tx = sched.position[0] * 32, ty = sched.position[1] * 32;
      const dist = Math.hypot(tx - this.x, ty - this.y);
      if (dist > 4) { this._moveTowards(tx, ty, deltaTime, collisionSystem); }
    }

    this._updateAnimation(deltaTime);
  }

  _doPatrol(sched, deltaTime, collisionSystem) {
    const target = sched.path[this.patrolIndex];
    const tx = target[0] * 32, ty = target[1] * 32;
    const dist = Math.hypot(tx - this.x, ty - this.y);
    if (dist < 4) {
      this.patrolIndex = (this.patrolIndex + 1) % sched.path.length;
    } else {
      this._moveTowards(tx, ty, deltaTime, collisionSystem);
    }
    this.state.setState('walking');
  }

  _moveTowards(tx, ty, deltaTime, collisionSystem) {
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const nx = dx / dist, ny = dy / dist;
    const res = collisionSystem.resolveMovement(this, nx * this.speed * deltaTime, ny * this.speed * deltaTime);
    this.x = res.x; this.y = res.y;
    this.moving = true;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  _updateAnimation(deltaTime) {
    if (this.moving) {
      this.animTimer += deltaTime;
      if (this.animTimer >= this.animSpeed) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 3; }
    } else { this.animFrame = 0; this.animTimer = 0; }
  }

  getSpriteRect() {
    const dirMap = { down: 0, up: 1, left: 2, right: 3 };
    return { sx: this.animFrame * 16, sy: (dirMap[this.facing] || 0) * 16, sw: 16, sh: 16 };
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }

  isNearPlayer(player) {
    return Math.hypot(this.centerX - player.centerX, this.centerY - player.centerY) <= this.interactRange;
  }

  serialize() {
    return { id: this.id, x: this.x, y: this.y, memory: { ...this.memory }, questState: this.questState };
  }

  deserialize(data) {
    this.x = data.x; this.y = data.y;
    this.memory     = { ...data.memory };
    this.questState = data.questState || 'none';
  }
}
