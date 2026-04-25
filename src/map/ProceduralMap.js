/**
 * ProceduralMap - Generates the tilemap and collision data procedurally
 * from the region definitions in map.json
 */

export class ProceduralMap {
  constructor(mapData) {
    this.width    = mapData.width;
    this.height   = mapData.height;
    this.tileSize = mapData.tileSize;
    this.regions  = mapData.regions;

    // Generate full tile grids
    this.groundData   = this._buildGround();
    this.objectData   = this._buildObjects();
    this.collisionMap = this._buildCollision();
  }

  _buildGround() {
    const grid = Array.from({ length: this.height }, () =>
      new Array(this.width).fill(1) // default grass
    );

    // Border = cliff (tile 3)
    for (let x = 0; x < this.width; x++) { grid[0][x] = 3; grid[this.height - 1][x] = 3; }
    for (let y = 0; y < this.height; y++) { grid[y][0] = 3; grid[y][this.width - 1] = 3; }

    // River — vertical strip
    for (let y = 10; y < 38; y++) {
      for (let x = 22; x <= 25; x++) grid[y][x] = 4; // water
    }
    // Bridge over river
    for (let x = 22; x <= 25; x++) { grid[24][x] = 5; grid[25][x] = 5; }

    // Path from village to bridge
    for (let x = 12; x <= 22; x++) grid[24][x] = 6;
    for (let x = 25; x <= 35; x++) grid[24][x] = 6;

    // Cliff area in south
    for (let y = 36; y < 48; y++) {
      for (let x = 8; x < 28; x++) {
        if (Math.random() < 0.3 && grid[y][x] === 1) grid[y][x] = 3;
      }
    }

    // Deep forest north — darker (use same tile but mark for rendering)
    // (visual handled by renderer tint)

    return grid;
  }

  _buildObjects() {
    const grid = Array.from({ length: this.height }, () =>
      new Array(this.width).fill(0)
    );

    // Scatter trees (tile 2) in forest regions
    const treeRegions = [
      { x: 0, y: 0, w: 8, h: 48 },
      { x: 8, y: 0, w: 16, h: 8 },
      { x: 40, y: 0, w: 24, h: 48 },
    ];

    for (const r of treeRegions) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (x < 1 || y < 1 || x >= this.width - 1 || y >= this.height - 1) continue;
          if (this.groundData[y][x] !== 1) continue;
          // Denser trees in deep forest
          const chance = (y < 8) ? 0.35 : 0.25;
          if (Math.random() < chance) grid[y][x] = 2;
        }
      }
    }

    // Scattered trees in main area
    for (let y = 5; y < 43; y++) {
      for (let x = 8; x < 64; x++) {
        if (grid[y][x] !== 0) continue;
        if (this.groundData[y][x] !== 1) continue;
        // Keep village area clear
        if (x >= 6 && x <= 20 && y >= 6 && y <= 18) continue;
        // Keep river banks clear
        if (x >= 20 && x <= 27 && y >= 8 && y <= 40) continue;
        if (Math.random() < 0.08) grid[y][x] = 2;
      }
    }

    return grid;
  }

  _buildCollision() {
    const col = Array.from({ length: this.height }, (_, y) =>
      Array.from({ length: this.width }, (_, x) => {
        if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) return 1;
        const gt = this.groundData[y][x];
        const ot = this.objectData[y][x];
        if (gt === 3) return 1; // cliff
        if (gt === 4) return 1; // water
        if (ot === 2) return 1; // tree
        return 0;
      })
    );

    // Bridges are walkable
    col[24][22] = 0; col[24][23] = 0; col[24][24] = 0; col[24][25] = 0;
    col[25][22] = 0; col[25][23] = 0; col[25][24] = 0; col[25][25] = 0;

    return col;
  }

  /** Inject generated data back into mapData format for other systems */
  toMapData(originalMapData) {
    return {
      ...originalMapData,
      collisionMap: this.collisionMap,
      layers: [
        { name: 'ground',  zIndex: 0, data: this.groundData  },
        { name: 'objects', zIndex: 1, data: this.objectData  },
      ],
    };
  }
}
