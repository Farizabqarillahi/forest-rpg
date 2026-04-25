/**
 * AssetLoader - Loads game assets, falls back to procedural pixel-art sprites.
 */
export class AssetLoader {
  constructor() {
    this.images = new Map();
  }

  loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload  = () => { this.images.set(key, img); resolve(img); };
      img.onerror = () => {
        const fb = this.createFallback(key);
        this.images.set(key, fb);
        resolve(fb);
      };
      img.src = src;
    });
  }

  get(key) { return this.images.get(key) || null; }

  async loadAll() {
    const assets = [
      'tiles', 'player',
      'npc_elder', 'npc_merchant', 'npc_guard', 'npc_healer', 'items',
    ];
    await Promise.all(assets.map(k => this.loadImage(k, `/assets/${k}.png`)));
    return true;
  }

  /* ── Fallback factory ─────────────────────────────────────────── */
  createFallback(key) {
    if (key === 'tiles')        return this.buildTileSheet();
    if (key === 'player')       return this.buildCharSheet({ body:'#4a9eed', hair:'#8B4513' });
    if (key === 'npc_elder')    return this.buildCharSheet({ body:'#7a3a8a', hair:'#c8c8c8', elder:true });
    if (key === 'npc_merchant') return this.buildCharSheet({ body:'#2e7d32', hair:'#4a2c00', vest:'#8B6914' });
    if (key === 'npc_guard')    return this.buildCharSheet({ body:'#3a4a8a', hair:'#333',    armor:'#888' });
    if (key === 'npc_healer')   return this.buildCharSheet({ body:'#8a2a6a', hair:'#ffddaa', robe:true });
    if (key === 'items')        return this.buildItemSheet();
    return this.blankCanvas(16, 16);
  }

  blankCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h; return c;
  }

  /** Helper: fill a pixel rect */
  px(ctx, color, x, y, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  /* ══════════════════════════════════════════════════════════════
     TILE SHEET  — 8 tiles × 32 px wide, 32 px tall
     IDs: 0=empty 1=grass 2=tree 3=cliff 4=water 5=bridge 6=path 7=deep-forest-grass
  ══════════════════════════════════════════════════════════════ */
  buildTileSheet() {
    const TS = 32, N = 8;
    const c = document.createElement('canvas');
    c.width = TS * N; c.height = TS;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    this._tileGrass(ctx, 0 * TS, TS, '#3d7a47', '#4a9a58');   // 0 – unused / fallback grass
    this._tileGrass(ctx, 1 * TS, TS, '#3d7a47', '#4a9a58');   // 1 – grass
    this._tileTree(ctx,  2 * TS, TS);                          // 2 – tree object
    this._tileCliff(ctx, 3 * TS, TS);                          // 3 – cliff/border
    this._tileWater(ctx, 4 * TS, TS);                          // 4 – water
    this._tileBridge(ctx,5 * TS, TS);                          // 5 – bridge
    this._tilePath(ctx,  6 * TS, TS);                          // 6 – dirt path
    this._tileGrass(ctx, 7 * TS, TS, '#2a5a35', '#357a44');   // 7 – deep forest grass (darker)
    return c;
  }

  _tileGrass(ctx, ox, TS, base = '#3d7a47', light = '#4a9a58') {
    this.px(ctx, base, ox, 0, TS, TS);
    for (let i = 0; i < 20; i++) {
      this.px(ctx, i % 3 === 0 ? light : '#5ab068',
        ox + (i * 19 % (TS - 3)), (i * 13 % (TS - 5)), 2, 3);
    }
    for (let i = 0; i < 12; i++) {
      this.px(ctx, '#2d6238', ox + (i * 29 % (TS - 2)), (i * 17 % (TS - 3)), 1, 2);
    }
  }

  _tileTree(ctx, ox, TS) {
    // transparent BG so ground shows through — draw nothing for BG
    ctx.clearRect(ox, 0, TS, TS);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(ox + 6, 20, 20, 10);
    // Trunk
    this.px(ctx, '#5c3a1e', ox + 12, 16, 8, 16);
    this.px(ctx, '#7a4e28', ox + 13, 16, 4, 14);
    // Canopy layers
    this.px(ctx, '#1e4d1e', ox + 2,  1, 28, 20);
    this.px(ctx, '#2a6e2a', ox + 4,  3, 24, 16);
    this.px(ctx, '#38913a', ox + 6,  5, 20, 12);
    this.px(ctx, '#4aad4c', ox + 9,  7, 14,  8);
    // Highlights
    this.px(ctx, '#5cc05e', ox + 11, 8,  8,  4);
    this.px(ctx, '#7dd87e', ox + 13, 9,  4,  2);
    // Shadow edges
    this.px(ctx, '#163d16', ox + 2,  1, 1, 20);
    this.px(ctx, '#163d16', ox + 29, 1, 1, 20);
  }

  _tileCliff(ctx, ox, TS) {
    this.px(ctx, '#6b5e4a', ox, 0, TS, TS);
    for (let row = 0; row < 4; row++) {
      this.px(ctx, '#4a3d2e', ox, row * 8, TS, 1);
      const off = row % 2 === 0 ? 0 : 8;
      for (let col = 0; col < 5; col++) {
        this.px(ctx, '#4a3d2e', ox + (col * 8 + off) % TS, row * 8, 1, 8);
        this.px(ctx, '#8a7860', ox + (col * 8 + off + 1) % TS, row * 8 + 2, 5, 1);
      }
    }
    this.px(ctx, '#9a8a6e', ox, 0, TS, 2);
  }

  _tileWater(ctx, ox, TS) {
    this.px(ctx, '#0f5a8a', ox, 0, TS, TS);
    // Wave stripes
    this.px(ctx, '#1a7ab8', ox + 2,  5, 12, 2);
    this.px(ctx, '#27a0e0', ox + 3,  6,  8, 1);
    this.px(ctx, '#1a7ab8', ox + 18, 14, 10, 2);
    this.px(ctx, '#27a0e0', ox + 19, 15,  6, 1);
    this.px(ctx, '#1a7ab8', ox + 2,  22, 16, 2);
    this.px(ctx, '#27a0e0', ox + 4,  23, 12, 1);
    // Sparkles
    this.px(ctx, '#aaddff', ox + 6,   6, 1, 1);
    this.px(ctx, '#aaddff', ox + 20, 15, 1, 1);
    this.px(ctx, '#aaddff', ox + 8,  23, 1, 1);
  }

  _tileBridge(ctx, ox, TS) {
    this._tileWater(ctx, ox, TS);
    this.px(ctx, '#7a5220', ox, 8, TS, 16);
    for (let p = 0; p < 4; p++) {
      const py = 9 + p * 4;
      this.px(ctx, '#9a6a2a', ox, py, TS, 3);
      this.px(ctx, '#b8843a', ox + 2, py, TS - 4, 1);
      this.px(ctx, '#5c3a14', ox, py + 3, TS, 1);
    }
    // Rail posts
    [[2,0],[TS-5,0],[2,22],[TS-5,22]].forEach(([x,y]) => this.px(ctx, '#5c3a14', ox+x, y, 3, 10));
    this.px(ctx, '#5c3a14', ox, 8, TS, 2);
    this.px(ctx, '#5c3a14', ox, 22, TS, 2);
  }

  _tilePath(ctx, ox, TS) {
    this.px(ctx, '#b09060', ox, 0, TS, TS);
    [[4,4],[10,8],[18,3],[24,10],[6,16],[14,20],[22,14],[28,22],[2,26],[12,12],[20,26]]
      .forEach(([px_, py_]) => {
        this.px(ctx, '#8a7050', ox + px_, py_, 3, 2);
        this.px(ctx, '#c8a870', ox + px_ + 1, py_, 1, 1);
      });
    this.px(ctx, '#987850', ox + 8,  0, 3, TS);
    this.px(ctx, '#987850', ox + 20, 0, 3, TS);
  }

  /* ══════════════════════════════════════════════════════════════
     CHARACTER SHEET  — 3 frames × 4 dirs, 16×16 each
  ══════════════════════════════════════════════════════════════ */
  buildCharSheet(opts = {}) {
    const { body = '#4a9eed', hair = '#8B4513', vest, armor, elder, robe } = opts;
    const FW = 16, FH = 16, FRAMES = 3, DIRS = 4;
    const c = document.createElement('canvas');
    c.width = FW * FRAMES; c.height = FH * DIRS;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const skin = '#f5c5a0', legCol = '#2c3e6e', shoe = '#1a1a2e';
    const dirs  = ['down','up','left','right'];

    dirs.forEach((dir, di) => {
      for (let f = 0; f < FRAMES; f++) {
        const ox = f * FW, oy = di * FH;
        const swing = f === 0 ? 0 : f === 1 ? -1 : 1;

        // Body
        const bodyFill = robe ? '#8a2a6a' : body;
        this.px(ctx, bodyFill, ox + 4, oy + 7, 8, 7);
        // Belt/vest
        if (vest) { this.px(ctx, vest, ox + 4, oy + 9, 8, 3); }
        if (armor) { this.px(ctx, armor, ox + 3, oy + 7, 10, 7); }
        if (robe) {
          this.px(ctx, '#6a1a5a', ox + 3, oy + 8, 10, 5);
          this.px(ctx, '#aa44aa', ox + 5, oy + 8, 3, 4);
        }
        // Belt buckle
        if (!robe) { this.px(ctx, '#8a6a30', ox + 7, oy + 10, 2, 1); }

        // Legs
        this.px(ctx, legCol, ox + 4, oy + 13, 3, 2 + swing);
        this.px(ctx, legCol, ox + 9, oy + 13, 3, 2 - swing);
        this.px(ctx, shoe, ox + 4, oy + 14 + Math.max(0, swing),  3, 1);
        this.px(ctx, shoe, ox + 9, oy + 14 + Math.max(0, -swing), 3, 1);

        // Head
        this.px(ctx, skin, ox + 4, oy + 1, 8, 7);

        // Hair
        if (dir === 'up') {
          this.px(ctx, hair, ox + 4, oy + 1, 8, 5);
        } else if (dir === 'down') {
          this.px(ctx, hair, ox + 4, oy + 1, 8, 2);
          this.px(ctx, hair, ox + 4, oy + 1, 2, 5);
          this.px(ctx, hair, ox + 10, oy + 1, 2, 5);
        } else {
          this.px(ctx, hair, ox + 4, oy + 1, 8, 3);
          this.px(ctx, hair, dir === 'left' ? ox + 4 : ox + 10, oy + 1, 2, 5);
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

        // Elder extras: staff + beard
        if (elder) {
          this.px(ctx, '#5a2a7a', ox + 3, oy + 7, 10, 7);
          this.px(ctx, '#7a3a9a', ox + 4, oy + 8, 3, 5);
          this.px(ctx, '#8B6914', ox + 13, oy + 3, 1, 12);
          this.px(ctx, '#c8a830', ox + 12, oy + 3, 3, 2);
          if (dir === 'down') {
            this.px(ctx, '#d0d0d0', ox + 5, oy + 7, 6, 3);
            this.px(ctx, '#e8e8e8', ox + 6, oy + 7, 4, 2);
          }
        }

        // Guard: helmet
        if (armor) {
          this.px(ctx, armor, ox + 3, oy + 1, 10, 4);
          this.px(ctx, '#aaa', ox + 4, oy + 2, 8, 2);
        }

        // Healer: staff with green orb
        if (robe) {
          this.px(ctx, '#8B6914', ox + 13, oy + 4, 1, 11);
          this.px(ctx, '#22cc44', ox + 12, oy + 3, 3, 3);
        }
      }
    });

    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     ITEM SHEET  — 4 items × 16 px wide, 16 px tall
     (sword | potion | wood | stone)
  ══════════════════════════════════════════════════════════════ */
  buildItemSheet() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 16;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Sword (0)
    this.px(ctx, '#c8c8d8', 7,  1, 2, 10);
    this.px(ctx, '#e8e8f8', 8,  1, 1,  8);
    this.px(ctx, '#888898', 7,  9, 2,  3);
    this.px(ctx, '#c8a820', 4,  7, 8,  2);
    this.px(ctx, '#8B6914', 7, 11, 2,  4);
    this.px(ctx, '#ffd700', 7, 14, 2,  2);

    // Potion (16)
    this.px(ctx, '#cc2222', 20, 6, 8, 8);
    this.px(ctx, '#ee4444', 21, 7, 5, 5);
    this.px(ctx, '#ff9999', 21, 7, 2, 2);
    this.px(ctx, '#884422', 21, 4, 6, 3);
    this.px(ctx, '#996633', 22, 3, 4, 2);

    // Wood (32)
    this.px(ctx, '#6b4110', 34, 5, 12, 7);
    this.px(ctx, '#8B5a20', 34, 5, 12, 2);
    this.px(ctx, '#4a2c08', 34,10, 12, 2);
    this.px(ctx, '#c8a060', 34, 5,  2, 7);
    this.px(ctx, '#e0c080', 35, 6,  1, 5);
    this.px(ctx, '#c8a060', 44, 5,  2, 7);
    this.px(ctx, '#5a3510', 35, 7,  1, 3);

    // Stone (48)
    this.px(ctx, '#707070', 50, 5, 12, 9);
    this.px(ctx, '#909090', 51, 6,  8, 4);
    this.px(ctx, '#b0b0b0', 52, 7,  4, 2);
    this.px(ctx, '#505050', 50,12, 12, 2);

    return c;
  }
}
