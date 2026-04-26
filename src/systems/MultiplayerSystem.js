/**
 * MultiplayerSystem - Realtime position broadcast & remote player management.
 * Routes 'chat' broadcast events to ChatBubbleSystem.
 */
import { getClient }    from './SupabaseService.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';

const BROADCAST_INTERVAL = 0.08; // ~12 Hz
const MAP_NAME = 'world';

export class MultiplayerSystem {
  constructor() {
    this.localId       = null;
    this.username      = null;
    this.channel       = null;
    this.remotePlayers = new Map(); // id → RemotePlayer
    this._broadcastTimer = 0;
    this._lastX = null;
    this._lastY = null;
    this._connected = false;

    // Set after construction by GameScene
    /** @type {import('./ChatBubbleSystem.js').ChatBubbleSystem|null} */
    this.chatBubbleSystem = null;
  }

  async connect(userId, username) {
    const sb = getClient();
    if (!sb) { console.warn('MultiplayerSystem: Supabase offline'); return; }

    this.localId  = userId;
    this.username = username;

    if (this.channel) await sb.removeChannel(this.channel);

    this.channel = sb.channel(`game:${MAP_NAME}`, {
      config: { broadcast: { self: false } },
    });

    // Position updates from other players
    this.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      this._handlePosUpdate(payload);
    });

    // Player left notification
    this.channel.on('broadcast', { event: 'leave' }, ({ payload }) => {
      if (payload?.id) this.remotePlayers.delete(payload.id);
    });

    // Chat messages — route to ChatBubbleSystem
    this.channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (this.chatBubbleSystem) {
        this.chatBubbleSystem.onReceive(payload, this.remotePlayers);
      }
    });

    this.channel.subscribe((status) => {
      this._connected = status === 'SUBSCRIBED';
      if (this._connected) console.log('🌐 Multiplayer connected');
    });
  }

  async disconnect() {
    if (!this.channel || !this.localId) return;
    try {
      this.channel.send({
        type: 'broadcast', event: 'leave',
        payload: { id: this.localId },
      });
    } catch {}
    const sb = getClient();
    if (sb) await sb.removeChannel(this.channel);
    this.channel    = null;
    this._connected = false;
    this.remotePlayers.clear();
  }

  _handlePosUpdate(payload) {
    if (!payload?.id || payload.id === this.localId) return;
    let rp = this.remotePlayers.get(payload.id);
    if (!rp) {
      rp = new RemotePlayer(payload.id, payload);
      this.remotePlayers.set(payload.id, rp);
    } else {
      rp.applyUpdate(payload);
    }
  }

  update(deltaTime, player) {
    if (!this._connected || !this.localId) return;

    // Interpolate remotes, prune stale
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
        this._broadcastPos(player);
      }
    }
  }

  _broadcastPos(player) {
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

  render(ctx, camera, assets) {
    for (const rp of this.remotePlayers.values()) {
      rp.render(ctx, camera, assets);
    }
  }

  get isConnected() { return this._connected; }
  get playerCount() { return this.remotePlayers.size + 1; }
}
