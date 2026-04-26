/**
 * InputLockSystem - Reference-counted, reason-based input lock.
 *
 * ROOT CAUSE OF THE BUGS this fixes:
 *   1. lock/unlock imbalance: A component that calls lock() but then
 *      unmounts via Escape/parent state (not its own onClose) never
 *      called unlock() — lock permanently stuck.
 *   2. Game loop calling lock('dialogue') every frame while active,
 *      but only unlock() once on exit — left a stale count of N-1.
 *   3. React useEffect cleanup racing with state updates meant
 *      clearReason was sometimes skipped entirely.
 *
 * THE CONTRACT (must be followed by ALL callers):
 *   - lock(reason)        → increment refcount
 *   - clearReason(reason) → hard-reset to 0   ← use this in cleanup/finally
 *   - unlock(reason)      → decrement by 1    ← only if you KNOW count==1
 *   - NEVER call lock() inside a game loop tick. Only on state ENTER/EXIT.
 *   - ALWAYS call clearReason() in React useEffect cleanup functions.
 *
 * Reasons used in this codebase:
 *   'chat'      — chat input box focused
 *   'inventory' — inventory panel open
 *   'auth'      — login/register form open
 *   'dialogue'  — NPC dialogue active (managed by DialogueSystem, not React)
 *   'map'       — world map panel open
 *   'death'     — player is dead/respawning
 */
class _InputLockSystem {
  constructor() {
    /** @type {Map<string, number>} reason → refcount */
    this._counts = new Map();
    /** @type {Set<Function>} change listeners */
    this._listeners = new Set();
  }

  // ── Write API ─────────────────────────────────────────────────────

  lock(reason) {
    this._counts.set(reason, (this._counts.get(reason) ?? 0) + 1);
    this._notify();
  }

  unlock(reason) {
    const cur = this._counts.get(reason) ?? 0;
    if (cur <= 1) this._counts.delete(reason);
    else this._counts.set(reason, cur - 1);
    this._notify();
  }

  /**
   * Hard-reset one reason to 0.
   * ALWAYS use this in React useEffect cleanup and finally blocks.
   */
  clearReason(reason) {
    if (this._counts.has(reason)) {
      this._counts.delete(reason);
      this._notify();
    }
  }

  /** Reset every lock — call on page unmount. */
  clearAll() {
    if (this._counts.size > 0) {
      this._counts.clear();
      this._notify();
    }
  }

  // ── Read API ──────────────────────────────────────────────────────

  get locked()          { return this._counts.size > 0; }
  isLocked(reason)      { return (this._counts.get(reason) ?? 0) > 0; }
  get activeSources()   { return [...this._counts.entries()].map(([k,v]) => `${k}(${v})`); }

  // ── Observer API ──────────────────────────────────────────────────
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
  _notify() {
    for (const fn of this._listeners) fn(this.locked, this.activeSources);
  }
}

export const InputLockSystem = new _InputLockSystem();
