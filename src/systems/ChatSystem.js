/**
 * ChatSystem - Realtime in-game chat using Supabase Realtime Broadcast.
 *
 * - No database persistence (memory only, ephemeral)
 * - Messages expire after 15 seconds
 * - Each message renders as a bubble above the sender's head
 * - Works for both local player and remote players
 * - Local player sends on ENTER key (when chat input is focused)
 *
 * Payload: { playerId, username, message, time }
 */
import { getClient }       from './SupabaseService.js';
import { InputLockSystem } from './InputLockSystem.js';

const MESSAGE_TTL   = 15;    // seconds before message disappears
const MAX_MSG_LEN   = 120;   // max characters allowed
const CHANNEL_EVENT = 'chat';

export class ChatMessage {
  constructor(playerId, username, text) {
    this.playerId = playerId;
    this.username = username;
    this.text     = text;
    this.age      = 0;         // seconds since created
    this.ttl      = MESSAGE_TTL;
  }

  get alive()   { return this.age < this.ttl; }
  get opacity() {
    // Fade out in the last 3 seconds
    const fadeStart = this.ttl - 3;
    if (this.age < fadeStart) return 1;
    return Math.max(0, 1 - (this.age - fadeStart) / 3);
  }
}

export class ChatSystem {
  /**
   * @param {import('./MultiplayerSystem.js').MultiplayerSystem} multiplayer
   *   We reuse the same Supabase channel for chat to avoid extra connections.
   */
  constructor(multiplayer) {
    this.multiplayer = multiplayer;

    /** Map<playerId, ChatMessage> — one active message per player */
    this.messages = new Map();

    this._localId  = null;
    this._username = null;
  }

  /** Bind to the local player after login */
  bind(localId, username) {
    this._localId  = localId;
    this._username = username;
  }

  unbind() {
    this._localId  = null;
    this._username = null;
    this.messages.clear();
  }

  /**
   * Handle an incoming chat broadcast payload.
   * Called by MultiplayerSystem when it receives a 'chat' event.
   */
  onReceive(payload) {
    if (!payload?.playerId || !payload?.message) return;
    if (payload.playerId === this._localId) return; // Echo suppressed

    const msg = new ChatMessage(payload.playerId, payload.username, payload.message);
    this.messages.set(payload.playerId, msg);
  }

  /**
   * Send a message from the local player.
   * @param {string} text
   */
  send(text) {
    if (!this._localId || !text.trim()) return;

    const trimmed = text.trim().slice(0, MAX_MSG_LEN);

    // Show locally immediately (no round-trip)
    const msg = new ChatMessage(this._localId, this._username, trimmed);
    this.messages.set(this._localId, msg);

    // Broadcast via the multiplayer channel
    const channel = this.multiplayer.channel;
    if (channel) {
      channel.send({
        type:    'broadcast',
        event:   CHANNEL_EVENT,
        payload: {
          playerId: this._localId,
          username: this._username,
          message:  trimmed,
          time:     Date.now(),
        },
      });
    }
  }

  /**
   * Per-frame update — age messages and prune expired ones.
   * @param {number} deltaTime
   */
  update(deltaTime) {
    for (const [id, msg] of this.messages) {
      msg.age += deltaTime;
      if (!msg.alive) this.messages.delete(id);
    }
  }

  /**
   * Get the active chat message for a given player id, or null.
   * @param {string} playerId
   * @returns {ChatMessage|null}
   */
  getFor(playerId) {
    return this.messages.get(playerId) || null;
  }

  /**
   * Render a chat bubble above an entity's head.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenX   Entity screen X (top-left of sprite)
   * @param {number} screenY   Entity screen Y (top-left of sprite)
   * @param {string} playerId
   * @param {number} spriteW   Entity width (to centre bubble)
   */
  renderBubble(ctx, screenX, screenY, playerId, spriteW = 16) {
    const msg = this.getFor(playerId);
    if (!msg) return;

    const text    = msg.text;
    const alpha   = msg.opacity;
    const cx      = Math.floor(screenX + spriteW / 2);
    const by      = Math.floor(screenY - 28); // above name tag

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font        = '9px monospace';

    // Word-wrap to max 18 chars per line
    const lines = wrapText(text, 18);
    const lineH = 12;
    const padX  = 6, padY = 4;
    const boxW  = Math.max(...lines.map(l => l.length)) * 5.6 + padX * 2;
    const boxH  = lines.length * lineH + padY * 2;

    const bx = cx - boxW / 2;
    const endY = by - boxH;

    // Bubble background
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    _roundRect(ctx, bx, endY, boxW, boxH, 4);
    ctx.fill();

    // Bubble border
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1;
    _roundRect(ctx, bx, endY, boxW, boxH, 4);
    ctx.stroke();

    // Tail triangle
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.beginPath();
    ctx.moveTo(cx - 4, by);
    ctx.lineTo(cx + 4, by);
    ctx.lineTo(cx,     by + 5);
    ctx.closePath();
    ctx.fill();

    // Text lines
    ctx.fillStyle = '#eee';
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.fillText(line, cx, endY + padY + lineH * i + lineH - 3);
    });

    ctx.textAlign = 'left';
    ctx.restore();
  }
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function wrapText(text, maxChars) {
  const words  = text.split(' ');
  const lines  = [];
  let   cur    = '';
  for (const word of words) {
    if ((cur + word).length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = word + ' ';
    } else {
      cur += word + ' ';
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.length ? lines : [text.slice(0, maxChars)];
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}
