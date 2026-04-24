/**
 * DialogueSystem - Manages NPC dialogue flow, choices, and typing effect
 */
export class DialogueSystem {
  constructor() {
    this.active = false;
    this.currentNPC = null;
    this.currentNode = null;
    this.displayText = '';
    this.fullText = '';
    this.typeTimer = 0;
    this.typeSpeed = 40; // ms per character
    this.typingDone = false;
    this.choices = [];
    this.selectedChoice = 0;
    this.onActionCallback = null;
  }

  /**
   * Start dialogue with an NPC
   */
  startDialogue(npc, inventorySystem, onAction) {
    this.active = true;
    this.currentNPC = npc;
    this.onActionCallback = onAction;

    // Determine which dialogue node to start at
    let startNode = 'initial';
    if (npc.memory.hasSpokenBefore) startNode = 'repeat';
    if (npc.questState === 'active') startNode = 'quest_check';

    // Check if player has enough wood for quest completion
    if (npc.questState === 'active' && inventorySystem && inventorySystem.hasItem('wood', 3)) {
      startNode = 'quest_complete';
    }

    npc.memory.hasSpokenBefore = true;
    this.showNode(npc.dialogueTree[startNode], npc.dialogueTree);
  }

  showNode(node, tree) {
    if (!node) {
      this.endDialogue();
      return;
    }
    this.currentNode = node;
    this.fullText = node.text;
    this.displayText = '';
    this.typeTimer = 0;
    this.typingDone = false;

    // Process choices - filter out ones with unmet requirements
    this.choices = (node.choices || []).filter(() => true);
    this.selectedChoice = 0;
    this._tree = tree;
  }

  update(deltaTime, input) {
    if (!this.active) return;

    // Typing effect
    if (!this.typingDone) {
      this.typeTimer += deltaTime * 1000;
      const charsToShow = Math.floor(this.typeTimer / this.typeSpeed);
      if (charsToShow >= this.fullText.length) {
        this.displayText = this.fullText;
        this.typingDone = true;
      } else {
        this.displayText = this.fullText.substring(0, charsToShow);
      }
    }

    // Skip to full text on interact press
    if (input.interact) {
      if (!this.typingDone) {
        this.displayText = this.fullText;
        this.typingDone = true;
      } else if (this.choices.length === 0) {
        // No choices - close dialogue
        this.endDialogue();
      } else {
        // Confirm selected choice
        this.selectChoice(this.selectedChoice);
      }
    }

    // Navigate choices
    if (this.typingDone && this.choices.length > 0) {
      if (input.wasJustPressed('ArrowUp') || input.wasJustPressed('KeyW')) {
        this.selectedChoice = (this.selectedChoice - 1 + this.choices.length) % this.choices.length;
      }
      if (input.wasJustPressed('ArrowDown') || input.wasJustPressed('KeyS')) {
        this.selectedChoice = (this.selectedChoice + 1) % this.choices.length;
      }
    }
  }

  selectChoice(index) {
    const choice = this.choices[index];
    if (!choice) {
      this.endDialogue();
      return;
    }

    // Trigger action if any
    if (choice.action && this.onActionCallback) {
      this.onActionCallback(choice.action, this.currentNPC);
    }

    // Navigate to next node
    if (choice.next && this._tree[choice.next]) {
      this.showNode(this._tree[choice.next], this._tree);
    } else {
      this.endDialogue();
    }
  }

  endDialogue() {
    this.active = false;
    this.currentNPC = null;
    this.currentNode = null;
    this.displayText = '';
    this.choices = [];
  }
}
