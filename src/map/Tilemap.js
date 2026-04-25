/**
 * Tilemap - Renders JSON tilemap layers with camera culling and z-index support
 */
export class Tilemap {
  constructor(mapData) {
    this.data      = mapData;
    this.tileSize  = mapData.tileSize;
    this.width     = mapData.width;
    this.height    = mapData.height;
    this.layers    = mapData.layers;
    this.collisionMap = mapData.collisionMap;

    this.worldWidth  = this.width  * this.tileSize;
    this.worldHeight = this.height * this.tileSize;
  }

  renderLayer(ctx, assets, layerIndex, camera) {
    const layer = this.layers[layerIndex];
    if (!layer || !layer.data) return;

    const ts = this.tileSize;
    const img = assets.get('tiles');

    const startX = Math.max(0, Math.floor(camera.x / ts));
    const startY = Math.max(0, Math.floor(camera.y / ts));
    const endX   = Math.min(this.width,  Math.ceil((camera.x + camera.viewWidth)  / ts) + 1);
    const endY   = Math.min(this.height, Math.ceil((camera.y + camera.viewHeight) / ts) + 1);

    for (let ty = startY; ty < endY; ty++) {
      const row = layer.data[ty];
      if (!row) continue;
      for (let tx = startX; tx < endX; tx++) {
        const id = row[tx];
        if (id === 0) continue;

        const sx = Math.floor(tx * ts - camera.x);
        const sy = Math.floor(ty * ts - camera.y);

        if (img) {
          ctx.drawImage(img, id * ts, 0, ts, ts, sx, sy, ts, ts);
        } else {
          this._drawFallback(ctx, id, sx, sy, ts);
        }
      }
    }
  }

  _drawFallback(ctx, id, x, y, ts) {
    const colors = {
      1: '#3d7a47', 2: '#2d5a27', 3: '#6b5e4a',
      4: '#0f5a8a', 5: '#8B6914', 6: '#b09060', 7: '#2a5a35',
    };
    ctx.fillStyle = colors[id] || '#333';
    ctx.fillRect(x, y, ts, ts);

    if (id === 1 || id === 7) {
      ctx.fillStyle = id === 7 ? '#357a44' : '#4a9a58';
      ctx.fillRect(x + 4, y + 6, 2, 4);
      ctx.fillRect(x + 10, y + 4, 2, 5);
      ctx.fillRect(x + 18, y + 8, 2, 4);
      ctx.fillRect(x + 24, y + 5, 2, 5);
    } else if (id === 2) {
      ctx.fillStyle = '#5c3a1e'; ctx.fillRect(x + 12, y + 18, 8, 14);
      ctx.fillStyle = '#2a6e2a'; ctx.fillRect(x + 4,  y + 2,  24, 18);
      ctx.fillStyle = '#4aad4c'; ctx.fillRect(x + 8,  y + 6,  16, 12);
    } else if (id === 4) {
      ctx.fillStyle = '#1a7ab8';
      ctx.fillRect(x + 2, y + 6, 12, 2);
      ctx.fillRect(x + 18, y + 14, 10, 2);
    } else if (id === 5) {
      ctx.fillStyle = '#1a7ab8'; ctx.fillRect(x, y, ts, ts);
      ctx.fillStyle = '#7a5220'; ctx.fillRect(x, y + 8, ts, 16);
      ctx.fillStyle = '#9a6a2a';
      for (let p = 0; p < 4; p++) ctx.fillRect(x, y + 9 + p * 4, ts, 3);
    }
  }

  get layerCount() { return this.layers.length; }
}
