/**
 * GameScene - Extended with:
 *  - DeathSystem (player death/respawn)
 *  - NetworkSync (debounced Supabase saves)
 *  - MultiplayerSystem (realtime position broadcast)
 *  - Fixed enemy AI (reaction delay, aggro radius, speed clamp)
 */
import { Camera }            from '../engine/Camera.js';
import { Renderer }          from '../engine/Renderer.js';
import { CollisionSystem }   from '../systems/CollisionSystem.js';
import { DialogueSystem }    from '../systems/DialogueSystem.js';
import { Pathfinding }       from '../systems/Pathfinding.js';
import { CombatSystem }      from '../systems/CombatSystem.js';
import { EnemyAISystem }     from '../systems/EnemyAISystem.js';
import { EquipmentSystem }   from '../systems/EquipmentSystem.js';
import { WorldItemSpawner }  from '../systems/WorldItemSpawner.js';
import { QuestSystem }       from '../systems/QuestSystem.js';
import { MapFogSystem }      from '../systems/MapFogSystem.js';
import { DeathSystem }       from '../systems/DeathSystem.js';
import { NetworkSync }       from '../systems/NetworkSync.js';
import { MultiplayerSystem } from '../systems/MultiplayerSystem.js';
import { Player }            from '../entities/Player.js';
import { NPC }               from '../entities/NPC.js';
import { WorldItem }         from '../entities/Item.js';
import { Tilemap }           from '../map/Tilemap.js';
import { ProceduralMap }     from '../map/ProceduralMap.js';

export class GameScene {
  constructor(canvas, assets, rawMapData, uiCallbacks) {
    this.canvas = canvas;
    this.assets = assets;
    this.ui     = uiCallbacks;

    // Build procedural world
    const procMap = new ProceduralMap(rawMapData);
    this.mapData  = procMap.toMapData(rawMapData);
    this.tilemap  = new Tilemap(this.mapData);

    this.renderer = new Renderer(canvas);
    this.camera   = new Camera(canvas.width, canvas.height,
      this.tilemap.worldWidth, this.tilemap.worldHeight);

    // Core engine systems
    this.collision   = new CollisionSystem(this.mapData);
    this.pathfinding = new Pathfinding(this.mapData.collisionMap, this.mapData.tileSize);
    this.dialogue    = new DialogueSystem();
    this.combat      = new CombatSystem();
    this.quests      = new QuestSystem();
    this.fog         = new MapFogSystem(this.mapData.width, this.mapData.height);

    // Spawn point
    const startTile  = this._findStartTile();
    this.spawnX      = startTile.x * 32 + 8;
    this.spawnY      = startTile.y * 32 + 8;

    // Player
    this.player = new Player(this.spawnX, this.spawnY);
    this.player.defense     = 0;
    this.player.attackRange = 28;
    this.player.energyRegen = 5;

    this.equipment = new EquipmentSystem(this.player);
    this.equipment.recalculate();

    // Enemy AI
    this.enemyAI = new EnemyAISystem(
      this.mapData, this.mapData.collisionMap, this.mapData.tileSize);

    // Item spawner
    this.spawner = new WorldItemSpawner(this.mapData);

    this.npcs       = [];
    this.worldItems = [];
    this.notifications = [];

    // Player XP / level
    this.playerXP    = 0;
    this.playerLevel = 1;
    this.xpToNext    = 100;

    // Time
    this.gameTimeSeconds       = 8 * 3600;
    this.realSecondsPerGameHour = 30;

    // Death system
    this.death = new DeathSystem(this.spawnX, this.spawnY);
    this.death.onDeath   = (info) => {
      const penalty = info?.penalty ?? 0;
      this._deathMessage = penalty > 0
        ? `You lost ${penalty} gold coin${penalty !== 1 ? 's' : ''}.`
        : 'No gold lost.';
      this.ui.onDeath?.({ penalty, message: this._deathMessage });
    };
    this.death.onRespawn = () => { this.ui.onRespawn?.(); };
    this._deathMessage = 'Respawning...';

    // Network systems (inactive until login)
    this.networkSync  = new NetworkSync();
    this.multiplayer  = new MultiplayerSystem();

    // Attack swing tracking
    this._prevAttacking = false;

    this._initNPCs();

    // Initial item spawns
    const initialItems = this.spawner.update(0, []);
    this.worldItems.push(...initialItems);

    this.camera.snapTo(this.player.centerX, this.player.centerY);
  }

