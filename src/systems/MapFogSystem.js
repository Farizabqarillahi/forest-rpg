/**
 * MapFogSystem - Tracks explored tiles and renders fog-of-war on the world map UI
 */

export class MapFogSystem {
  constructor(mapWidth, mapHeight, chunkSize = 4) {
    this.mapWidth  = mapWidth;
    this.mapHeight = mapHeight;
    this.chunkSize = chunkSize; // Tiles per fog chunk
    this.chunksX   = Math.ceil(mapWidth  / chunkSize);
    this.chunksY   = Math.ceil(mapHeight / chunkSize);

    // Bit-array: 1 = explored, 0 = unexplored
    this.explored  = new Uint8Array(this.chunksX * this.chunksY);

    // Vision radius in tiles
    this.visionRadius = 5;
  }

  /** Update exploration based on player tile position */
  updateExploration(playerTileX, playerTileY) {
    const r = this.visionRadius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const tx = playerTileX + dx;
        const ty = playerTileY + dy;
        const cx = Math.floor(tx / this.chunkSize);
        const cy = Math.floor(ty / this.chunkSize);
        if (cx >= 0 && cy >= 0 && cx < this.chunksX && cy < this.chunksY) {
          this.explored[cy * this.chunksX + cx] = 1;
        }
      }
    }
  }

  isExplored(chunkX, chunkY) {
    if (chunkX < 0 || chunkY < 0 || chunkX >= this.chunksX || chunkY >= this.chunksY) return false;
    return this.explored[chunkY * this.chunksX + chunkX] === 1;
  }

  isWorldPosExplored(worldX, worldY, tileSize) {
    const tileX = Math.floor(worldX / tileSize);
    const tileY = Math.floor(worldY / tileSize);
    const cx = Math.floor(tileX / this.chunkSize);
    const cy = Math.floor(tileY / this.chunkSize);
    return this.isExplored(cx, cy);
  }

  get exploredPercent() {
    const total = this.explored.length;
    const done  = this.explored.reduce((s, v) => s + v, 0);
    return Math.round((done / total) * 100);
  }

  serialize() { return { explored: Array.from(this.explored) }; }

  deserialize(data) {
    if (data && data.explored) {
      this.explored = new Uint8Array(data.explored);
    }
  }
}
