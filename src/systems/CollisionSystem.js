/**
 * CollisionSystem - AABB collision detection against tilemap
 */
export class CollisionSystem {
  constructor(mapData) {
    this.collisionMap = mapData.collisionMap;
    this.tileSize = mapData.tileSize;
    this.mapWidth = mapData.width;
    this.mapHeight = mapData.height;
  }

  /**
   * Check if a tile at grid coords is solid
   */
  isTileSolid(tileX, tileY) {
    if (tileX < 0 || tileY < 0 || tileX >= this.mapWidth || tileY >= this.mapHeight) {
      return true; // Out of bounds = solid
    }
    return this.collisionMap[tileY][tileX] === 1;
  }

  /**
   * Check if a world AABB rect would collide with the tilemap
   * Returns { collides, resolvedX, resolvedY }
   */
  checkAndResolve(x, y, width, height) {
    const ts = this.tileSize;
    // Check corners of the entity hitbox
    const points = [
      { x: x + 2,         y: y + height * 0.6 },          // top-left
      { x: x + width - 2, y: y + height * 0.6 },          // top-right
      { x: x + 2,         y: y + height - 1 },             // bottom-left
      { x: x + width - 2, y: y + height - 1 },             // bottom-right
    ];

    let collides = false;
    for (const p of points) {
      const tx = Math.floor(p.x / ts);
      const ty = Math.floor(p.y / ts);
      if (this.isTileSolid(tx, ty)) {
        collides = true;
        break;
      }
    }

    return collides;
  }

  /**
   * Separate movement into X and Y axes for sliding collision
   */
  resolveMovement(entity, dx, dy) {
    const { x, y, width, height } = entity;

    // Try X movement
    const newX = x + dx;
    const collidesX = this.checkAndResolve(newX, y, width, height);
    const resolvedX = collidesX ? x : newX;

    // Try Y movement
    const newY = y + dy;
    const collidesY = this.checkAndResolve(resolvedX, newY, width, height);
    const resolvedY = collidesY ? y : newY;

    return { x: resolvedX, y: resolvedY };
  }

  /**
   * Check AABB overlap between two entities
   */
  static overlaps(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /**
   * Get distance between two entity centers
   */
  static distance(a, b) {
    const ax = a.x + a.width / 2;
    const ay = a.y + a.height / 2;
    const bx = b.x + b.width / 2;
    const by = b.y + b.height / 2;
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  }
}
