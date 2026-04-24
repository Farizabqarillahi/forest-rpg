/**
 * GameScene - Main game scene orchestrating all systems and entities
 */
import { Camera } from '../engine/Camera.js';
import { Renderer } from '../engine/Renderer.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { Pathfinding } from '../systems/Pathfinding.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import { WorldItem } from '../entities/Item.js';
import { Tilemap } from '../map/Tilemap.js';

export class GameScene {
  constructor(canvas, assets, mapData, uiCallbacks) {
    this.canvas = canvas;
    this.assets = assets;
    this.mapData = mapData;
    this.ui = uiCallbacks; // { onStatsUpdate, onNearItem, onNearNPC, onDialogue, onNotification }

    this.tilemap = new Tilemap(mapData);

    this.renderer = new Renderer(canvas);
    this.camera = new Camera(
      canvas.width, canvas.height,
      this.tilemap.worldWidth, this.tilemap.worldHeight
    );

    this.collision = new CollisionSystem(mapData);
    this.pathfinding = new Pathfinding(mapData.collisionMap, mapData.tileSize);
    this.dialogue = new DialogueSystem();

    // Day/night cycle: real seconds per in-game hour
    this.gameTimeSeconds = 8 * 3600; // Start at 8am
    this.realSecondsPerGameHour = 30; // 30 real seconds = 1 game hour

    // Entities
    this.player = new Player(10 * 32, 10 * 32);
    this.npcs = [];
    this.worldItems = [];

    // Notification system
    this.notifications = [];

    // Quest tracking
    this.questLog = {};

    // Initialize from map data
    this._initNPCs();
    this._initWorldItems();

    // Snap camera to player immediately
    this.camera.snapTo(this.player.centerX, this.player.centerY);
  }

  _initNPCs() {
    for (const npcData of this.mapData.npcs || []) {
      const npc = new NPC(npcData, this.pathfinding);
      this.npcs.push(npc);
    }
  }

  _initWorldItems() {
    for (const itemData of this.mapData.items || []) {
      const item = new WorldItem(
        itemData.id,
        itemData.x * 32,
        itemData.y * 32
      );
      this.worldItems.push(item);
    }
  }

  get gameHour() {
    return Math.floor((this.gameTimeSeconds / 3600) % 24);
  }

  get gameMinute() {
    return Math.floor((this.gameTimeSeconds % 3600) / 60);
  }

  get timeString() {
    const h = this.gameHour.toString().padStart(2, '0');
    const m = this.gameMinute.toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Day/night tint overlay settings
   */
  getDayNightTint() {
    const h = this.gameHour;
    if (h >= 6 && h < 8) return { color: '#ff8800', alpha: 0.15 }; // Dawn
    if (h >= 8 && h < 17) return { color: '#fff', alpha: 0 };       // Day
    if (h >= 17 && h < 19) return { color: '#ff6600', alpha: 0.2 }; // Dusk
    if (h >= 19 && h < 21) return { color: '#220066', alpha: 0.3 }; // Evening
    return { color: '#000022', alpha: 0.55 };                         // Night
  }

  update(deltaTime, input) {
    // Update game time
    this.gameTimeSeconds += deltaTime * (3600 / this.realSecondsPerGameHour);

    // Dialogue takes over input
    if (this.dialogue.active) {
      this.dialogue.update(deltaTime, input);
      this.player.state.setState('interacting');

      // Update UI with dialogue state
      this.ui.onDialogue(this.dialogue);
      input.flush();
      return;
    }

    // Player was in dialogue, now it ended
    if (this.player.state.is('interacting')) {
      this.player.state.setState('idle');
    }
    this.ui.onDialogue(null);

    // Update player
    this.player.update(deltaTime, input, this.collision);

    // Update NPCs
    for (const npc of this.npcs) {
      npc.update(deltaTime, this.gameHour, this.collision);
    }

    // Update world items
    for (const item of this.worldItems) {
      item.update(deltaTime);
    }

    // Update notifications
    this.notifications = this.notifications
      .map(n => ({ ...n, timer: n.timer - deltaTime }))
      .filter(n => n.timer > 0);

    // Camera follow player
    this.camera.follow(this.player.centerX, this.player.centerY);

    // Check interactions
    this._checkInteractions(input);

    // Auto-pickup items when near
    this._checkItemPickup();

    // Update stats UI
    this.ui.onStatsUpdate({
      hp: this.player.hp,
      maxHP: this.player.maxHP,
      energy: this.player.energy,
      maxEnergy: this.player.maxEnergy,
      time: this.timeString,
      inventory: this.player.inventory,
    });

    input.flush();
  }

  _checkInteractions(input) {
    // Find nearest interactable NPC
    let nearestNPC = null;
    let nearestDist = Infinity;

    for (const npc of this.npcs) {
      if (npc.isNearPlayer(this.player)) {
        const dx = npc.centerX - this.player.centerX;
        const dy = npc.centerY - this.player.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestNPC = npc;
        }
      }
    }

    this.ui.onNearNPC(nearestNPC);

    // Interact with NPC
    if (input.interact && nearestNPC) {
      this.player.state.setState('interacting');
      this.dialogue.startDialogue(
        nearestNPC,
        this.player.inventory,
        (action, npc) => this._handleDialogueAction(action, npc)
      );
    }

    // Find nearest item
    let nearestItem = null;
    let nearestItemDist = Infinity;
    for (const item of this.worldItems) {
      if (item.isNearPlayer(this.player)) {
        const dx = item.x - this.player.x;
        const dy = item.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestItemDist) {
          nearestItemDist = dist;
          nearestItem = item;
        }
      }
    }

