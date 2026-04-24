/**
 * NPC - Non-player character with schedule-based behavior, A* pathfinding, and dialogue
 */
import { StateManager } from '../engine/StateManager.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';

export class NPC {
  constructor(data, pathfinding) {
    this.id = data.id;
    this.name = data.name;
    this.x = data.x * 32; // Convert tile to world
    this.y = data.y * 32;
    this.width = 16;
    this.height = 16;
    this.spriteKey = data.sprite;
    this.facing = 'down';
    this.speed = 50;

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 0.2;
    this.moving = false;

    // Schedule
    this.schedule = data.schedule;

    // Pathfinding
    this.pathfinding = pathfinding;
    this.currentPath = null;
    this.pathIndex = 0;
    this.moveTimer = 0;
    this.patrolIndex = 0;

    // State
    this.state = new StateManager('idle');
    this.currentSchedule = null;

    // Dialogue
    this.dialogueTree = data.dialogue;

    // Memory
    this.memory = {
      hasSpokenBefore: false,
      questGiven: false,
    };

    // Quest state
    this.questState = 'none'; // 'none', 'active', 'complete'

    // Interaction range
    this.interactRange = 48;
  }

  /**
   * Get the current schedule entry based on game hour (0-23)
   */
  getCurrentSchedule(hour) {
    for (const entry of this.schedule) {
      const start = entry.startHour;
      const end = entry.endHour;
      if (start <= end) {
        if (hour >= start && hour < end) return entry;
      } else {
        // Wraps midnight
        if (hour >= start || hour < end) return entry;
      }
    }
    return this.schedule[0];
  }

  update(deltaTime, gameHour, collisionSystem) {
    const sched = this.getCurrentSchedule(gameHour);
    this.currentSchedule = sched;
    this.moving = false;

    if (sched.behavior === 'idle') {
      // Move to idle position if not there
      if (sched.position) {
        const targetX = sched.position[0] * 32;
        const targetY = sched.position[1] * 32;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 4) {
          this.moveTowards(targetX, targetY, deltaTime, collisionSystem);
        }
      }
      this.state.setState('idle');
    } else if (sched.behavior === 'patrol') {
      this.doPatrol(sched, deltaTime, collisionSystem);
    } else if (sched.behavior === 'walk') {
      this.doWalk(sched, deltaTime, collisionSystem);
    }

    this.updateAnimation(deltaTime);
  }

  doPatrol(sched, deltaTime, collisionSystem) {
    if (!sched.path || sched.path.length === 0) return;

    const target = sched.path[this.patrolIndex];
    const targetX = target[0] * 32;
    const targetY = target[1] * 32;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      // Reached waypoint, go to next
      this.patrolIndex = (this.patrolIndex + 1) % sched.path.length;
    } else {
      this.moveTowards(targetX, targetY, deltaTime, collisionSystem);
    }
    this.state.setState('walking');
  }

  doWalk(sched, deltaTime, collisionSystem) {
    if (!sched.destination) return;
    const targetX = sched.destination[0] * 32;
    const targetY = sched.destination[1] * 32;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 4) {
      this.moveTowards(targetX, targetY, deltaTime, collisionSystem);
      this.state.setState('walking');
    } else {
      this.state.setState('idle');
    }
  }

  /**
   * Move towards a world position using simple direction + collision
   */
  moveTowards(targetX, targetY, deltaTime, collisionSystem) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    const nx = dx / dist;
    const ny = dy / dist;

    const moveX = nx * this.speed * deltaTime;
    const moveY = ny * this.speed * deltaTime;

    const resolved = collisionSystem.resolveMovement(this, moveX, moveY);
    this.x = resolved.x;
    this.y = resolved.y;
    this.moving = true;

    // Update facing direction
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }
  }

  updateAnimation(deltaTime) {
    if (this.moving) {
      this.animTimer += deltaTime;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 3;
      }
    } else {
      this.animFrame = 0;
      this.animTimer = 0;
    }
  }

  getSpriteRect() {
    const dirMap = { down: 0, up: 1, left: 2, right: 3 };
    const row = dirMap[this.facing] || 0;
    return {
      sx: this.animFrame * 16,
      sy: row * 16,
      sw: 16,
      sh: 16,
    };
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }

  isNearPlayer(player) {
    const dx = this.centerX - player.centerX;
    const dy = this.centerY - player.centerY;
    return Math.sqrt(dx * dx + dy * dy) <= this.interactRange;
  }

  serialize() {
    return {
      id: this.id,
      x: this.x, y: this.y,
      memory: { ...this.memory },
      questState: this.questState,
    };
  }

  deserialize(data) {
    this.x = data.x;
    this.y = data.y;
    this.memory = { ...data.memory };
    this.questState = data.questState || 'none';
  }
}
