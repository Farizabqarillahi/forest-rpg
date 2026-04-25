/**
 * DialogueSystem - Manages NPC dialogue flow with typing effect and choices
 */
export class DialogueSystem {
  constructor() {
    this.active          = false;
    this.currentNPC      = null;
    this.currentNode     = null;
    this.displayText     = '';
    this.fullText        = '';
    this.typeTimer       = 0;
    this.typeSpeed       = 35; // ms per char
    this.typingDone      = false;
    this.choices         = [];
    this.selectedChoice  = 0;
    this.onActionCallback = null;
    this._tree           = null;
  }

  startDialogue(npc, inventorySystem, onAction) {
    this.active          = true;
    this.currentNPC      = npc;
    this.onActionCallback = onAction;

    // Choose starting node based on NPC memory / quest state
    let startNode = 'initial';
    if (npc.memory.hasSpokenBefore) startNode = 'repeat';

    npc.memory.hasSpokenBefore = true;
    const tree = npc.dialogueTree || {};
    this._tree = tree;
    this._showNode(tree[startNode] || tree['initial']);
  }

  _showNode(node) {
    if (!node) { this.endDialogue(); return; }
    this.currentNode  = node;
    this.fullText     = node.text || '';
    this.displayText  = '';
    this.typeTimer    = 0;
    this.typingDone   = false;
    this.choices      = node.choices || [];
    this.selectedChoice = 0;
  }

  update(deltaTime, input) {
    if (!this.active) return;

    // Typing effect
    if (!this.typingDone) {
      this.typeTimer += deltaTime * 1000;
      const chars = Math.floor(this.typeTimer / this.typeSpeed);
      if (chars >= this.fullText.length) {
        this.displayText = this.fullText;
        this.typingDone  = true;
      } else {
        this.displayText = this.fullText.slice(0, chars);
      }
    }

    if (input.interact) {
      if (!this.typingDone) {
        // Skip to full text
        this.displayText = this.fullText;
        this.typingDone  = true;
      } else if (this.choices.length === 0) {
        this.endDialogue();
      } else {
        this._confirmChoice();
      }
    }

    // Navigate choices with arrow keys
    if (this.typingDone && this.choices.length > 0) {
      if (input.wasJustPressed && input.wasJustPressed('ArrowUp'))   this.selectedChoice = (this.selectedChoice - 1 + this.choices.length) % this.choices.length;
      if (input.wasJustPressed && input.wasJustPressed('ArrowDown')) this.selectedChoice = (this.selectedChoice + 1) % this.choices.length;
    }
  }

  _confirmChoice() {
    const choice = this.choices[this.selectedChoice];
    if (!choice) { this.endDialogue(); return; }

    if (choice.action && this.onActionCallback) {
      this.onActionCallback(choice.action, this.currentNPC);
    }

    if (choice.next && this._tree[choice.next]) {
      this._showNode(this._tree[choice.next]);
    } else {
      this.endDialogue();
    }
  }

  endDialogue() {
    this.active      = false;
    this.currentNPC  = null;
    this.currentNode = null;
    this.displayText = '';
    this.choices     = [];
  }
}