  /* ── Setup helpers ──────────────────────────────────────────────── */

  _findStartTile() {
    const col = this.mapData.collisionMap;
    for (let y = 9; y < 16; y++)
      for (let x = 9; x < 18; x++)
        if (col[y]?.[x] === 0) return { x, y };
    return { x: 12, y: 12 };
  }

  _initNPCs() {
    for (const npcData of this.mapData.npcs || []) {
      this.npcs.push(new NPC(npcData, this.pathfinding));
    }
  }

  /* ── Auth / multiplayer bindings ────────────────────────────────── */

  /** Called by Game.js after successful login */
  async bindUser(userId, username, savedData) {
    this.networkSync.bind(userId, username);
    await this.multiplayer.connect(userId, username);

    // Restore saved state from DB if available
    if (savedData) {
      if (savedData.player) this.player.deserialize(savedData.player);
      if (savedData.inventory) this.player.inventory.deserialize(savedData.inventory);
      if (savedData.equipped)  this.player.inventory.equipped = { ...savedData.equipped };
      this.equipment.recalculate();
      this.camera.snapTo(this.player.centerX, this.player.centerY);
    }
  }

  /** Called by Game.js on logout */
  async unbindUser() {
    await this.networkSync.flushNow(this.player);
    await this.multiplayer.disconnect();
    this.networkSync.unbind();
  }

  /* ── Computed props ─────────────────────────────────────────────── */

