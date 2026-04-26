/**
 * GameScene - Complete orchestrator with all systems integrated:
 * combat, enemies, safe zones, chat, multiplayer, death, equipment, quests.
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
import { ChatSystem }        from '../systems/ChatSystem.js';
import { SafeZoneSystem }    from '../systems/SafeZoneSystem.js';
import { InputLockSystem }   from '../systems/InputLockSystem.js';
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

    const procMap = new ProceduralMap(rawMapData);
    this.mapData  = procMap.toMapData(rawMapData);
    this.tilemap  = new Tilemap(this.mapData);

    this.renderer = new Renderer(canvas);
    this.camera   = new Camera(canvas.width, canvas.height,
      this.tilemap.worldWidth, this.tilemap.worldHeight);

    // Core systems
    this.collision   = new CollisionSystem(this.mapData);
    this.pathfinding = new Pathfinding(this.mapData.collisionMap, this.mapData.tileSize);
    this.dialogue    = new DialogueSystem();
    this.combat      = new CombatSystem();
    this.quests      = new QuestSystem();
    this.fog         = new MapFogSystem(this.mapData.width, this.mapData.height);

    // Spawn point
    const startTile = this._findStartTile();
    this.spawnX     = startTile.x * 32 + 8;
    this.spawnY     = startTile.y * 32 + 8;

    // Safe zone — village area must be enemy-free
    this.safeZone = new SafeZoneSystem();
    this.safeZone.addTileZone(5, 5, 14, 12, 2, this.mapData.tileSize, 'village');

    // Player
    this.player = new Player(this.spawnX, this.spawnY);
    this.player.defense     = 0;
    this.player.attackRange = 28;
    this.player.energyRegen = 5;
    this.equipment = new EquipmentSystem(this.player);
    this.equipment.recalculate();

    // Enemy AI (uses SafeZoneSystem + EnemySpawnSystem internally)
    this.enemyAI = new EnemyAISystem(
      this.mapData, this.mapData.collisionMap, this.mapData.tileSize,
      this.safeZone, this.spawnX, this.spawnY
    );

    // Item spawner
    this.spawner    = new WorldItemSpawner(this.mapData);
    this.npcs       = [];
    this.worldItems = [];
    this.notifications = [];

    // XP / level
    this.playerXP    = 0;
    this.playerLevel = 1;
    this.xpToNext    = 100;

    // Time
    this.gameTimeSeconds        = 8 * 3600;
    this.realSecondsPerGameHour = 30;

    // Death system
    this.death = new DeathSystem(this.spawnX, this.spawnY);
    this.death.onDeath   = (info) => {
      const p = info?.penalty ?? 0;
      this._deathMessage = p > 0 ? `Lost ${p} gold coin${p !== 1 ? 's' : ''}.` : 'No gold lost.';
      this.ui.onDeath?.({ penalty: p, message: this._deathMessage });
    };
    this.death.onRespawn = () => this.ui.onRespawn?.();
    this._deathMessage   = 'Respawning...';

    // Network
    this.networkSync = new NetworkSync();
    this.multiplayer = new MultiplayerSystem();
    this.chat        = new ChatSystem(this.multiplayer);
    this.multiplayer.chatSystem = this.chat; // wire chat events

    // Attack swing tracking
    this._prevAttacking = false;

    this._initNPCs();

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
    for (const d of this.mapData.npcs || []) this.npcs.push(new NPC(d, this.pathfinding));
  }

  /* ── Auth binding ───────────────────────────────────────────────── */

  async bindUser(userId, username, savedData) {
    this.networkSync.bind(userId, username);
    this.chat.bind(userId, username);
    await this.multiplayer.connect(userId, username);

    if (savedData?.player) {
      this.player.deserialize(savedData.player);
      if (savedData.player.inventory) this.player.inventory.deserialize(savedData.player.inventory);
      if (savedData.player.inventory?.equipped)
        this.player.inventory.equipped = { ...savedData.player.inventory.equipped };
      this.equipment.recalculate();
      this.camera.snapTo(this.player.centerX, this.player.centerY);
    }
  }

  async unbindUser() {
    await this.networkSync.flushNow(this.player);
    await this.multiplayer.disconnect();
    this.networkSync.unbind();
    this.chat.unbind();
  }

  /* ── Chat proxy ─────────────────────────────────────────────────── */
  sendChat(text) { this.chat.send(text); }

  /* ── Computed ───────────────────────────────────────────────────── */

  get gameHour() { return Math.floor((this.gameTimeSeconds / 3600) % 24); }
  get timeString() {
    const h = this.gameHour.toString().padStart(2, '0');
    const m = Math.floor((this.gameTimeSeconds % 3600) / 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  getDayNightTint() {
    const h = this.gameHour;
    if (h >= 6  && h < 8)  return { color:'#ff8800', alpha:0.15 };
    if (h >= 8  && h < 17) return { color:'#fff',    alpha:0 };
    if (h >= 17 && h < 19) return { color:'#ff6600', alpha:0.2 };
    if (h >= 19 && h < 21) return { color:'#220066', alpha:0.3 };
    return { color:'#000022', alpha:0.55 };
  }

  /* ══════════════════════════════════════════════════════════════════
     UPDATE
  ══════════════════════════════════════════════════════════════════ */

  update(deltaTime, input) {
    this.gameTimeSeconds += deltaTime * (3600 / this.realSecondsPerGameHour);

    // Death system
    this.death.update(deltaTime, this.player);

    // Network
    this.networkSync.tick(deltaTime, this.player);
    this.multiplayer.update(deltaTime, this.player);
    this.chat.update(deltaTime);

    // Fog
    const ptx = Math.floor(this.player.centerX / this.mapData.tileSize);
    const pty = Math.floor(this.player.centerY / this.mapData.tileSize);
    this.fog.updateExploration(ptx, pty);

    const inputBlocked = this.death.blocksInput;

    // Dialogue (only when not dead and not otherwise locked)
    if (this.dialogue.active && !inputBlocked) {
      InputLockSystem.lock('dialogue');
      this.dialogue.update(deltaTime, input);
      this.player.state.setState('interacting');
      this.ui.onDialogue(this.dialogue);
      input.flush();
    } else {
      InputLockSystem.unlock('dialogue');
      if (!this.dialogue.active && this.player.state.is('interacting') && !inputBlocked) {
        this.player.state.setState('idle');
      }
      this.ui.onDialogue(null);
    }

    if (!inputBlocked && !this.dialogue.active) {
      this.player.update(deltaTime, input, this.collision);
      this.equipment.recalculate();
    }

    // Swing tracking
    if (this.player.isAttacking && !this._prevAttacking) { /* new swing */ }
    if (!this.player.isAttacking && this._prevAttacking) this.combat.clearSwingFlags(this.enemyAI.enemies);
    this._prevAttacking = this.player.isAttacking;

    for (const npc of this.npcs) npc.update(deltaTime, this.gameHour, this.collision);

    const justDied = this.enemyAI.update(deltaTime, this.player, this.collision, this.pathfinding);
    this._handleEnemyDeaths(justDied);

    for (const item of this.worldItems) item.update(deltaTime);
    const newItems = this.spawner.update(deltaTime, this.worldItems);
    this.worldItems.push(...newItems);

    if (!inputBlocked) {
      this.combat.update(deltaTime, this.player, this.enemyAI.enemies,
        () => {},
        (dmg) => {
          this.addNotification(`-${dmg} HP`, '#ff6666');
          if (this.player.hp <= 0 && this.death.isAlive)
            this.death.trigger(this.player, this.networkSync);
        }
      );
    }

    this.quests.updateCollectQuests(this.player.inventory);
    this.camera.follow(this.player.centerX, this.player.centerY);

    if (!inputBlocked && !this.dialogue.active) this._checkInteractions(input);

    this.notifications = this.notifications
      .map(n => ({ ...n, timer: n.timer - deltaTime }))
      .filter(n => n.timer > 0);

    this._broadcastStats();
    input.flush();
  }

  _handleEnemyDeaths(justDied) {
    for (const enemy of justDied) {
      this.gainXP(enemy.xpReward);
      for (const drop of enemy.rollDrops()) {
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

  /* ── Interactions ───────────────────────────────────────────────── */

  _checkInteractions(input) {
    let nearNPC = null, nearNPCDist = Infinity;
    for (const npc of this.npcs) {
      if (!npc.isNearPlayer(this.player)) continue;
      const d = Math.hypot(npc.centerX - this.player.centerX, npc.centerY - this.player.centerY);
      if (d < nearNPCDist) { nearNPCDist = d; nearNPC = npc; }
    }
    this.ui.onNearNPC(nearNPC);

    if (input.interact && nearNPC) {
      this.player.state.setState('interacting');
      this.dialogue.startDialogue(nearNPC, this.player.inventory,
        (action, npc) => this._handleDialogueAction(action, npc));
      return;
    }

    let nearItem = null, nearItemDist = Infinity;
    for (const item of this.worldItems) {
      if (!item.isNearPlayer(this.player)) continue;
      const d = Math.hypot(item.x - this.player.x, item.y - this.player.y);
      if (d < nearItemDist) { nearItemDist = d; nearItem = item; }
    }
    this.ui.onNearItem(nearItem);

    if (input.interact && nearItem) this._pickupItem(nearItem);
  }

  _pickupItem(worldItem) {
    if (this.player.inventory.addItem(worldItem.itemId, 1)) {
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
    const STARTS = {
      start_quest_gather_wood:'gather_wood', start_quest_spirit_hunt:'spirit_hunt',
      start_quest_slay_slimes:'slay_slimes', start_quest_slay_wolves:'slay_wolves',
      start_quest_wolf_fangs:'wolf_fangs',
    };
    if (STARTS[action]) {
      if (this.quests.startQuest(STARTS[action])) this.addNotification('Quest Started! 📜', '#ffd700');
      return;
    }
    const COMPLETES = { complete_quest_gather_wood:'gather_wood', complete_quest_wolf_fangs:'wolf_fangs' };
    if (COMPLETES[action]) {
      const qid = COMPLETES[action];
      if (this.quests.canComplete(qid, this.player.inventory)) {
        const reward = this.quests.completeQuest(qid, this.player.inventory);
        if (reward) { this.gainXP(reward.xp); this.networkSync.markInventoryDirty(); this.addNotification(`Quest Complete! +${reward.xp} XP 🎉`, '#ffd700'); }
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

  /* ── Player actions ─────────────────────────────────────────────── */

  dropItem(slotIndex) {
    const slot = this.player.inventory.removeAtSlot(slotIndex);
    if (!slot) return;
    this.worldItems.push(new WorldItem(slot.itemId,
      this.player.x + 8 + (Math.random() - 0.5) * 20,
      this.player.y + 8 + (Math.random() - 0.5) * 20));
    this.networkSync.markInventoryDirty();
    this.addNotification('Item dropped.', '#aaa');
    this._broadcastStats();
  }

  useItem(slotIndex) {
    const effect = this.player.inventory.useItemAt(slotIndex);
    if (!effect) return;
    if (effect.heal)     { this.player.heal(effect.heal); this.addNotification(`+${effect.heal} HP`, '#90ee90'); }
    if (effect.energy)   { this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + effect.energy); }
    if (effect.equipped) { this.equipment.recalculate(); this.addNotification('Equipped!', '#ffd700'); }
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

    this.tilemap.renderLayer(ctx, this.assets, 0, this.camera);

    // Z-sorted renderables
    const renderables = [];
    for (const item of this.worldItems)
      if (this.camera.isVisible(item.x, item.y, item.width, item.height))
        renderables.push({ type:'item',   entity:item,  zY:item.y + item.height });
    for (const npc of this.npcs)
      if (this.camera.isVisible(npc.x, npc.y, npc.width, npc.height))
        renderables.push({ type:'npc',    entity:npc,   zY:npc.y + npc.height });
    for (const e of this.enemyAI.enemies)
      if (!e.isFullyDead && this.camera.isVisible(e.x, e.y, e.width, e.height))
        renderables.push({ type:'enemy',  entity:e,     zY:e.y + e.height });
    for (const rp of this.multiplayer.remotePlayers.values())
      renderables.push({ type:'remote',  entity:rp,    zY:rp.y + rp.height });
    renderables.push({ type:'player', entity:this.player, zY:this.player.y + this.player.height });
    renderables.sort((a,b) => a.zY - b.zY);

    for (const r of renderables) {
      switch (r.type) {
        case 'item':   this._renderWorldItem(ctx, r.entity); break;
        case 'npc':    this._renderNPC(ctx, r.entity);       break;
        case 'enemy':  this.enemyAI._renderEnemy(ctx, this.camera, r.entity); break;
        case 'remote': {
          r.entity.render(ctx, this.camera, this.assets);
          const rsp = this.camera.worldToScreen(r.entity.x, r.entity.y);
          this.chat.renderBubble(ctx, rsp.x, rsp.y, r.entity.id, r.entity.width);
          break;
        }
        case 'player': this._renderPlayer(ctx, r.entity);    break;
      }
    }

    // Player chat bubble
    const psp = this.camera.worldToScreen(this.player.x, this.player.y);
    if (this.multiplayer.localId)
      this.chat.renderBubble(ctx, psp.x, psp.y, this.multiplayer.localId, this.player.width);

    this.tilemap.renderLayer(ctx, this.assets, 1, this.camera);
    this.combat.render(ctx, this.camera);
    if (this.player.isAttacking) this._renderAttackArc(ctx);

    const tint = this.getDayNightTint();
    if (tint.alpha > 0) this.renderer.applyTint(tint.color, tint.alpha);

    this._renderNotifications(ctx);
    this.death.render(ctx, this.canvas.width, this.canvas.height, this._deathMessage);

    // Online counter
    if (this.multiplayer.isConnected) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.canvas.width - 92, 8, 84, 16);
      ctx.fillStyle = '#44ff88';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`🌐 ${this.multiplayer.playerCount} online`, this.canvas.width - 10, 20);
      ctx.textAlign = 'left';
    }
  }

  _renderPlayer(ctx, player) {
    const sp = this.camera.worldToScreen(player.x, player.y);
    const sx = Math.floor(sp.x), sy = Math.floor(sp.y);

    const invinc = this.combat.playerInvincTimer > 0;
    if (invinc && Math.floor(Date.now() / 80) % 2 === 0) return;

    const img = this.assets.get('player');
    const rect = player.getSpriteRect();
    const sc = 2, rw = rect.sw * sc, rh = rect.sh * sc;

    if (img) {
      ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh,
        sx - rw / 2 + player.width / 2, sy - rh + player.height, rw, rh);
    } else {
      this._drawPixelPlayer(ctx, sx, sy, player);
    }
    this.equipment.renderEquipmentOverlay(ctx, sx, sy - 10, player);

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
    const a = { right:0, down:Math.PI/2, left:Math.PI, up:-Math.PI/2 }[this.player.facing] || 0;
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
    const img = this.assets.get(npc.spriteKey);
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
    const ra = { common:0.2, rare:0.4, epic:0.6 }[item.rarity] || 0.2;
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
      hp:this.player.hp, maxHP:this.player.maxHP,
      energy:this.player.energy, maxEnergy:this.player.maxEnergy,
      defense:this.player.defense, attack:this.player.attack,
      time:this.timeString, level:this.playerLevel,
      xp:this.playerXP, xpToNext:this.xpToNext,
      inventory:this.player.inventory,
      equipped:this.player.inventory.equipped,
      quests:this.quests.getActiveList(),
      onlinePlayers:this.multiplayer.playerCount,
    });
  }

  resize(w, h) { this.renderer.resize(w, h); this.camera.resize(w, h); }

  save() {
    localStorage.setItem('forestRPG_v3_save', JSON.stringify({
      player:this.player.serialize(), quests:this.quests.serialize(),
      fog:this.fog.serialize(), gameTime:this.gameTimeSeconds,
      playerXP:this.playerXP, playerLevel:this.playerLevel, xpToNext:this.xpToNext,
    }));
    this.networkSync.flushNow(this.player).catch(() => {});
    this.addNotification('Saved ✓', '#90ee90');
  }

  load() {
    const raw = localStorage.getItem('forestRPG_v3_save');
    if (!raw) { this.addNotification('No save found.', '#ff9944'); return; }
    try {
      const d = JSON.parse(raw);
      this.player.deserialize(d.player);
      this.quests.deserialize(d.quests);
      this.fog.deserialize(d.fog);
      this.gameTimeSeconds = d.gameTime || 8*3600;
      this.playerXP = d.playerXP || 0;
      this.playerLevel = d.playerLevel || 1;
      this.xpToNext = d.xpToNext || 100;
      this.equipment.recalculate();
      this.camera.snapTo(this.player.centerX, this.player.centerY);
      this.addNotification('Loaded ✓', '#90ee90');
    } catch { this.addNotification('Load failed.', '#ff4444'); }
  }
}
