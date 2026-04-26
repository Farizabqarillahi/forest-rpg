/**
 * KeyboardController - Tracks key states with InputLockSystem integration.
 *
 * KEY FIX for the "WASD stops working" bug:
 *   The game loop must NOT rely on computed getters (up/down/left/right)
 *   during the frame where a lock clears — there can be a 1-frame lag.
 *   Instead, the lock check is done AT READ TIME inside each getter,
 *   so the moment InputLockSystem.locked becomes false, movement resumes
 *   on the very next frame without any stale state.
 *
 * Additional fix: justPressed / justReleased are independent of the lock.
 * This lets the game loop read raw key state for things like Enter (open chat)
 * even while locked — the game loop itself decides what to do with locked state.
 */
import { InputLockSystem } from '../systems/InputLockSystem.js';

export class KeyboardController {
  constructor() {
    this.keys         = new Map();
    this.justPressed  = new Set();
    this.justReleased = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup',   this._onKeyUp,   { passive: true  });
  }

  _onKeyDown(e) {
    // Track all keys regardless of lock state
    if (!this.keys.get(e.code)) this.justPressed.add(e.code);
    this.keys.set(e.code, true);

    // Only prevent default for game keys when NOT locked
    // This allows normal text input in chat/auth forms
    if (!InputLockSystem.locked) {
      const prevent = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyI','KeyM'];
      if (prevent.includes(e.code)) e.preventDefault();
    }
  }

  _onKeyUp(e) {
    this.keys.set(e.code, false);
    this.justReleased.add(e.code);
  }

  isDown(code)          { return this.keys.get(code) === true; }
  wasJustPressed(code)  { return this.justPressed.has(code); }
  wasJustReleased(code) { return this.justReleased.has(code); }

  /** Clear transient sets — call ONCE at end of each update() */
  flush() {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }

  // ── Gameplay getters — all gated by InputLockSystem ──────────────
  // Lock check happens at read time, not at keydown time.
  // This means the instant the lock clears, these return true again.

  get up()        { return !InputLockSystem.locked && (this.isDown('ArrowUp')    || this.isDown('KeyW')); }
  get down()      { return !InputLockSystem.locked && (this.isDown('ArrowDown')  || this.isDown('KeyS')); }
  get left()      { return !InputLockSystem.locked && (this.isDown('ArrowLeft')  || this.isDown('KeyA')); }
  get right()     { return !InputLockSystem.locked && (this.isDown('ArrowRight') || this.isDown('KeyD')); }

  // interact/attack/inventory: only when NOT locked AND just pressed
  get interact()  { return !InputLockSystem.locked && this.wasJustPressed('KeyE'); }
  get attack()    { return !InputLockSystem.locked && this.wasJustPressed('Space'); }
  get inventory() { return !InputLockSystem.locked && this.wasJustPressed('KeyI'); }

  // Enter and map are gated at the caller level (page.js), not here,
  // because they have different lock semantics (Enter OPENS chat = not blocked)
  get openChat()  { return this.wasJustPressed('Enter'); }  // unlocked intentionally
  get openMap()   { return !InputLockSystem.locked && this.wasJustPressed('KeyM'); }
}
