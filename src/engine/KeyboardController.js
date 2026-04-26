/**
 * KeyboardController - Tracks key states.
 * Respects InputLockSystem — all gameplay getters return false when locked.
 */
import { InputLockSystem } from '../systems/InputLockSystem.js';

export class KeyboardController {
  constructor() {
    this.keys         = new Map();
    this.justPressed  = new Set();
    this.justReleased = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  _onKeyDown(e) {
    if (!this.keys.get(e.code)) this.justPressed.add(e.code);
    this.keys.set(e.code, true);

    // Only prevent default for game keys when input is NOT locked
    // (so typing in chat/forms still works normally)
    if (!InputLockSystem.locked) {
      const gameKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyI','KeyM','Enter'];
      if (gameKeys.includes(e.code)) e.preventDefault();
    }
  }

  _onKeyUp(e) {
    this.keys.set(e.code, false);
    this.justReleased.add(e.code);
  }

  isDown(code)         { return this.keys.get(code) === true; }
  wasJustPressed(code) { return this.justPressed.has(code); }
  wasJustReleased(code){ return this.justReleased.has(code); }

  flush() { this.justPressed.clear(); this.justReleased.clear(); }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }

  // ── Gameplay getters — all return false when any lock is active ────

  get up()        { return !InputLockSystem.locked && (this.isDown('ArrowUp')    || this.isDown('KeyW')); }
  get down()      { return !InputLockSystem.locked && (this.isDown('ArrowDown')  || this.isDown('KeyS')); }
  get left()      { return !InputLockSystem.locked && (this.isDown('ArrowLeft')  || this.isDown('KeyA')); }
  get right()     { return !InputLockSystem.locked && (this.isDown('ArrowRight') || this.isDown('KeyD')); }
  get interact()  { return !InputLockSystem.locked && this.wasJustPressed('KeyE'); }
  get inventory() { return !InputLockSystem.locked && this.wasJustPressed('KeyI'); }
  get attack()    { return !InputLockSystem.locked && this.wasJustPressed('Space'); }
  get openChat()  { return !InputLockSystem.locked && this.wasJustPressed('Enter'); }
}
