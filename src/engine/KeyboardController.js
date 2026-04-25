/**
 * KeyboardController - Tracks key states for game input
 */
export class KeyboardController {
  constructor() {
    this.keys        = new Map();
    this.justPressed = new Set();
    this.justReleased = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  _onKeyDown(e) {
    if (!this.keys.get(e.code)) this.justPressed.add(e.code);
    this.keys.set(e.code, true);
    const gameKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyI','KeyM'];
    if (gameKeys.includes(e.code)) e.preventDefault();
  }

  _onKeyUp(e) {
    this.keys.set(e.code, false);
    this.justReleased.add(e.code);
  }

  isDown(code)        { return this.keys.get(code) === true; }
  wasJustPressed(code) { return this.justPressed.has(code); }
  wasJustReleased(code){ return this.justReleased.has(code); }

  flush() { this.justPressed.clear(); this.justReleased.clear(); }
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }

  // Convenience getters
  get up()       { return this.isDown('ArrowUp')    || this.isDown('KeyW'); }
  get down()     { return this.isDown('ArrowDown')  || this.isDown('KeyS'); }
  get left()     { return this.isDown('ArrowLeft')  || this.isDown('KeyA'); }
  get right()    { return this.isDown('ArrowRight') || this.isDown('KeyD'); }
  get interact() { return this.wasJustPressed('KeyE'); }
  get inventory(){ return this.wasJustPressed('KeyI'); }
  get attack()   { return this.wasJustPressed('Space'); }
}