    this.ui.onNearItem(nearestItem);

    // Pick up item with E (if no NPC nearby)
    if (input.interact && nearestItem && !nearestNPC) {
      this._pickupItem(nearestItem);
    }
  }

  _pickupItem(worldItem) {
    const added = this.player.inventory.addItem(worldItem.itemId, 1);
    if (added) {
      this.worldItems = this.worldItems.filter(i => i !== worldItem);
      this.addNotification(`Picked up ${worldItem.name}`, '#90ee90');
    } else {
      this.addNotification('Inventory full or too heavy!', '#ff9944');
    }
    this.ui.onStatsUpdate({
      hp: this.player.hp, maxHP: this.player.maxHP,
      energy: this.player.energy, maxEnergy: this.player.maxEnergy,
      time: this.timeString,
      inventory: this.player.inventory,
    });
  }

  _checkItemPickup() {
    // Auto-hint for nearby items handled in _checkInteractions
  }

  _handleDialogueAction(action, npc) {
    if (action === 'start_quest') {
      npc.questState = 'active';
      npc.memory.questGiven = true;
      this.questLog[npc.id] = 'active';
      this.addNotification('Quest Started: Gather 3 Wood!', '#ffd700');
    }

    if (action === 'complete_quest') {
      if (this.player.inventory.hasItem('wood', 3)) {
        this.player.inventory.removeItem('wood', 3);
        this.player.inventory.addItem('potion', 1);
        npc.questState = 'complete';
        this.questLog[npc.id] = 'complete';
        this.addNotification('Quest Complete! Received Health Potion!', '#ffd700');
      }
    }
  }

  /**
   * Drop item from inventory to world
   */
  dropItem(slotIndex) {
    const slot = this.player.inventory.removeAtSlot(slotIndex);
    if (!slot) return;

    // Spawn near player
    const item = new WorldItem(
      slot.itemId,
      this.player.x + 8 + (Math.random() - 0.5) * 20,
      this.player.y + 8 + (Math.random() - 0.5) * 20
    );
    this.worldItems.push(item);
    this.addNotification(`Dropped ${item.name}`, '#ddd');
  }

  /**
   * Use item from inventory
   */
  useItem(slotIndex) {
    const effect = this.player.inventory.useItemAt(slotIndex);
    if (!effect) return;

    if (effect.heal) {
      this.player.heal(effect.heal);
      this.addNotification(`Restored ${effect.heal} HP!`, '#90ee90');
    }
    if (effect.attack) {
      this.player.attack += effect.attack;
      this.addNotification(`Attack +${effect.attack}!`, '#ffd700');
    }

    this.ui.onStatsUpdate({
      hp: this.player.hp, maxHP: this.player.maxHP,
      energy: this.player.energy, maxEnergy: this.player.maxEnergy,
      time: this.timeString,
      inventory: this.player.inventory,
    });
  }

  addNotification(text, color = '#fff') {
    this.notifications.push({ text, color, timer: 3.0, id: Date.now() + Math.random() });
  }

  render() {
    const ctx = this.renderer.ctx;
    ctx.imageSmoothingEnabled = false;

    // Clear
    this.renderer.clear('#1a1a2e');

    // Render ground layer
    this.tilemap.renderLayer(ctx, this.assets, 0, this.camera);

    // Collect renderable entities with their Y position for z-sorting
    const renderables = [];

    // World items
    for (const item of this.worldItems) {
      if (this.camera.isVisible(item.x, item.y, item.width, item.height)) {
        renderables.push({ type: 'item', entity: item, zY: item.y + item.height });
      }
    }

    // NPCs
    for (const npc of this.npcs) {
      if (this.camera.isVisible(npc.x, npc.y, npc.width, npc.height)) {
        renderables.push({ type: 'npc', entity: npc, zY: npc.y + npc.height });
      }
    }

    // Player
    renderables.push({ type: 'player', entity: this.player, zY: this.player.y + this.player.height });

    // Sort by Y for depth illusion
    renderables.sort((a, b) => a.zY - b.zY);

    // Draw each renderable
    for (const r of renderables) {
      if (r.type === 'item') this._renderWorldItem(ctx, r.entity);
      else if (r.type === 'npc') this._renderNPC(ctx, r.entity);
      else if (r.type === 'player') this._renderPlayer(ctx, r.entity);
    }

    // Render object layer on top (trees appear in front of player when behind)
    this.tilemap.renderLayer(ctx, this.assets, 1, this.camera);

    // Day/night overlay
    const tint = this.getDayNightTint();
    if (tint.alpha > 0) {
      this.renderer.applyTint(tint.color, tint.alpha);
    }

    // Render notifications on canvas
    this._renderNotifications(ctx);

    // Debug: render attack flash
    if (this.player.isAttacking) {
      const sp = this.camera.worldToScreen(this.player.x - 8, this.player.y - 8);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(sp.x, sp.y, this.player.width + 16, this.player.height + 16);
    }
  }

  _renderPlayer(ctx, player) {
    const sp = this.camera.worldToScreen(player.x, player.y);
    const spriteImg = this.assets.get('player');
    const rect = player.getSpriteRect();

    const scale = 2; // Render at 2x for pixel art
    const renderW = rect.sw * scale;
    const renderH = rect.sh * scale;

    if (spriteImg) {
      ctx.drawImage(
        spriteImg,
        rect.sx, rect.sy, rect.sw, rect.sh,
        Math.floor(sp.x - renderW / 2 + player.width / 2),
        Math.floor(sp.y - renderH + player.height),
        renderW, renderH
      );
    } else {
      // Fallback pixel art player
      this._drawPixelPlayer(ctx, sp.x, sp.y, player);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.ellipse(
      Math.floor(sp.x + player.width / 2),
      Math.floor(sp.y + player.height),
      6, 3, 0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  _drawPixelPlayer(ctx, sx, sy, player) {
    const scale = 2;
    const dirColors = {
      down: '#4a9eed', up: '#3a7ebd', left: '#3a7ebd', right: '#3a7ebd'
    };
    // Body
    ctx.fillStyle = dirColors[player.facing] || '#4a9eed';
    ctx.fillRect(Math.floor(sx + 2), Math.floor(sy + 4), 12, 10);
    // Head
    ctx.fillStyle = '#FDBCB4';
    ctx.fillRect(Math.floor(sx + 3), Math.floor(sy), 10, 8);
    // Hair
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(Math.floor(sx + 3), Math.floor(sy), 10, 3);
    // Legs
    ctx.fillStyle = '#2c5282';
    const legOffset = Math.floor(Math.sin(player.animFrame * 2.1) * 2);
    ctx.fillRect(Math.floor(sx + 3), Math.floor(sy + 11), 4, 5 + legOffset);
    ctx.fillRect(Math.floor(sx + 9), Math.floor(sy + 11), 4, 5 - legOffset);

    // Attack flash
    if (player.isAttacking) {
      ctx.fillStyle = 'rgba(255,200,0,0.5)';
      ctx.fillRect(Math.floor(sx - 4), Math.floor(sy - 4), 24, 24);
    }
  }

  _renderNPC(ctx, npc) {
    const sp = this.camera.worldToScreen(npc.x, npc.y);
    const spriteImg = this.assets.get(npc.spriteKey);
    const rect = npc.getSpriteRect();
    const scale = 2;
    const renderW = rect.sw * scale;
    const renderH = rect.sh * scale;

    if (spriteImg) {
      ctx.drawImage(
        spriteImg,
        rect.sx, rect.sy, rect.sw, rect.sh,
        Math.floor(sp.x - renderW / 2 + npc.width / 2),
        Math.floor(sp.y - renderH + npc.height),
        renderW, renderH
      );
    } else {
      // Fallback
      ctx.fillStyle = npc.id === 'elder' ? '#8B4513' : '#2e7d32';
      ctx.fillRect(Math.floor(sp.x + 2), Math.floor(sp.y), 12, 14);
      ctx.fillStyle = '#FDBCB4';
      ctx.fillRect(Math.floor(sp.x + 3), Math.floor(sp.y - 7), 10, 8);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(Math.floor(sp.x + npc.width / 2), Math.floor(sp.y + npc.height), 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Name tag
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const nameWidth = npc.name.length * 5 + 6;
    ctx.fillRect(Math.floor(sp.x + npc.width / 2 - nameWidth / 2), Math.floor(sp.y - 22), nameWidth, 11);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, Math.floor(sp.x + npc.width / 2), Math.floor(sp.y - 13));
    ctx.textAlign = 'left';

    // Quest indicator
    if (npc.questState === 'none' || (npc.questState === 'active' && npc.id === 'elder')) {
      ctx.fillStyle = npc.questState === 'active' ? '#ff8800' : '#ffd700';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(npc.questState === 'active' ? '!' : '?', Math.floor(sp.x + npc.width / 2), Math.floor(sp.y - 24));
      ctx.textAlign = 'left';
    }
  }

  _renderWorldItem(ctx, item) {
    const sp = this.camera.worldToScreen(item.x, item.y + item.bobOffset);

    // Glow effect
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(item.bobTimer) * 0.1;
    ctx.fillStyle = item.color;
    ctx.fillRect(Math.floor(sp.x - 3), Math.floor(sp.y - 3), item.width + 6, item.height + 6);
    ctx.restore();

    // Item body
    ctx.fillStyle = item.color;
    ctx.fillRect(Math.floor(sp.x), Math.floor(sp.y), item.width, item.height);

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(Math.floor(sp.x + 2), Math.floor(sp.y + 2), 4, 4);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(Math.floor(sp.x + item.width / 2), Math.floor(sp.y + item.height + 2), 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderNotifications(ctx) {
    let y = 60;
    for (const notif of this.notifications) {
      const alpha = Math.min(1, notif.timer * 2);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(this.canvas.width / 2 - 100, y, 200, 20);
      ctx.fillStyle = notif.color;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(notif.text, this.canvas.width / 2, y + 14);
      ctx.textAlign = 'left';
      ctx.restore();
      y += 24;
    }
  }

  resize(w, h) {
    this.renderer.resize(w, h);
    this.camera.resize(w, h);
  }

  /**
   * Save all game state to localStorage
   */
  save() {
    const saveData = {
      player: this.player.serialize(),
      npcs: this.npcs.map(n => n.serialize()),
      worldItems: this.worldItems.map(i => ({ itemId: i.itemId, x: i.x, y: i.y })),
      questLog: this.questLog,
      gameTime: this.gameTimeSeconds,
      timestamp: Date.now(),
    };
    localStorage.setItem('forestRPG_save', JSON.stringify(saveData));
    this.addNotification('Game Saved!', '#90ee90');
  }

  /**
   * Load game state from localStorage
   */
  load() {
    const raw = localStorage.getItem('forestRPG_save');
    if (!raw) {
      this.addNotification('No save found!', '#ff9944');
      return;
    }
    try {
      const data = JSON.parse(raw);
      this.player.deserialize(data.player);

      for (const npcData of data.npcs || []) {
        const npc = this.npcs.find(n => n.id === npcData.id);
        if (npc) npc.deserialize(npcData);
      }

      this.worldItems = (data.worldItems || []).map(
        i => new WorldItem(i.itemId, i.x, i.y)
      );

      this.questLog = data.questLog || {};
      this.gameTimeSeconds = data.gameTime || 8 * 3600;

      this.camera.snapTo(this.player.centerX, this.player.centerY);
      this.addNotification('Game Loaded!', '#90ee90');
    } catch (e) {
      this.addNotification('Load failed!', '#ff4444');
    }
  }
}
