/**
 * Game - Top-level controller with auth/multiplayer lifecycle management
 */
import { GameLoop }           from './engine/GameLoop.js';
import { AssetLoader }        from './engine/AssetLoader.js';
import { KeyboardController } from './engine/KeyboardController.js';
import { GameScene }          from './map/GameScene.js';
import mapData                from './map/map.json';
import * as SB                from './systems/SupabaseService.js';

export class Game {
  constructor(canvas, uiCallbacks) {
    this.canvas      = canvas;
    this.uiCallbacks = uiCallbacks;
    this.assets      = new AssetLoader();
    this.keyboard    = new KeyboardController();
    this.scene       = null;
    this.loop        = null;
    this.initialized = false;
    this._userId     = null;
    this._username   = null;
  }

  async init() {
    await this.assets.loadAll();
    this.scene = new GameScene(this.canvas, this.assets, mapData, this.uiCallbacks);
    this.loop  = new GameLoop((dt) => this.update(dt), () => this.render());
    this._setupResize();
    this.initialized = true;

    // Restore session if user was already logged in
    const session = await SB.getSession();
    if (session?.user) {
      await this._onLogin(session.user);
    }

    return this;
  }

  start() { if (this.initialized) this.loop.start(); }

  stop() {
    this.loop?.stop();
    this.keyboard?.destroy();
    this.scene?.unbindUser().catch(() => {});
  }

  update(dt) { this.scene?.update(dt, this.keyboard); }
  render()   { this.scene?.render(); }

  /* ── Auth actions ──────────────────────────────────────────────── */

  async login(email, password) {
    const { data, error } = await SB.signIn(email, password);
    if (error) return { error };
    await this._onLogin(data.user);
    return { data };
  }

  async register(email, password, username) {
    const { data, error } = await SB.signUp(email, password, username);
    if (error) return { error };
    if (data?.user) await this._onLogin(data.user, username);
    return { data };
  }

  async logout() {
    await this.scene?.unbindUser();
    await SB.signOut();
    this._userId   = null;
    this._username = null;
    this.uiCallbacks.onAuthChange?.(null);
  }

  async _onLogin(user, usernameOverride) {
    this._userId = user.id;

    // Fetch player row from DB
    const playerRow = await SB.loadPlayer(user.id);
    this._username  = usernameOverride
      || playerRow?.username
      || user.user_metadata?.username
      || user.email?.split('@')[0]
      || 'Traveler';

    // Load inventory + equipment from DB
    const invRows = await SB.loadInventory(user.id);
    const eqRows  = await SB.loadEquipment(user.id);

    // Build saved data object for GameScene
    const savedData = playerRow ? {
      player: {
        x:  playerRow.x  ?? this.scene.spawnX,
        y:  playerRow.y  ?? this.scene.spawnY,
        hp: playerRow.hp ?? 100,
        energy: 50, facing: 'down',
        inventory: this._buildInventorySave(invRows, eqRows),
      },
    } : null;

    await this.scene.bindUser(this._userId, this._username, savedData);

    this.uiCallbacks.onAuthChange?.({
      userId:   this._userId,
      username: this._username,
      email:    user.email,
    });
  }

  _buildInventorySave(invRows, equippedMap) {
    // Convert DB rows to InventorySystem format
    const slots = new Array(20).fill(null);
    let idx = 0;
    for (const row of invRows) {
      if (idx >= slots.length) break;
      slots[idx++] = { itemId: row.item_id, count: row.qty };
    }
    return { slots, equipped: equippedMap };
  }

  /* ── Inventory/equipment proxies ──────────────────────────────── */
  dropItem(i)      { this.scene?.dropItem(i); }
  useItem(i)       { this.scene?.useItem(i); }
  unequipSlot(s)   { this.scene?.unequipSlot(s); }
  save()           { this.scene?.save(); }
  load()           { this.scene?.load(); }

  get username()   { return this._username; }
  get isLoggedIn() { return Boolean(this._userId); }

  _setupResize() {
    const resize = () => {
      this.canvas.width  = this.canvas.offsetWidth;
      this.canvas.height = this.canvas.offsetHeight;
      this.scene?.resize(this.canvas.width, this.canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();
  }
}
