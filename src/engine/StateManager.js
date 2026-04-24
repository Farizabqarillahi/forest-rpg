/**
 * StateManager - Manages game and entity state transitions
 */
export class StateManager {
  constructor(initialState = 'idle') {
    this.current = initialState;
    this.previous = null;
    this.listeners = new Map();
    this.stateData = {};
  }

  /**
   * Transition to a new state
   * @param {string} newState
   * @param {object} data - optional data to pass with transition
   */
  setState(newState, data = {}) {
    if (newState === this.current) return;

    this.previous = this.current;
    this.current = newState;
    this.stateData = data;

    // Notify listeners
    const callbacks = this.listeners.get(newState) || [];
    callbacks.forEach(cb => cb(this.previous, data));

    const anyCallbacks = this.listeners.get('*') || [];
    anyCallbacks.forEach(cb => cb(newState, this.previous, data));
  }

  is(state) {
    return this.current === state;
  }

  isAny(...states) {
    return states.includes(this.current);
  }

  onEnter(state, callback) {
    if (!this.listeners.has(state)) this.listeners.set(state, []);
    this.listeners.get(state).push(callback);
  }

  onAnyChange(callback) {
    if (!this.listeners.has('*')) this.listeners.set('*', []);
    this.listeners.get('*').push(callback);
  }
}
