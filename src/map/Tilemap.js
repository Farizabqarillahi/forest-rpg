/**
 * Tilemap - Loads and renders a JSON tilemap with layering support
 * Tile IDs:
 *   0 = empty/transparent
 *   1 = grass
 *   2 = tree
 *   3 = cliff/border
 *   4 = water
 *   5 = bridge
 *   6 = path
 */
export class Tilemap {
  constructor(mapData) {
    this.data = mapData;
    this.tileSize = mapData.tileSize;
    this.width = mapData.width;
    this.height = mapData.height;
    this.layers = mapData.layers;
    this.collisionMap = mapData.collisionMap;

    // Total world size in pixels
    this.worldWidth = this.width * this.tileSize;
    this.worldHeight = this.height * this.tileSize;
  }

  /**
   * Render a specific layer with camera offset
   * Only renders tiles visible in the camera viewport
   */
  renderLayer(ctx, assets, layerIndex, camera) {
    const layer = this.layers[layerIndex];
    if (!layer) return;

    const ts = this.tileSize;
    const tileImg = assets.get('tiles');

    // Calculate visible tile range
    const startX = Math.max(0, Math.floor(camera.x / ts));
    const startY = Math.max(0, Math.floor(camera.y / ts));
    const endX = Math.min(this.width, Math.ceil((camera.x + camera.viewWidth) / ts) + 1);
    const endY = Math.min(this.height, Math.ceil((camera.y + camera.viewHeight) / ts) + 1);

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const tileId = layer.data[ty][tx];
        if (tileId === 0) continue;

        const screenX = tx * ts - camera.x;
        const screenY = ty * ts - camera.y;

        if (tileImg) {
          // Sprite sheet: tiles are 32px wide, laid out horizontally by tileId
          const srcX = tileId * ts;
          ctx.drawImage(tileImg, srcX, 0, ts, ts, Math.floor(screenX), Math.floor(screenY), ts, ts);
        } else {
          // Fallback procedural rendering
          this.renderTileFallback(ctx, tileId, screenX, screenY, ts);
        }
      }
    }
  }

  /**
   * Procedural tile rendering fallback when no sprite sheet is loaded
   */
  renderTileFallback(ctx, tileId, x, y, ts) {
    const colors = {
      1: '#4a7c59', // grass
      2: '#2d5a27', // tree
      3: '#7a6a50', // cliff
      4: '#1a6b9a', // water
      5: '#8B6914', // bridge
      6: '#c4a96a', // path
    };

    ctx.fillStyle = colors[tileId] || '#333';
    ctx.fillRect(Math.floor(x), Math.floor(y), ts, ts);

    // Add visual detail
    if (tileId === 1) {
      // Grass texture
      ctx.fillStyle = '#5a9c6c';
      ctx.fillRect(Math.floor(x + 4), Math.floor(y + 6), 2, 4);
      ctx.fillRect(Math.floor(x + 10), Math.floor(y + 4), 2, 5);
      ctx.fillRect(Math.floor(x + 18), Math.floor(y + 8), 2, 4);
      ctx.fillRect(Math.floor(x + 24), Math.floor(y + 5), 2, 5);
    } else if (tileId === 2) {
      // Tree: trunk + canopy
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(Math.floor(x + 12), Math.floor(y + 18), 8, 14);
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(Math.floor(x + 4), Math.floor(y + 2), 24, 20);
      ctx.fillStyle = '#3a7a35';
      ctx.fillRect(Math.floor(x + 8), Math.floor(y + 6), 16, 14);
    } else if (tileId === 3) {
      // Cliff pattern
      ctx.fillStyle = '#9a8a68';
      for (let cy = 0; cy < 4; cy++) {
        for (let cx = 0; cx < 4; cx++) {
          if ((cx + cy) % 2 === 0) {
            ctx.fillRect(Math.floor(x + cx * 8), Math.floor(y + cy * 8), 8, 8);
          }
        }
      }
    } else if (tileId === 4) {
      // Water animation
      const t = Date.now() / 1000;
      ctx.fillStyle = '#2a8bc4';
      ctx.fillRect(Math.floor(x + 2), Math.floor(y + 8 + Math.sin(t + x * 0.1) * 2), 28, 4);
      ctx.fillRect(Math.floor(x + 4), Math.floor(y + 18 + Math.sin(t + x * 0.1 + 1) * 2), 24, 4);
    } else if (tileId === 5) {
      // Bridge planks over water
      ctx.fillStyle = '#1a6b9a';
      ctx.fillRect(Math.floor(x), Math.floor(y), ts, ts);
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(Math.floor(x), Math.floor(y + 8), ts, 16);
      ctx.fillStyle = '#a07820';
      for (let b = 0; b < 4; b++) {
        ctx.fillRect(Math.floor(x + b * 8), Math.floor(y + 10), 6, 12);
      }
    }
  }

  /**
   * Get number of layers
   */
  get layerCount() {
    return this.layers.length;
  }
}
