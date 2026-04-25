/**
 * MultiplayerSystem - Realtime position broadcast & remote player management.
 *
 * Uses Supabase Realtime Broadcast (no DB round-trip — lowest latency).
 * Channel: "game:world" — all players share one channel, filtered by map.
 *
 * Broadcast payload: { id, username, x, y, dir, state, map }
 */
import { getClient } from './SupabaseService.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';

const BROADCAST_INTERVAL = 0.08; // seconds between position broadcasts (~12 Hz)
const MAP_NAME = 'world';        // Extend later for multi-map zones

export class MultiplayerSystem {
  constructor() {
    this.localId      = null;
    this.username     = null;
    this.channel      = null;
    this.remotePlayers = new Map(); // id → RemotePlayer
    this._broadcastTimer = 0;
    this._lastX = null;
    this._lastY = null;
    this._connected = false;
  }

  /** Connect to the realtime channel for the given user */
  async connect(userId, username) {
    const sb = getClient();
    if (!sb) { console.warn('MultiplayerSystem: Supabase offline, skipping realtime'); return; }

    this.localId  = userId;
    this.username = username;

    // Leave any existing channel
    if (this.channel) await sb.removeChannel(this.channel);

    this.channel = sb.channel(`game:${MAP_NAME}`, {
      config: { broadcast: { self: false } },
    });

    // Listen for position broadcasts from other players
    this.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      this._handleRemoteUpdate(payload);
    });

    // Listen for disconnect messages
    this.channel.on('broadcast', { event: 'leave' }, ({ payload }) => {
      this.remotePlayers.delete(payload.id);
    });

    // Subscribe
    this.channel.subscribe((status) => {
      this._connected = status === 'SUBSCRIBED';
      if (this._connected) console.log('🌐 Multiplayer connected');
    });
  }

  /** Disconnect gracefully */
  async disconnect(player) {
    if (!this.channel || !this.localId) return;
    // Announce departure
    this.channel.send({
      type: 'broadcast', event: 'leave',
      payload: { id: this.localId },
    });
    const sb = getClient();
    if (sb) await sb.removeChannel(this.channel);
    this.channel    = null;
    this._connected = false;
    this.remotePlayers.clear();
  }

  _handleRemoteUpdate(payload) {
    if (!payload || !payload.id) return;
    if (payload.id === this.localId) return; // Ignore self (self:false should handle this)

    let rp = this.remotePlayers.get(payload.id);
    if (!rp) {
      rp = new RemotePlayer(payload.id, payload);
      this.remotePlayers.set(payload.id, rp);
    } else {
      rp.applyUpdate(payload);
    }
  }

  /**
   * Main update — throttled broadcast + interpolation of remote players.
   * Call every game frame.
   */
  update(deltaTime, player) {
    if (!this._connected || !this.localId) return;

    // Tick remote player interpolation + prune stale ones
    for (const [id, rp] of this.remotePlayers) {
      rp.update(deltaTime);
      if (rp.isStale) this.remotePlayers.delete(id);
    }

    // Throttled position broadcast
    this._broadcastTimer += deltaTime;
    if (this._broadcastTimer >= BROADCAST_INTERVAL) {
      this._broadcastTimer = 0;
      const moved = player.x !== this._lastX || player.y !== this._lastY;
      if (moved || player.state.current !== 'idle') {
        this._lastX = player.x;
        this._lastY = player.y;
        this._broadcast(player);
      }
    }
  }

  _broadcast(player) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast', event: 'pos',
      payload: {
        id:       this.localId,
        username: this.username,
        x:        Math.round(player.x),
        y:        Math.round(player.y),
        dir:      player.facing,
        state:    player.state.current,
        map:      MAP_NAME,
      },
    });
  }

  /** Render all remote players */
  render(ctx, camera, assets) {
    for (const rp of this.remotePlayers.values()) {
      rp.render(ctx, camera, assets);
    }
  }

  get isConnected() { return this._connected; }
  get playerCount() { return this.remotePlayers.size + 1; } // +1 for local
}
