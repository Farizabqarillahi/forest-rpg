/**
 * QuestSystem - Manages quest definitions, progress tracking, and rewards
 */

export const QUEST_DEFS = {
  gather_wood: {
    id: 'gather_wood',
    title: 'Timber for the Village',
    description: 'Elder Mira needs wood to repair the fences.',
    giver: 'elder',
    type: 'gather',
    objectives: [{ type: 'collect', itemId: 'wood', count: 3, label: 'Collect Wood' }],
    rewards: { items: [{ itemId: 'potion', count: 2 }], xp: 30, gold: 10 },
    color: '#ffd700',
  },
  slay_slimes: {
    id: 'slay_slimes',
    title: 'Slime Infestation',
    description: 'The Guard needs you to defeat 3 slimes threatening the area.',
    giver: 'guard',
    type: 'slay',
    objectives: [{ type: 'kill', enemyType: 'slime', count: 3, label: 'Defeat Slimes' }],
    rewards: { items: [{ itemId: 'leather_armor', count: 1 }], xp: 50, gold: 20 },
    color: '#44dd44',
  },
  slay_wolves: {
    id: 'slay_wolves',
    title: 'The Wolf Problem',
    description: 'Wolves have been attacking villagers. Defeat 3 of them.',
    giver: 'guard',
    type: 'slay',
    objectives: [{ type: 'kill', enemyType: 'wolf', count: 3, label: 'Defeat Wolves' }],
    rewards: { items: [{ itemId: 'silver_sword', count: 1 }], xp: 80, gold: 35 },
    color: '#ff8844',
  },
  spirit_hunt: {
    id: 'spirit_hunt',
    title: 'Spirits of the Deep Forest',
    description: 'Banish 2 forest spirits corrupting the ancient ruins.',
    giver: 'elder',
    type: 'slay',
    objectives: [{ type: 'kill', enemyType: 'spirit', count: 2, label: 'Banish Spirits' }],
    rewards: { items: [{ itemId: 'spirit_ring', count: 1 }], xp: 120, gold: 50 },
    color: '#aa88ff',
  },
  wolf_fangs: {
    id: 'wolf_fangs',
    title: 'Fang Collection',
    description: 'Bring 3 wolf fangs to the Merchant for a special reward.',
    giver: 'merchant',
    type: 'gather',
    objectives: [{ type: 'collect', itemId: 'wolf_fang', count: 3, label: 'Collect Wolf Fangs' }],
    rewards: { items: [{ itemId: 'wolf_amulet', count: 1 }], xp: 60, gold: 25 },
    color: '#ddddee',
  },
};

export class QuestInstance {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.status = 'active'; // active | complete | failed
    this.progress = {}; // { objectiveIndex: currentCount }

    // Init progress counters
    def.objectives.forEach((obj, i) => { this.progress[i] = 0; });
  }

  get isComplete() {
    return this.def.objectives.every((obj, i) => this.progress[i] >= obj.count);
  }

  /** Increment kill progress for an enemy type */
  onKill(enemyType) {
    this.def.objectives.forEach((obj, i) => {
      if (obj.type === 'kill' && obj.enemyType === enemyType) {
        this.progress[i] = Math.min(obj.count, (this.progress[i] || 0) + 1);
      }
    });
  }

  /** Check collect objectives against inventory */
  checkCollect(inventory) {
    this.def.objectives.forEach((obj, i) => {
      if (obj.type === 'collect') {
        this.progress[i] = Math.min(obj.count, inventory.countItem(obj.itemId));
      }
    });
  }

  getObjectiveText(i) {
    const obj = this.def.objectives[i];
    const prog = this.progress[i] || 0;
    return `${obj.label}: ${prog}/${obj.count}`;
  }

  serialize() {
    return { id: this.id, status: this.status, progress: { ...this.progress } };
  }
}

export class QuestSystem {
  constructor() {
    this.active = new Map();   // id → QuestInstance
    this.completed = new Set();
    this.failed = new Set();
  }

  startQuest(questId) {
    if (this.active.has(questId) || this.completed.has(questId)) return false;
    const def = QUEST_DEFS[questId];
    if (!def) return false;
    this.active.set(questId, new QuestInstance(def));
    return true;
  }

  onEnemyKilled(enemyType) {
    for (const quest of this.active.values()) {
      quest.onKill(enemyType);
    }
  }

  /** Call each frame to sync collect quests with inventory */
  updateCollectQuests(inventory) {
    for (const quest of this.active.values()) {
      quest.checkCollect(inventory);
    }
  }

  /**
   * Attempt to complete a quest — returns reward data or null
   */
  completeQuest(questId, inventory) {
    const quest = this.active.get(questId);
    if (!quest || !quest.isComplete) return null;

    const def = quest.def;

    // Remove required collect items from inventory
    for (const obj of def.objectives) {
      if (obj.type === 'collect') {
        inventory.removeItem(obj.itemId, obj.count);
      }
    }

    // Grant rewards
    const granted = [];
    for (const item of (def.rewards.items || [])) {
      const ok = inventory.addItem(item.itemId, item.count);
      if (ok) granted.push(item);
    }

    // Add gold
    if (def.rewards.gold) {
      inventory.addItem('gold_coin', def.rewards.gold);
    }

    this.active.delete(questId);
    this.completed.add(questId);
    quest.status = 'complete';

    return { xp: def.rewards.xp || 0, items: granted, gold: def.rewards.gold || 0 };
  }

  getActiveList() { return [...this.active.values()]; }
  isActive(id)    { return this.active.has(id); }
  isDone(id)      { return this.completed.has(id); }

  canComplete(questId, inventory) {
    const quest = this.active.get(questId);
    if (!quest) return false;
    quest.checkCollect(inventory);
    return quest.isComplete;
  }

  serialize() {
    const active = [];
    for (const q of this.active.values()) {
      active.push(q.serialize());
    }
    return { active, completed: [...this.completed] };
  }

  deserialize(data) {
    if (!data) return;
    this.completed = new Set(data.completed || []);
    for (const saved of (data.active || [])) {
      const def = QUEST_DEFS[saved.id];
      if (!def) continue;
      const inst = new QuestInstance(def);
      inst.status = saved.status;
      inst.progress = { ...saved.progress };
      this.active.set(saved.id, inst);
    }
  }
}
