/**
 * InputLockSystem - Global singleton that tracks which UI layers are open.
 *
 * Any system that needs to block game keybinds registers itself here.
 * The KeyboardController checks InputLockSystem.locked before processing input.
 *
 * Lock sources:
 *   'chat'      - chat input box is focused
 *   'inventory' - inventory panel is open
 *   'auth'      - login / register form is open
 *   'dialogue'  - NPC dialogue is active
 *   'map'       - world map is open
 *
 * Usage (read):
 *   if (InputLockSystem.locked) return;
 *
 * Usage (write):
 *   InputLockSystem.lock('chat');
 *   InputLockSystem.unlock('chat');
 */
class _InputLockSystem {
  constructor() {
    /** @type {Set<string>} */
    this._sources = new Set();
  }

  /** Lock game input for a named source */
  lock(source) {
    this._sources.add(source);
  }

  /** Unlock a named source */
  unlock(source) {
    this._sources.delete(source);
  }

  /** True when ANY source is locking input */
  get locked() {
    return this._sources.size > 0;
  }

  /** True when ONLY movement (not attacks/interactions) is locked */
  get movementLocked() {
    return this._sources.size > 0;
  }

  /** Returns copy of active sources for debugging */
  get activeSources() {
    return [...this._sources];
  }

  /** Force-clear all locks (use on modal close) */
  clearAll() {
    this._sources.clear();
  }
}

// Export singleton
export const InputLockSystem = new _InputLockSystem();