  get gameHour()   { return Math.floor((this.gameTimeSeconds / 3600) % 24); }
  get timeString() {
    const h = this.gameHour.toString().padStart(2, '0');
    const m = Math.floor((this.gameTimeSeconds % 3600) / 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  getDayNightTint() {
    const h = this.gameHour;
    if (h >= 6  && h < 8)  return { color: '#ff8800', alpha: 0.15 };
    if (h >= 8  && h < 17) return { color: '#fff',    alpha: 0 };
    if (h >= 17 && h < 19) return { color: '#ff6600', alpha: 0.2 };
    if (h >= 19 && h < 21) return { color: '#220066', alpha: 0.3 };
    return { color: '#000022', alpha: 0.55 };
  }

  /* ══════════════════════════════════════════════════════════════════
     UPDATE
  ══════════════════════════════════════════════════════════════════ */

  update(deltaTime, input) {
    this.gameTimeSeconds += deltaTime * (3600 / this.realSecondsPerGameHour);

    // Death system update (drives fade + respawn timer, blocks input)
    this.death.update(deltaTime, this.player);

    // Network sync tick (debounced DB saves)
    this.networkSync.tick(deltaTime, this.player);

    // Multiplayer broadcast + remote player interpolation
    this.multiplayer.update(deltaTime, this.player);

    // Fog of war
    const ptx = Math.floor(this.player.centerX / this.mapData.tileSize);
    const pty = Math.floor(this.player.centerY / this.mapData.tileSize);
    this.fog.updateExploration(ptx, pty);

    // Block game input while dead/respawning or in dialogue
    const inputBlocked = this.death.blocksInput;

    if (this.dialogue.active && !inputBlocked) {
      this.dialogue.update(deltaTime, input);
      this.player.state.setState('interacting');
      this.ui.onDialogue(this.dialogue);
      input.flush();
      return;
    }
    if (!this.dialogue.active && this.player.state.is('interacting') && !inputBlocked) {
      this.player.state.setState('idle');
    }
    this.ui.onDialogue(null);

    // Player update (blocked when dead)
    if (!inputBlocked) {
      this.player.update(deltaTime, input, this.collision);
      this.equipment.recalculate();
    }

    // Attack swing tracking
    if (this.player.isAttacking && !this._prevAttacking) {
      // New swing started
    }
    if (!this.player.isAttacking && this._prevAttacking) {
      this.combat.clearSwingFlags(this.enemyAI.enemies);
    }
    this._prevAttacking = this.player.isAttacking;

    // NPC updates
    for (const npc of this.npcs) npc.update(deltaTime, this.gameHour, this.collision);

    // Enemy updates
    const justDied = this.enemyAI.update(deltaTime, this.player, this.collision, this.pathfinding);
    this._handleEnemyDeaths(justDied);

    // World items
    for (const item of this.worldItems) item.update(deltaTime);
    const newItems = this.spawner.update(deltaTime, this.worldItems);
    this.worldItems.push(...newItems);

    // Combat (only process if player alive)
    if (!inputBlocked) {
      this.combat.update(
        deltaTime, this.player, this.enemyAI.enemies,
        () => {},
        (dmg) => {
          this.addNotification(`-${dmg} HP`, '#ff6666');
          // Trigger death if HP hits 0
          if (this.player.hp <= 0 && this.death.isAlive) {
            this.death.trigger(this.player, this.networkSync);
          }
        }
      );
    }

    // Quest collect sync
    this.quests.updateCollectQuests(this.player.inventory);

    // Camera (still follows player during death so the screen centers on corpse)
    this.camera.follow(this.player.centerX, this.player.centerY);

    // Interactions
    if (!inputBlocked) this._checkInteractions(input);

    // Prune notifications
    this.notifications = this.notifications
      .map(n => ({ ...n, timer: n.timer - deltaTime }))
      .filter(n => n.timer > 0);

    // Broadcast UI state
    this._broadcastStats();

    input.flush();
  }

  _handleEnemyDeaths(justDied) {
    for (const enemy of justDied) {
      this.gainXP(enemy.xpReward);
      const drops = enemy.rollDrops();
      for (const drop of drops) {
        for (let i = 0; i < drop.count; i++) {
          this.worldItems.push(new WorldItem(drop.itemId,
            enemy.x + (Math.random() - 0.5) * 24,
            enemy.y + (Math.random() - 0.5) * 24));
        }
      }
      this.quests.onEnemyKilled(enemy.type);
      this.addNotification(`${enemy.def.name} defeated! +${enemy.xpReward} XP`, enemy.def.glowColor);
    }
  }

  gainXP(amount) {
    this.playerXP += amount;
    while (this.playerXP >= this.xpToNext) {
      this.playerXP  -= this.xpToNext;
      this.playerLevel++;
      this.xpToNext   = Math.floor(this.xpToNext * 1.4);
      this.equipment.baseStats.maxHP   += 15;
      this.equipment.baseStats.attack  += 2;
      this.equipment.baseStats.defense += 1;
      this.player.hp = this.player.maxHP;
      this.addNotification(`LEVEL UP! Lv.${this.playerLevel} 🎉`, '#ffd700');
    }
  }

  /* ── Interaction checks ─────────────────────────────────────────── */

  _checkInteractions(input) {
    let nearestNPC = null, nearestNPCDist = Infinity;
    for (const npc of this.npcs) {
      if (!npc.isNearPlayer(this.player)) continue;
      const d = Math.hypot(npc.centerX - this.player.centerX, npc.centerY - this.player.centerY);
      if (d < nearestNPCDist) { nearestNPCDist = d; nearestNPC = npc; }
    }
    this.ui.onNearNPC(nearestNPC);

    if (input.interact && nearestNPC) {
      this.player.state.setState('interacting');
      this.dialogue.startDialogue(nearestNPC, this.player.inventory,
        (action, npc) => this._handleDialogueAction(action, npc));
      return;
    }

    let nearestItem = null, nearestItemDist = Infinity;
    for (const item of this.worldItems) {
      if (!item.isNearPlayer(this.player)) continue;
      const d = Math.hypot(item.x - this.player.x, item.y - this.player.y);
      if (d < nearestItemDist) { nearestItemDist = d; nearestItem = item; }
    }
    this.ui.onNearItem(nearestItem);

    if (input.interact && nearestItem) this._pickupItem(nearestItem);
  }

  _pickupItem(worldItem) {
    const added = this.player.inventory.addItem(worldItem.itemId, 1);
    if (added) {
      this.spawner.onItemPickedUp(worldItem);
      this.worldItems = this.worldItems.filter(i => i !== worldItem);
      this.networkSync.markInventoryDirty();
      this.addNotification(`Picked up ${worldItem.name}`, '#90ee90');
    } else {
      this.addNotification('Inventory full!', '#ff9944');
    }
    this._broadcastStats();
  }

  _handleDialogueAction(action, npc) {
    const questStarts = {
      start_quest_gather_wood: 'gather_wood',
      start_quest_spirit_hunt: 'spirit_hunt',
      start_quest_slay_slimes: 'slay_slimes',
      start_quest_slay_wolves: 'slay_wolves',
      start_quest_wolf_fangs:  'wolf_fangs',
    };
    if (questStarts[action]) {
      if (this.quests.startQuest(questStarts[action]))
        this.addNotification('New Quest Started! 📜', '#ffd700');
      return;
    }

    const questCompletes = {
      complete_quest_gather_wood: 'gather_wood',
      complete_quest_wolf_fangs:  'wolf_fangs',
    };
    if (questCompletes[action]) {
      const qid = questCompletes[action];
      if (this.quests.canComplete(qid, this.player.inventory)) {
        const reward = this.quests.completeQuest(qid, this.player.inventory);
        if (reward) {
          this.gainXP(reward.xp);
          this.networkSync.markInventoryDirty();
          this.addNotification(`Quest Complete! +${reward.xp} XP 🎉`, '#ffd700');
        }
      }
      return;
    }

    if (action === 'heal_player') {
      if (this.player.inventory.hasItem('herb', 1)) {
        this.player.inventory.removeItem('herb', 1);
        this.player.hp = this.player.maxHP;
        this.networkSync.markInventoryDirty();
        this.addNotification('Fully healed! (-1 Herb)', '#90ee90');
      } else {
        this.addNotification('You have no herbs!', '#ff9944');
      }
    }
  }

  /* ── Player actions (inventory) ─────────────────────────────────── */

  dropItem(slotIndex) {
    const slot = this.player.inventory.removeAtSlot(slotIndex);
    if (!slot) return;
    const wx = this.player.x + 8 + (Math.random() - 0.5) * 20;
    const wy = this.player.y + 8 + (Math.random() - 0.5) * 20;
    this.worldItems.push(new WorldItem(slot.itemId, wx, wy));
    this.networkSync.markInventoryDirty();
    this.addNotification('Item dropped.', '#aaa');
    this._broadcastStats();
  }

  useItem(slotIndex) {
    const effect = this.player.inventory.useItemAt(slotIndex);
    if (!effect) return;
    if (effect.heal)     { this.player.heal(effect.heal); this.addNotification(`+${effect.heal} HP`, '#90ee90'); }
    if (effect.energy)   { this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + effect.energy); }
    if (effect.equipped) { this.equipment.recalculate(); this.addNotification(`Equipped!`, '#ffd700'); }
    this.networkSync.markInventoryDirty();
    this._broadcastStats();
  }

  unequipSlot(slotId) {
    if (this.player.inventory.unequipSlot(slotId)) {
      this.equipment.recalculate();
      this.networkSync.markInventoryDirty();
      this._broadcastStats();
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */

  render() {
    const ctx = this.renderer.ctx;
    ctx.imageSmoothingEnabled = false;
    this.renderer.clear('#1a1a2e');

    // Ground layer
    this.tilemap.renderLayer(ctx, this.assets, 0, this.camera);

    // Z-sorted renderables
    const renderables = [];
    for (const item of this.worldItems)
      if (this.camera.isVisible(item.x, item.y, item.width, item.height))
        renderables.push({ type: 'item', entity: item, zY: item.y + item.height });

    for (const npc of this.npcs)
      if (this.camera.isVisible(npc.x, npc.y, npc.width, npc.height))
        renderables.push({ type: 'npc', entity: npc, zY: npc.y + npc.height });

    for (const enemy of this.enemyAI.enemies)
      if (!enemy.isFullyDead && this.camera.isVisible(enemy.x, enemy.y, enemy.width, enemy.height))
        renderables.push({ type: 'enemy', entity: enemy, zY: enemy.y + enemy.height });

    // Remote players
    for (const rp of this.multiplayer.remotePlayers.values())
      renderables.push({ type: 'remote', entity: rp, zY: rp.y + rp.height });

    renderables.push({ type: 'player', entity: this.player, zY: this.player.y + this.player.height });

    renderables.sort((a, b) => a.zY - b.zY);

    for (const r of renderables) {
      switch (r.type) {
        case 'item':   this._renderWorldItem(ctx, r.entity);  break;
        case 'npc':    this._renderNPC(ctx, r.entity);        break;
        case 'enemy':  this.enemyAI._renderEnemy(ctx, this.camera, r.entity); break;
        case 'player': this._renderPlayer(ctx, r.entity);     break;
        case 'remote': r.entity.render(ctx, this.camera, this.assets); break;
      }
    }

    // Object layer (trees in front)
    this.tilemap.renderLayer(ctx, this.assets, 1, this.camera);

    // Combat effects
    this.combat.render(ctx, this.camera);

    // Attack arc
    if (this.player.isAttacking) this._renderAttackArc(ctx);

    // Day/night overlay
    const tint = this.getDayNightTint();
    if (tint.alpha > 0) this.renderer.applyTint(tint.color, tint.alpha);

    // Notifications
    this._renderNotifications(ctx);

    // Death overlay (LAST — renders on top of everything)
    this.death.render(ctx, this.canvas.width, this.canvas.height, this._deathMessage);

    // Online player count
    if (this.multiplayer.isConnected) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.canvas.width - 90, 8, 82, 16);
      ctx.fillStyle = '#44ff88';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`🌐 ${this.multiplayer.playerCount} online`, this.canvas.width - 10, 20);
      ctx.textAlign = 'left';
    }
  }

