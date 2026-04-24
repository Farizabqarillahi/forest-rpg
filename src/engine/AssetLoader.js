/**
 * AssetLoader - Loads and caches game assets.
 * Falls back to rich procedurally-generated pixel art when files are missing.
 */
export class AssetLoader {
  constructor() {
    this.images = new Map();
    this.data = new Map();
  }

  loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images.set(key, img); resolve(img); };
      img.onerror = () => {
        const fallback = this.createFallbackImage(key);
        this.images.set(key, fallback);
        resolve(fallback);
      };
      img.src = src;
    });
  }

  get(key) { return this.images.get(key) || null; }
  getData(key) { return this.data.get(key) || null; }

  async loadAll() {
    const assets = [
      { key: 'tiles',        src: '/assets/tiles.png' },
      { key: 'player',       src: '/assets/player.png' },
      { key: 'npc_elder',    src: '/assets/npc_elder.png' },
      { key: 'npc_merchant', src: '/assets/npc_merchant.png' },
      { key: 'items',        src: '/assets/items.png' },
    ];
    await Promise.all(assets.map(({ key, src }) => this.loadImage(key, src)));
    return true;
  }

  createFallbackImage(key) {
    if (key === 'tiles')        return this.buildTileSheet();
    if (key === 'player')       return this.buildCharSheet('#4a9eed', '#8B4513', false);
    if (key === 'npc_elder')    return this.buildCharSheet('#7a3a8a', '#c8c8c8', true);
    if (key === 'npc_merchant') return this.buildCharSheet('#2e7d32', '#4a2c00', false);
    if (key === 'items')        return this.buildItemSheet();
    return this.blank(16, 16);
  }

  blank(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  px(ctx, color, x, y, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  buildTileSheet() {
    const TS = 32, TILES = 7;
    const c = document.createElement('canvas');
    c.width = TS * TILES; c.height = TS;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    this.drawGrassTile(ctx, 0 * TS, TS);
    this.drawGrassTile(ctx, 1 * TS, TS);
    this.drawTreeTile(ctx,  2 * TS, TS);
    this.drawCliffTile(ctx, 3 * TS, TS);
    this.drawWaterTile(ctx, 4 * TS, TS);
    this.drawBridgeTile(ctx,5 * TS, TS);
    this.drawPathTile(ctx,  6 * TS, TS);
    return c;
  }

  drawGrassTile(ctx, ox, TS) {
    this.px(ctx, '#3d7a47', ox, 0, TS, TS);
    for (let i = 0; i < 18; i++) {
      const gx = ox + (i * 19 % (TS - 4));
      const gy = (i * 11 % (TS - 6));
      this.px(ctx, i % 3 === 0 ? '#4a9a58' : '#5ab068', gx, gy, 2, 3);
    }
    for (let i = 0; i < 10; i++) {
      this.px(ctx, '#2d6238', ox + (i * 29 % (TS - 2)), (i * 17 % (TS - 4)), 1, 2);
    }
  }

  drawTreeTile(ctx, ox, TS) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(ox + 8, 22, 16, 8);
    this.px(ctx, '#5c3a1e', ox + 12, 18, 8, 14);
    this.px(ctx, '#7a4e28', ox + 13, 18, 4, 12);
    this.px(ctx, '#1e4d1e', ox + 2,  2, 28, 18);
    this.px(ctx, '#2a6e2a', ox + 4,  4, 24, 14);
    this.px(ctx, '#38913a', ox + 6,  6, 20, 10);
    this.px(ctx, '#4aad4c', ox + 9,  8, 14,  6);
    this.px(ctx, '#5cc05e', ox + 11, 9,  8,  4);
    this.px(ctx, '#7dd87e', ox + 13, 10, 4,  2);
    this.px(ctx, '#163d16', ox + 2,  2, 1, 18);
    this.px(ctx, '#163d16', ox + 29, 2, 1, 18);
  }

  drawCliffTile(ctx, ox, TS) {
    this.px(ctx, '#6b5e4a', ox, 0, TS, TS);
    for (let row = 0; row < 4; row++) {
      this.px(ctx, '#4a3d2e', ox, row * 8, TS, 1);
      const off = row % 2 === 0 ? 0 : 8;
      for (let col = 0; col < 5; col++) {
        this.px(ctx, '#4a3d2e', ox + (col * 8 + off) % TS, row * 8, 1, 8);
      }
    }
    for (let row = 0; row < 4; row++) {
      const off = row % 2 === 0 ? 0 : 8;
      for (let col = 0; col < 4; col++) {
        const bx = ox + (col * 8 + off + 1) % TS;
        this.px(ctx, '#8a7860', bx, row * 8 + 2, 5, 1);
      }
    }
    this.px(ctx, '#9a8a6e', ox, 0, TS, 2);
  }

  drawWaterTile(ctx, ox, TS) {
    this.px(ctx, '#0f5a8a', ox, 0, TS, TS);
    this.px(ctx, '#1a7ab8', ox + 2,  5, 12, 2);
    this.px(ctx, '#27a0e0', ox + 3,  6,  8, 1);
    this.px(ctx, '#1a7ab8', ox + 18, 14, 10, 2);
    this.px(ctx, '#27a0e0', ox + 19, 15,  6, 1);
    this.px(ctx, '#1a7ab8', ox + 2,  22, 16, 2);
    this.px(ctx, '#27a0e0', ox + 4,  23, 12, 1);
    this.px(ctx, '#aaddff', ox + 6,  6, 1, 1);
    this.px(ctx, '#aaddff', ox + 20, 15, 1, 1);
    this.px(ctx, '#aaddff', ox + 8,  23, 1, 1);
  }

  drawBridgeTile(ctx, ox, TS) {
    this.drawWaterTile(ctx, ox, TS);
    this.px(ctx, '#7a5220', ox, 8, TS, 16);
    for (let p = 0; p < 4; p++) {
      const py = 9 + p * 4;
      this.px(ctx, '#9a6a2a', ox, py, TS, 3);
      this.px(ctx, '#b8843a', ox + 2, py, TS - 4, 1);
      this.px(ctx, '#5c3a14', ox, py + 3, TS, 1);
    }
    this.px(ctx, '#5c3a14', ox + 2, 0, 3, 10);
    this.px(ctx, '#7a5220', ox + 3, 0, 1, 10);
    this.px(ctx, '#5c3a14', ox + TS - 5, 0, 3, 10);
    this.px(ctx, '#5c3a14', ox + 2, 22, 3, 10);
    this.px(ctx, '#5c3a14', ox + TS - 5, 22, 3, 10);
    this.px(ctx, '#5c3a14', ox, 8, TS, 2);
    this.px(ctx, '#5c3a14', ox, 22, TS, 2);
  }

  drawPathTile(ctx, ox, TS) {
    this.px(ctx, '#b09060', ox, 0, TS, TS);
    const pebbles = [[4,4],[10,8],[18,3],[24,10],[6,16],[14,20],[22,14],[28,22],[2,26],[12,12],[20,26]];
    for (const [px_, py_] of pebbles) {
      this.px(ctx, '#8a7050', ox + px_, py_, 3, 2);
      this.px(ctx, '#c8a870', ox + px_ + 1, py_, 1, 1);
    }
    this.px(ctx, '#987850', ox + 8, 0, 3, TS);
    this.px(ctx, '#987850', ox + 20, 0, 3, TS);
  }

  buildCharSheet(bodyColor, hairColor, isElder) {
    const FW = 16, FH = 16, FRAMES = 3, DIRS = 4;
    const c = document.createElement('canvas');
    c.width = FW * FRAMES; c.height = FH * DIRS;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const skinColor = '#f5c5a0', legColor = '#2c3e6e', shoeColor = '#1a1a2e';
    const dirs = ['down', 'up', 'left', 'right'];

    dirs.forEach((dir, di) => {
      for (let f = 0; f < FRAMES; f++) {
        const ox = f * FW, oy = di * FH;
        const legSwing = f === 0 ? 0 : f === 1 ? -1 : 1;

        // Body
        this.px(ctx, bodyColor, ox + 4, oy + 7, 8, 7);
        this.px(ctx, '#3a2a14', ox + 4, oy + 10, 8, 1);
        this.px(ctx, '#8a6a30', ox + 7, oy + 10, 2, 1);

        // Legs & shoes
        this.px(ctx, legColor, ox + 4, oy + 13, 3, 2 + legSwing);
        this.px(ctx, legColor, ox + 9, oy + 13, 3, 2 - legSwing);
        this.px(ctx, shoeColor, ox + 4, oy + 14 + Math.max(0, legSwing), 3, 1);
        this.px(ctx, shoeColor, ox + 9, oy + 14 + Math.max(0, -legSwing), 3, 1);

        // Head + hair
        this.px(ctx, skinColor, ox + 4, oy + 1, 8, 7);
        if (dir === 'up') {
          this.px(ctx, hairColor, ox + 4, oy + 1, 8, 4);
        } else if (dir === 'down') {
          this.px(ctx, hairColor, ox + 4, oy + 1, 8, 2);
          this.px(ctx, hairColor, ox + 4, oy + 1, 2, 4);
          this.px(ctx, hairColor, ox + 10, oy + 1, 2, 4);
        } else {
          this.px(ctx, hairColor, ox + 4, oy + 1, 8, 3);
          this.px(ctx, hairColor, dir === 'left' ? ox + 4 : ox + 10, oy + 1, 2, 5);
        }

        // Eyes
        if (dir !== 'up') {
          if (dir === 'right')     this.px(ctx, '#1a1a3a', ox + 10, oy + 5, 2, 1);
          else if (dir === 'left') this.px(ctx, '#1a1a3a', ox + 4,  oy + 5, 2, 1);
          else {
            this.px(ctx, '#1a1a3a', ox + 5, oy + 5, 2, 1);
            this.px(ctx, '#1a1a3a', ox + 9, oy + 5, 2, 1);
          }
        }

        // Elder extras
        if (isElder) {
          this.px(ctx, '#5a2a7a', ox + 3, oy + 7, 10, 7);
          this.px(ctx, '#7a3a9a', ox + 4, oy + 8,  3, 5);
          this.px(ctx, '#8B6914', ox + 13, oy + 4, 1, 11);
          this.px(ctx, '#c8a830', ox + 12, oy + 3, 3, 2);
          if (dir === 'down') {
            this.px(ctx, '#d0d0d0', ox + 5, oy + 7, 6, 3);
            this.px(ctx, '#e8e8e8', ox + 6, oy + 7, 4, 2);
          }
        }
      }
    });
    return c;
  }

  buildItemSheet() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 16;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Sword (0–15)
    this.px(ctx, '#c8c8d8', 7, 1, 2, 10);
    this.px(ctx, '#e8e8f8', 8, 1, 1, 8);
    this.px(ctx, '#888898', 7, 9, 2, 3);
    this.px(ctx, '#c8a820', 4, 7, 8, 2);
    this.px(ctx, '#8B6914', 7, 11, 2, 4);
    this.px(ctx, '#ffd700', 7, 14, 2, 2);

    // Health Potion (16–31)
    const p = 16;
    this.px(ctx, '#cc2222', p+4,  6, 8, 8);
    this.px(ctx, '#ee4444', p+5,  7, 5, 5);
    this.px(ctx, '#ff9999', p+5,  7, 2, 2);
    this.px(ctx, '#884422', p+5,  4, 6, 3);
    this.px(ctx, '#996633', p+6,  3, 4, 2);

    // Wood (32–47)
    const w = 32;
    this.px(ctx, '#6b4110', w+2,  5, 12, 7);
    this.px(ctx, '#8B5a20', w+2,  5, 12, 2);
    this.px(ctx, '#4a2c08', w+2, 10, 12, 2);
    this.px(ctx, '#c8a060', w+2,  5, 2, 7);
    this.px(ctx, '#e0c080', w+3,  6, 1, 5);
    this.px(ctx, '#c8a060', w+12, 5, 2, 7);
    this.px(ctx, '#5a3510', w+3,  7, 1, 3);

    // Stone (48–63)
    const s = 48;
    this.px(ctx, '#707070', s+2,  5, 12, 9);
    this.px(ctx, '#909090', s+3,  6,  8, 4);
    this.px(ctx, '#b0b0b0', s+4,  7,  4, 2);
    this.px(ctx, '#505050', s+2, 12, 12, 2);

    return c;
  }
}
