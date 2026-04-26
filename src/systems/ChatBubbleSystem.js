/**
 * ChatBubbleSystem - Attaches chat messages to player entities and renders
 * text bubbles above their sprites directly on canvas.
 *
 * NO database. NO UI panel. Bubbles only.
 *
 * How it works:
 *   1. Local player sends → broadcast payload via MultiplayerSystem channel
 *   2. setMessage() called on local Player entity immediately (no round trip)
 *   3. Remote clients receive broadcast → setMessage() on the matching RemotePlayer
 *   4. Both Player and RemotePlayer expose: chatMessage, chatTimestamp
 *   5. renderBubble() draws above the entity's head each frame if message < 15s old
 */

const BUBBLE_TTL_MS  = 15_000;  // 15 seconds
const MAX_CHARS      = 120;
const CHARS_PER_LINE = 22;       // wrap width
const LINE_HEIGHT    = 12;
const FONT           = '9px monospace';
const FADE_START_MS  = 12_000;   // start fading 3s before expiry

export class ChatBubbleSystem {
  /**
   * @param {import('./MultiplayerSystem.js').MultiplayerSystem} multiplayer
   */
  constructor(multiplayer) {
    this.multiplayer = multiplayer;
  }

  // ── Message attachment ────────────────────────────────────────────

  /**
   * Attach a chat message to any entity that has chatMessage / chatTimestamp.
   * Works for Player, RemotePlayer, and anything else that holds those fields.
   */
  static setMessage(entity, text) {
    entity.chatMessage   = String(text).slice(0, MAX_CHARS);
    entity.chatTimestamp = Date.now();
  }

  static clearMessage(entity) {
    entity.chatMessage   = null;
    entity.chatTimestamp = 0;
  }

  static isAlive(entity) {
    return entity.chatMessage &&
      Date.now() - entity.chatTimestamp < BUBBLE_TTL_MS;
  }

  // ── Send (local player) ───────────────────────────────────────────

  /**
   * Send a chat message:
   *  1. Attach to local player entity immediately
   *  2. Broadcast via realtime channel
   */
  send(text, localPlayer, localId, username) {
    if (!text || !text.trim()) return;
    const trimmed = text.trim().slice(0, MAX_CHARS);

    // Attach to local entity so it renders immediately
    ChatBubbleSystem.setMessage(localPlayer, trimmed);

    // Broadcast — other clients will attach to their RemotePlayer copy
    const channel = this.multiplayer.channel;
    if (channel) {
      channel.send({
        type:    'broadcast',
        event:   'chat',
        payload: {
          playerId: localId,
          username,
          message:  trimmed,
        },
      });
    }
  }

  // ── Receive (remote player) ───────────────────────────────────────

  /**
   * Called by MultiplayerSystem when a 'chat' broadcast arrives.
   * Finds the matching RemotePlayer and attaches the message.
   */
  onReceive(payload, remotePlayers) {
    if (!payload?.playerId || !payload?.message) return;
    const rp = remotePlayers.get(payload.playerId);
    if (rp) ChatBubbleSystem.setMessage(rp, payload.message);
  }

  // ── Canvas render ─────────────────────────────────────────────────

  /**
   * Render a chat bubble above an entity.
   * Call once per entity per frame AFTER the sprite is drawn.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenX   Top-left X of sprite on screen
   * @param {number} screenY   Top-left Y of sprite on screen
   * @param {number} spriteW   Sprite width (used to horizontally centre bubble)
   * @param {object} entity    Any object with chatMessage / chatTimestamp
   */
  static renderBubble(ctx, screenX, screenY, spriteW, entity) {
    if (!ChatBubbleSystem.isAlive(entity)) return;

    const elapsed = Date.now() - entity.chatTimestamp;
    const alpha   = elapsed < FADE_START_MS
      ? 1
      : Math.max(0, 1 - (elapsed - FADE_START_MS) / (BUBBLE_TTL_MS - FADE_START_MS));

    if (alpha <= 0) return;

    const lines  = _wrapText(entity.chatMessage, CHARS_PER_LINE);
    const cx     = Math.floor(screenX + spriteW / 2);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font        = FONT;

    // Measure
    const lineWidths = lines.map(l => ctx.measureText(l).width);
    const boxW  = Math.max(...lineWidths) + 10;
    const boxH  = lines.length * LINE_HEIGHT + 8;
    const bx    = cx - boxW / 2;
    const by    = screenY - boxH - 10; // 10px gap above name tag area

    // Background
    ctx.fillStyle = 'rgba(10,10,20,0.82)';
    _roundRect(ctx, bx, by, boxW, boxH, 5);
    ctx.fill();

    // Border (subtle)
    ctx.strokeStyle = 'rgba(200,220,200,0.22)';
    ctx.lineWidth   = 1;
    _roundRect(ctx, bx, by, boxW, boxH, 5);
    ctx.stroke();

    // Tail
    ctx.fillStyle = 'rgba(10,10,20,0.82)';
    ctx.beginPath();
    ctx.moveTo(cx - 4, by + boxH);
    ctx.lineTo(cx + 4, by + boxH);
    ctx.lineTo(cx,     by + boxH + 5);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.fillStyle = '#e8f0e8';
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.fillText(line, cx, by + 6 + LINE_HEIGHT * i + LINE_HEIGHT - 2);
    });

    ctx.textAlign = 'left';
    ctx.restore();
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function _wrapText(text, maxChars) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    if (cur.length && (cur + word).length > maxChars) {
      lines.push(cur.trimEnd());
      cur = '';
    }
    cur += word + ' ';
  }
  if (cur.trim()) lines.push(cur.trimEnd());
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
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}
