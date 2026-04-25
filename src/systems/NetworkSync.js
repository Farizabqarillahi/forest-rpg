/**
 * NetworkSync - Debounced synchronisation of local game state → Supabase DB.
 * Decouples the game loop from network I/O. Works in offline mode (no-op).
 */
import * as SB from './SupabaseService.js';

export class NetworkSync {
  constructor() {
    this.userId   = null;
    this.username = null;
    this._posTimer    = 0;
    this._posInterval = 3;    // seconds between position saves
    this._invDirty    = false;
    this._invTimer    = 0;
    this._invInterval = 5;    // seconds between inventory saves
  }

  /** Call after login to bind to a user */
  bind(userId, username) {
    this.userId   = userId;
    this.username = username;
  }

  unbind() { this.userId = null; }

  get isBound() { return Boolean(this.userId); }

  /** Called every game frame with delta time */
  tick(deltaTime, player) {
    if (!this.isBound) return;

    // Position + HP
    this._posTimer += deltaTime;
    if (this._posTimer >= this._posInterval) {
      this._posTimer = 0;
      SB.savePlayerState(this.userId, {
        x: player.x, y: player.y, hp: player.hp, username: this.username,
      }).catch(() => {}); // fire-and-forget, silent fail
    }

    // Inventory (only when dirty)
    if (this._invDirty) {
      this._invTimer += deltaTime;
      if (this._invTimer >= this._invInterval) {
        this._invTimer  = 0;
        this._invDirty  = false;
        const slots = player.inventory.slots;
        SB.saveInventory(this.userId, slots).catch(() => {});
        SB.saveEquipment(this.userId, player.inventory.equipped).catch(() => {});
      }
    }
  }

  /** Mark inventory as needing a sync */
  markInventoryDirty() {
    this._invDirty = true;
    this._invTimer = 0; // Reset timer so we wait the full interval
  }

  /** Force an immediate save (e.g. on player death or logout) */
  async flushNow(player) {
    if (!this.isBound) return;
    await Promise.all([
      SB.savePlayerState(this.userId, { x: player.x, y: player.y, hp: player.hp }),
      SB.saveInventory(this.userId, player.inventory.slots),
      SB.saveEquipment(this.userId, player.inventory.equipped),
    ]).catch(() => {});
  }
}
