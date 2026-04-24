/**
 * Camera - Smooth follow camera clamped to map bounds
 */
export class Camera {
  constructor(viewWidth, viewHeight, mapWidth, mapHeight) {
    this.x = 0;
    this.y = 0;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.smoothing = 0.1; // Lower = smoother but slower
  }

  resize(w, h) {
    this.viewWidth = w;
    this.viewHeight = h;
  }

  /**
   * Smoothly follow a target position (e.g., player center)
   * @param {number} targetX - world x to center on
   * @param {number} targetY - world y to center on
   */
  follow(targetX, targetY) {
    const desiredX = targetX - this.viewWidth / 2;
    const desiredY = targetY - this.viewHeight / 2;

    // Lerp towards target
    this.x += (desiredX - this.x) * this.smoothing;
    this.y += (desiredY - this.y) * this.smoothing;

    // Clamp to map bounds
    this.x = Math.max(0, Math.min(this.x, this.mapWidth - this.viewWidth));
    this.y = Math.max(0, Math.min(this.y, this.mapHeight - this.viewHeight));
  }

  /**
   * Snap camera instantly to target (no lerp)
   */
  snapTo(targetX, targetY) {
    this.x = Math.max(0, Math.min(targetX - this.viewWidth / 2, this.mapWidth - this.viewWidth));
    this.y = Math.max(0, Math.min(targetY - this.viewHeight / 2, this.mapHeight - this.viewHeight));
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }

  /**
   * Check if a world rect is visible in the camera view
   */
  isVisible(worldX, worldY, width, height) {
    return (
      worldX + width > this.x &&
      worldX < this.x + this.viewWidth &&
      worldY + height > this.y &&
      worldY < this.y + this.viewHeight
    );
  }
}