  _renderPlayer(ctx, player) {
    const sp = camera_worldToScreen(this.camera, player.x, player.y);
    const sx = Math.floor(sp.x), sy = Math.floor(sp.y);

    // Invincibility flicker
    const invinc = this.combat.playerInvincTimer > 0;
    if (invinc && Math.floor(Date.now() / 80) % 2 === 0) return; // Flicker

    const img  = this.assets.get('player');
    const rect = player.getSpriteRect();
    const sc   = 2;
    const rw = rect.sw * sc, rh = rect.sh * sc;

    if (img) {
      ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh,
        sx - rw / 2 + player.width / 2, sy - rh + player.height, rw, rh);
    } else {
      this._drawPixelPlayer(ctx, sx, sy, player);
    }

    this.equipment.renderEquipmentOverlay(ctx, sx, sy - 10, player);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + player.width / 2, sy + player.height, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPixelPlayer(ctx, sx, sy, player) {
    ctx.fillStyle = player.inventory.equipped.armor ? '#888' : '#4a9eed';
    ctx.fillRect(sx + 2, sy + 4, 12, 10);
    ctx.fillStyle = '#FDBCB4';
    ctx.fillRect(sx + 3, sy, 10, 8);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(sx + 3, sy, 10, 3);
    if (player.inventory.equipped.helmet) {
      ctx.fillStyle = 'rgba(180,180,180,0.7)'; ctx.fillRect(sx + 3, sy, 10, 4);
    }
    ctx.fillStyle = '#2c5282';
    const lo = Math.floor(Math.sin(player.animFrame * 2.1) * 2);
    ctx.fillRect(sx + 3, sy + 11, 4, 5 + lo);
    ctx.fillRect(sx + 9, sy + 11, 4, 5 - lo);
    if (player.inventory.equipped.boots) {
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(sx + 3, sy + 13, 4, 3);
      ctx.fillRect(sx + 9, sy + 13, 4, 3);
    }
    if (player.isAttacking) {
      ctx.fillStyle = 'rgba(255,200,0,0.4)';
      ctx.fillRect(sx - 4, sy - 4, 24, 24);
    }
  }

