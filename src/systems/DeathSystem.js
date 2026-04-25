/**
 * DeathSystem - Manages player death state machine:
 *   alive → hurt → dead → respawning → alive
 *
 * Integrates with:
 *  - Player entity (blocks input, triggers death animation)
 *  - InventorySystem (applies death penalty)
 *  - NetworkSync (flushes final position to DB)
 *  - UI (broadcasts death/respawn events)
 */

export const DEATH_STATES = {
  ALIVE:      'alive',
  DEAD:       'dead',
  RESPAWNING: 'respawning',
};

const DEATH_SCREEN_DURATION = 3.2;  // seconds before respawn starts
const RESPAWN_FADE_DURATION  = 0.8; // fade-in after respawn

export class DeathSystem {
  constructor(spawnX, spawnY) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;

    this.state        = DEATH_STATES.ALIVE;
    this.deathTimer   = 0;
    this.respawnTimer = 0;
    this.fadeAlpha    = 0; // 0 = transparent, 1 = black

    // Callbacks set by GameScene
    this.onDeath   = null; // () => void  — UI callback
    this.onRespawn = null; // () => void  — UI callback
  }

  get isDead()      { return this.state === DEATH_STATES.DEAD; }
  get isRespawning(){ return this.state === DEATH_STATES.RESPAWNING; }
  get isAlive()     { return this.state === DEATH_STATES.ALIVE; }
  get blocksInput() { return this.state !== DEATH_STATES.ALIVE; }

  /**
   * Called when player HP hits 0.
   * @param {Player} player
   * @param {NetworkSync} networkSync
   */
  trigger(player, networkSync) {
    if (!this.isAlive) return; // Already dead
    this.state      = DEATH_STATES.DEAD;
    this.deathTimer = 0;
    this.fadeAlpha  = 0;

    // Lock player
    player.hp         = 0;
    player.isAttacking = false;
    player.state.setState('interacting'); // Reuse 'interacting' to block input

    // Death penalty: lose 20% of gold coins (rounded down, min 0)
    const coins = player.inventory.countItem('gold_coin');
    const penalty = Math.floor(coins * 0.2);
    if (penalty > 0) player.inventory.removeItem('gold_coin', penalty);

    // Flush state to DB immediately
    if (networkSync) networkSync.flushNow(player).catch(() => {});

    if (this.onDeath) this.onDeath({ penalty });
  }

  /**
   * Update — drives the death/respawn timer.
   * @param {number} deltaTime
   * @param {Player} player
   */
  update(deltaTime, player) {
    if (this.isAlive) return;

    if (this.isDead) {
      this.deathTimer += deltaTime;

      // Fade to black
      this.fadeAlpha = Math.min(1, this.deathTimer / 1.2);

      if (this.deathTimer >= DEATH_SCREEN_DURATION) {
        this._doRespawn(player);
      }
    }

    if (this.isRespawning) {
      this.respawnTimer += deltaTime;
      // Fade from black
      this.fadeAlpha = Math.max(0, 1 - this.respawnTimer / RESPAWN_FADE_DURATION);

      if (this.respawnTimer >= RESPAWN_FADE_DURATION) {
        this.state        = DEATH_STATES.ALIVE;
        this.fadeAlpha    = 0;
        player.state.setState('idle');
        if (this.onRespawn) this.onRespawn();
      }
    }
  }

  _doRespawn(player) {
    this.state        = DEATH_STATES.RESPAWNING;
    this.respawnTimer = 0;
    this.fadeAlpha    = 1;

    // Reset player
    player.x          = this.spawnX;
    player.y          = this.spawnY;
    player.hp         = Math.floor(player.maxHP * 0.5); // Respawn at 50% HP
    player.energy     = player.maxEnergy;
    player.isAttacking = false;
  }

  /**
   * Render the death overlay (fade + "You Died" text).
   * Call AFTER all game rendering.
   */
  render(ctx, canvasWidth, canvasHeight, deathMessage) {
    if (this.isAlive && this.fadeAlpha <= 0) return;

    // Black overlay
    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;
    ctx.fillStyle   = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    // "YOU DIED" text (only during dead state, after fade-in starts)
    if (this.isDead && this.fadeAlpha > 0.4) {
      const textAlpha = Math.min(1, (this.fadeAlpha - 0.4) * 2.5);
      ctx.save();
      ctx.globalAlpha = textAlpha;

      // Title
      ctx.font        = 'bold 40px monospace';
      ctx.textAlign   = 'center';
      ctx.fillStyle   = '#cc2222';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur  = 20;
      ctx.fillText('YOU DIED', canvasWidth / 2, canvasHeight / 2 - 20);

      // Subtitle / penalty
      ctx.shadowBlur  = 0;
      ctx.font        = '14px monospace';
      ctx.fillStyle   = '#888';
      ctx.fillText(deathMessage || 'Respawning...', canvasWidth / 2, canvasHeight / 2 + 20);

      // Countdown
      const remaining = Math.max(0, DEATH_SCREEN_DURATION - this.deathTimer);
      ctx.font      = '11px monospace';
      ctx.fillStyle = '#444';
      ctx.fillText(`Respawning in ${remaining.toFixed(1)}s…`, canvasWidth / 2, canvasHeight / 2 + 50);

      ctx.textAlign = 'left';
      ctx.restore();
    }
  }
}
