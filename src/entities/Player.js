/**
 * Player - Controllable player entity with stats, animation, combat, and equipment slots
 */
import { StateManager }    from '../engine/StateManager.js';
import { InventorySystem } from '../systems/InventorySystem.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width  = 16;
    this.height = 16;

    // Movement
    this.speed = 90;
    this.facing = 'down';

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 0.15;

    // Base stats (modified by EquipmentSystem)
    this.maxHP     = 100;
    this.hp        = 100;
    this.maxEnergy = 50;
    this.energy    = 50;
    this.attack    = 8;
    this.defense   = 0;
    this.attackRange = 28;
    this.energyRegen = 5;

    // State
    this.state = new StateManager('idle');

    // Inventory (extended with equipment slots)
    this.inventory = new InventorySystem(80, 20);

    // Combat
    this.interactRange = 40;
    this.attackTimer   = 0;
    this.attackDuration = 0.28;
    this.isAttacking   = false;

    // Hurt state
    this.hurtTimer = 0;
  }

  update(deltaTime, input, collisionSystem) {
    if (this.state.is('interacting')) return;

    // Hurt flash
    if (this.hurtTimer > 0) this.hurtTimer -= deltaTime;

    let dx = 0, dy = 0;
    if (input.up)    { dy = -1; this.facing = 'up'; }
    if (input.down)  { dy =  1; this.facing = 'down'; }
    if (input.left)  { dx = -1; this.facing = 'left'; }
    if (input.right) { dx =  1; this.facing = 'right'; }

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) { const l = Math.SQRT2; dx /= l; dy /= l; }
    const moving = dx !== 0 || dy !== 0;

    // Attack
    if (input.attack && !this.isAttacking && this.energy >= 5) {
      this.isAttacking = true;
      this.attackTimer = 0;
      this.state.setState('attacking');
      this.energy = Math.max(0, this.energy - 5);
    }

    if (this.isAttacking) {
      this.attackTimer += deltaTime;
      if (this.attackTimer >= this.attackDuration) {
        this.isAttacking = false;
        this.state.setState(moving ? 'walking' : 'idle');
      }
    }

    // Movement
    if (moving && !this.isAttacking) {
      const spd = this.speed * deltaTime;
      const res  = collisionSystem.resolveMovement(this, dx * spd, dy * spd);
      this.x = res.x; this.y = res.y;
      this.state.setState('walking');
      this.energy = Math.max(0, this.energy - deltaTime * 1.5);
    } else if (!this.isAttacking) {
      this.state.setState('idle');
      // Energy regen
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen * deltaTime);
    }

    this._updateAnimation(deltaTime, moving);
  }

  _updateAnimation(deltaTime, moving) {
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

  getSpriteRect() {
    const dirMap = { down: 0, up: 1, left: 2, right: 3 };
    return {
      sx: this.animFrame * 16,
      sy: (dirMap[this.facing] || 0) * 16,
      sw: 16, sh: 16,
    };
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimer = 0.15;
    return this.hp <= 0;
  }

  heal(amount) { this.hp = Math.min(this.maxHP, this.hp + amount); }

  serialize() {
    return {
      x: this.x, y: this.y,
      hp: this.hp, energy: this.energy,
      facing: this.facing,
      inventory: this.inventory.serialize(),
    };
  }

  deserialize(data) {
    if (!data) return;
    this.x = data.x; this.y = data.y;
    this.hp = data.hp; this.energy = data.energy;
    this.facing = data.facing || 'down';
    if (data.inventory) this.inventory.deserialize(data.inventory);
  }
}
