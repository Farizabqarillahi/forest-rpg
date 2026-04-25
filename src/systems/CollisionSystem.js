/**
 * CollisionSystem - AABB tile collision with sliding resolution
 */
export class CollisionSystem {
  constructor(mapData) {
    this.collisionMap = mapData.collisionMap;
    this.tileSize     = mapData.tileSize;
    this.mapWidth     = mapData.width;
    this.mapHeight    = mapData.height;
  }

  isTileSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return true;
    const row = this.collisionMap[ty];
    return row ? row[tx] === 1 : true;
  }

  _collidesAt(x, y, width, height) {
    const ts = this.tileSize;
    // Check four bottom corners (where feet are for top-down)
    const pts = [
      { x: x + 2,         y: y + height * 0.55 },
      { x: x + width - 2, y: y + height * 0.55 },
      { x: x + 2,         y: y + height - 1 },
      { x: x + width - 2, y: y + height - 1 },
    ];
    for (const p of pts) {
      if (this.isTileSolid(Math.floor(p.x / ts), Math.floor(p.y / ts))) return true;
    }
    return false;
  }

  resolveMovement(entity, dx, dy) {
    const { x, y, width, height } = entity;

    // X axis
    const nx = x + dx;
    const resolvedX = this._collidesAt(nx, y, width, height) ? x : nx;

    // Y axis (use resolved X)
    const ny = y + dy;
    const resolvedY = this._collidesAt(resolvedX, ny, width, height) ? y : ny;

    return { x: resolvedX, y: resolvedY };
  }

  static overlaps(a, b) {
    return a.x < b.x + b.width  &&
           a.x + a.width  > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  static distance(a, b) {
    return Math.hypot(
      (a.x + a.width  / 2) - (b.x + b.width  / 2),
      (a.y + a.height / 2) - (b.y + b.height / 2)
    );
  }
}
