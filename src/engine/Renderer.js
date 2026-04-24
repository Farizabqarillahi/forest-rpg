/**
 * Renderer - Handles canvas setup and draw utilities
 * Enforces pixel-perfect rendering with disabled image smoothing
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupPixelPerfect();
  }

  setupPixelPerfect() {
    const ctx = this.ctx;
    // Disable all image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.setupPixelPerfect();
  }

  clear(color = '#000') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw a portion of a sprite sheet at world position offset by camera
   */
  drawSprite(image, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (!image) return;
    this.ctx.drawImage(image, sx, sy, sw, sh, Math.floor(dx), Math.floor(dy), dw, dh);
  }

  /**
   * Draw a filled rectangle
   */
  fillRect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  }

  /**
   * Draw pixel-art text
   */
  drawText(text, x, y, color = '#fff', size = 12, font = 'monospace') {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px ${font}`;
    this.ctx.fillText(text, Math.floor(x), Math.floor(y));
  }

  /**
   * Apply a tint overlay (e.g., for day/night cycle)
   */
  applyTint(color, alpha) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  save() { this.ctx.save(); }
  restore() { this.ctx.restore(); }
  translate(x, y) { this.ctx.translate(Math.floor(x), Math.floor(y)); }
}