  _renderAttackArc(ctx) {
    const sp = this.camera.worldToScreen(this.player.centerX, this.player.centerY);
    const a  = { right: 0, down: Math.PI/2, left: Math.PI, up: -Math.PI/2 }[this.player.facing] || 0;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,220,50,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(Math.floor(sp.x), Math.floor(sp.y), this.player.attackRange, a - 0.9*Math.PI/2, a + 0.9*Math.PI/2);
    ctx.stroke();
    ctx.restore();
  }

  _renderNPC(ctx, npc) {
    const sp = this.camera.worldToScreen(npc.x, npc.y);
    const sx = Math.floor(sp.x), sy = Math.floor(sp.y);
    const img  = this.assets.get(npc.spriteKey);
    const rect = npc.getSpriteRect();
    const sc = 2;

    if (img) {
      ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh,
        sx - rect.sw*sc/2 + npc.width/2, sy - rect.sh*sc + npc.height, rect.sw*sc, rect.sh*sc);
    } else {
      const rc = { quest_giver:'#8B4513', merchant:'#2e7d32', guard:'#3a4a8a', healer:'#8a2a6a' };
      ctx.fillStyle = rc[npc.role] || '#888';
      ctx.fillRect(sx + 2, sy, 12, 14);
      ctx.fillStyle = '#FDBCB4'; ctx.fillRect(sx + 3, sy - 7, 10, 8);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + npc.width/2, sy + npc.height, 6, 3, 0, 0, Math.PI*2); ctx.fill();

