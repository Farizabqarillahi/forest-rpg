/**
 * Pathfinding - A* grid pathfinding for NPC navigation
 */
export class Pathfinding {
  constructor(collisionMap, tileSize) {
    this.collisionMap = collisionMap;
    this.tileSize = tileSize;
    this.width = collisionMap[0].length;
    this.height = collisionMap.length;
  }

  /**
   * Find path from start to goal in tile coordinates
   * Returns array of {x, y} tile positions, or null if no path
   */
  findPath(startX, startY, goalX, goalY) {
    if (this.isSolid(goalX, goalY)) return null;

    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const key = (x, y) => `${x},${y}`;
    const heuristic = (x, y) => Math.abs(x - goalX) + Math.abs(y - goalY);

    gScore.set(key(startX, startY), 0);
    fScore.set(key(startX, startY), heuristic(startX, startY));
    openSet.push({ x: startX, y: startY, f: heuristic(startX, startY) });

    let iterations = 0;
    const MAX_ITERATIONS = 500;

    while (openSet.length > 0 && iterations++ < MAX_ITERATIONS) {
      // Get node with lowest fScore
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const ck = key(current.x, current.y);

      if (current.x === goalX && current.y === goalY) {
        // Reconstruct path
        const path = [];
        let cur = ck;
        while (cameFrom.has(cur)) {
          const [cx, cy] = cur.split(',').map(Number);
          path.unshift({ x: cx, y: cy });
          cur = cameFrom.get(cur);
        }
        return path;
      }

      closedSet.add(ck);

      // 4-directional neighbors
      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
      ];

      for (const neighbor of neighbors) {
        const nk = key(neighbor.x, neighbor.y);
        if (closedSet.has(nk)) continue;
        if (this.isSolid(neighbor.x, neighbor.y)) continue;

        const tentativeG = (gScore.get(ck) || 0) + 1;
        if (tentativeG < (gScore.get(nk) || Infinity)) {
          cameFrom.set(nk, ck);
          gScore.set(nk, tentativeG);
          const f = tentativeG + heuristic(neighbor.x, neighbor.y);
          fScore.set(nk, f);

          const inOpen = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
          if (!inOpen) {
            openSet.push({ x: neighbor.x, y: neighbor.y, f });
          }
        }
      }
    }

    return null; // No path found
  }

  isSolid(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    return this.collisionMap[y][x] === 1;
  }

  /**
   * Convert world position to tile coords
   */
  worldToTile(worldX, worldY) {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize),
    };
  }

  /**
   * Convert tile coords to world center position
   */
  tileToWorld(tileX, tileY) {
    return {
      x: tileX * this.tileSize + this.tileSize / 2,
      y: tileY * this.tileSize + this.tileSize / 2,
    };
  }
}
