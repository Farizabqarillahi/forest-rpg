/**
 * Player - Controllable player entity with stats, animation, and interaction
 */
import { StateManager } from '../engine/StateManager.js';
import { InventorySystem } from '../systems/InventorySystem.js';

export class Player {
  constructor(x, y) {
    // Position and size
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 16;

    // Movement
    this.speed = 90; // pixels per second
    this.facing = 'down'; // 'up', 'down', 'left', 'right'

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 0.15; // seconds per frame

    // Stats
    this.maxHP = 100;
    this.hp = 100;
    this.maxEnergy = 50;
    this.energy = 50;
    this.attack = 10;
    this.equipped = null; // equipped item id

    // State machine
    this.state = new StateManager('idle');

    // Inventory
    this.inventory = new InventorySystem(50, 16);

    // Interaction range in pixels
    this.interactRange = 40;

    // Attack animation
    this.attackTimer = 0;
    this.attackDuration = 0.3;
    this.isAttacking = false;
  }

  update(deltaTime, input, collisionSystem) {
    // Don't move during dialogue
    if (this.state.is('interacting')) return;

    const prevState = this.state.current;
    let dx = 0;
    let dy = 0;

    // WASD / Arrow movement
    if (input.up)    { dy = -1; this.facing = 'up'; }
    if (input.down)  { dy =  1; this.facing = 'down'; }
    if (input.left)  { dx = -1; this.facing = 'left'; }
    if (input.right) { dx =  1; this.facing = 'right'; }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const moving = dx !== 0 || dy !== 0;

    // Attack
    if (input.attack && !this.isAttacking) {
      this.isAttacking = true;
      this.attackTimer = 0;
      this.state.setState('attacking');
      this.energy = Math.max(0, this.energy - 5);
    }

    // Update attack timer
    if (this.isAttacking) {
      this.attackTimer += deltaTime;
      if (this.attackTimer >= this.attackDuration) {
        this.isAttacking = false;
        this.state.setState(moving ? 'walking' : 'idle');
      }
    }

    // Apply movement with collision resolution
    if (moving && !this.isAttacking) {
      const moveX = dx * this.speed * deltaTime;
      const moveY = dy * this.speed * deltaTime;
      const resolved = collisionSystem.resolveMovement(this, moveX, moveY);
      this.x = resolved.x;
      this.y = resolved.y;

      if (!this.isAttacking) this.state.setState('walking');

      // Energy drain for movement
      this.energy = Math.max(0, this.energy - deltaTime * 2);
    } else if (!this.isAttacking) {
      this.state.setState('idle');
      // Energy regen
      this.energy = Math.min(this.maxEnergy, this.energy + deltaTime * 5);
    }

    // Update animation
    this.updateAnimation(deltaTime, moving);
  }

  updateAnimation(deltaTime, moving) {
    if (moving || this.isAttacking) {
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

  /**
   * Get sprite sheet source rect for current animation frame
   * Sheet layout: 3 frames x 4 directions, 16x16 each
   */
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

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  serialize() {
    return {
      x: this.x, y: this.y,
      hp: this.hp, energy: this.energy,
      facing: this.facing,
      equipped: this.equipped,
      inventory: this.inventory.serialize(),
    };
  }

  deserialize(data) {
    this.x = data.x;
    this.y = data.y;
    this.hp = data.hp;
    this.energy = data.energy;
    this.facing = data.facing || 'down';
    this.equipped = data.equipped;
    if (data.inventory) this.inventory.deserialize(data.inventory);
  }
}