    const nw = npc.name.length * 5 + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(sx + npc.width/2 - nw/2, sy - 22, nw, 11);
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(npc.name, sx + npc.width/2, sy - 13); ctx.textAlign = 'left';

    const icons = { quest_giver:'❓', merchant:'🛒', guard:'🛡', healer:'💚' };
    if (icons[npc.role]) {
      ctx.font = '10px serif'; ctx.textAlign = 'center';
      ctx.fillText(icons[npc.role], sx + npc.width/2, sy - 25); ctx.textAlign = 'left';
    }
  }

  _renderWorldItem(ctx, item) {
    const sp = this.camera.worldToScreen(item.x, item.y + item.bobOffset);
    const sx = Math.floor(sp.x), sy = Math.floor(sp.y);
    const ra = { common: 0.2, rare: 0.4, epic: 0.6 }[item.rarity] || 0.2;
    ctx.save();
    ctx.globalAlpha = ra + Math.sin(item.bobTimer) * 0.1;
    ctx.fillStyle = item.rarity === 'epic' ? '#cc88ff' : item.rarity === 'rare' ? '#4488ff' : item.color;
    ctx.fillRect(sx - 4, sy - 4, item.width + 8, item.height + 8);
    ctx.restore();
    ctx.fillStyle = item.color; ctx.fillRect(sx, sy, item.width, item.height);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(sx + 2, sy + 2, 4, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + item.width/2, sy + item.height + 2, 6, 2, 0, 0, Math.PI*2); ctx.fill();
  }

  _renderNotifications(ctx) {
    let y = 60;
    for (const n of this.notifications) {
      const alpha = Math.min(1, n.timer * 2);
      ctx.save(); ctx.globalAlpha = alpha;
      const tw = n.text.length * 6 + 16;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(this.canvas.width/2 - tw/2, y, tw, 20);
      ctx.fillStyle = n.color; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(n.text, this.canvas.width/2, y + 14); ctx.textAlign = 'left';
      ctx.restore(); y += 24;
    }
  }

  addNotification(text, color = '#fff') {
    this.notifications.push({ text, color, timer: 3.0, id: Math.random() });
  }

  _broadcastStats() {
    this.ui.onStatsUpdate?.({
      hp: this.player.hp, maxHP: this.player.maxHP,
      energy: this.player.energy, maxEnergy: this.player.maxEnergy,
      defense: this.player.defense, attack: this.player.attack,
      time: this.timeString, level: this.playerLevel,
      xp: this.playerXP, xpToNext: this.xpToNext,
      inventory: this.player.inventory,
      equipped: this.player.inventory.equipped,
      quests: this.quests.getActiveList(),
      onlinePlayers: this.multiplayer.playerCount,
    });
  }

  resize(w, h) { this.renderer.resize(w, h); this.camera.resize(w, h); }

  /* ── Save / Load (now DB-backed, localStorage as fallback) ──────── */

  save() {
    const data = {
      player:     this.player.serialize(),
      quests:     this.quests.serialize(),
      fog:        this.fog.serialize(),
      gameTime:   this.gameTimeSeconds,
      playerXP:   this.playerXP,
      playerLevel: this.playerLevel,
      xpToNext:   this.xpToNext,
    };
    localStorage.setItem('forestRPG_v3_save', JSON.stringify(data));
    // Also push to network (async, fire-and-forget for now)
    this.networkSync.flushNow(this.player).catch(() => {});
    this.addNotification('Saved ✓', '#90ee90');
  }

  load() {
    const raw = localStorage.getItem('forestRPG_v3_save');
    if (!raw) { this.addNotification('No local save found.', '#ff9944'); return; }
    try {
      const data = JSON.parse(raw);
      this.player.deserialize(data.player);
      this.quests.deserialize(data.quests);
      this.fog.deserialize(data.fog);
      this.gameTimeSeconds = data.gameTime || 8*3600;
      this.playerXP    = data.playerXP    || 0;
      this.playerLevel = data.playerLevel || 1;
      this.xpToNext    = data.xpToNext    || 100;
      this.equipment.recalculate();
      this.camera.snapTo(this.player.centerX, this.player.centerY);
      this.addNotification('Loaded ✓', '#90ee90');
    } catch { this.addNotification('Load failed.', '#ff4444'); }
  }
}

// Helper (avoids having to pass camera obj)
function camera_worldToScreen(camera, x, y) {
  return { x: x - camera.x, y: y - camera.y };
}
