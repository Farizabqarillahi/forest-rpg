/**
 * RemotePlayer - A networked player controlled by another client.
 * Receives position updates and smoothly interpolates to them.
 * Cannot be controlled by local input.
 */
export class RemotePlayer {
  constructor(id, initialData) {
    this.id       = id;
    this.username = initialData.username || 'Traveler';

    // Current rendered position (interpolated)
    this.x = initialData.x || 0;
    this.y = initialData.y || 0;

    // Target position (latest from network)
    this._targetX = this.x;
    this._targetY = this.y;

    this.width  = 16;
    this.height = 16;
    this.facing = initialData.dir || 'down';
    this.animState = initialData.state || 'idle';

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
    this.animSpeed = 0.18;

    // Interpolation speed — higher = snappier (0-1 per frame)
    this.lerpSpeed = 0.18;

    // Timeout: remove remote player if no update for 8s
    this.lastUpdate = Date.now();
    this.timeout    = 8000;
  }

  /** Receive a network update — set target, don't teleport */
  applyUpdate(data) {
    this._targetX  = data.x   ?? this._targetX;
    this._targetY  = data.y   ?? this._targetY;
    this.facing    = data.dir ?? this.facing;
    this.animState = data.state ?? this.animState;
    this.username  = data.username ?? this.username;
    this.lastUpdate = Date.now();
  }

  /** Returns true if this remote player has timed out */
  get isStale() { return Date.now() - this.lastUpdate > this.timeout; }

  update(deltaTime) {
    // Smooth interpolation toward network target
    this.x += (this._targetX - this.x) * this.lerpSpeed;
    this.y += (this._targetY - this.y) * this.lerpSpeed;

    // Animate when moving
    const moving = this.animState === 'walking' || this.animState === 'attacking';
    if (moving) {
      this.animTimer += deltaTime;
      if (this.animTimer >= this.animSpeed) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 3;
      }
    } else {
      this.animFrame = 0;
      this.animTimer = 0;
    }
  }

  getSpriteRect() {
    const dirMap = { down: 0, up: 1, left: 2, right: 3 };
    return {
      sx: this.animFrame * 16,
      sy: (dirMap[this.facing] || 0) * 16,
      sw: 16, sh: 16,
    };
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }

  /** Render this remote player on canvas */
  render(ctx, camera, assets) {
    if (!camera.isVisible(this.x, this.y, this.width, this.height)) return;

    const sp = camera.worldToScreen(this.x, this.y);
    const sx = Math.floor(sp.x);
    const sy = Math.floor(sp.y);

    const img  = assets.get('player');
    const rect = this.getSpriteRect();
    const scale = 2;
    const rw = rect.sw * scale, rh = rect.sh * scale;

    // Tinted blue to distinguish from local player
    ctx.save();
    ctx.filter = 'hue-rotate(180deg) saturate(1.4)';

    if (img) {
      ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh,
        sx - rw / 2 + this.width / 2,
        sy - rh + this.height,
        rw, rh);
    } else {
      // Fallback box
      ctx.fillStyle = '#44aaff';
      ctx.fillRect(sx + 2, sy, 12, 14);
      ctx.fillStyle = '#ffd4b0';
      ctx.fillRect(sx + 3, sy - 7, 10, 8);
    }
    ctx.restore();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + this.width / 2, sy + this.height, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Username tag
    const nameW = this.username.length * 5 + 8;
    ctx.fillStyle = 'rgba(0,0,50,0.7)';
    ctx.fillRect(sx + this.width / 2 - nameW / 2, sy - 22, nameW, 11);
    ctx.fillStyle = '#88ccff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.username, sx + this.width / 2, sy - 13);
    ctx.textAlign = 'left';
  }
}
