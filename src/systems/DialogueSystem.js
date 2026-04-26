/**
 * DialogueSystem - NPC dialogue with typing effect and choices.
 *
 * INPUT LOCK FIX:
 *   Old code called InputLockSystem.lock('dialogue') inside update() every
 *   frame while active. This caused the refcount to grow unbounded (one
 *   lock() per frame), and the single unlock() on exit left count at N-1.
 *
 *   Fix: lock() called ONCE in startDialogue(), clearReason() called ONCE
 *   in endDialogue(). No lock/unlock in update().
 */
import { InputLockSystem } from '../systems/InputLockSystem.js';

const LOCK_REASON = 'dialogue';

export class DialogueSystem {
  constructor() {
    this.active           = false;
    this.currentNPC       = null;
    this.currentNode      = null;
    this.displayText      = '';
    this.fullText         = '';
    this.typeTimer        = 0;
    this.typeSpeed        = 35; // ms per character
    this.typingDone       = false;
    this.choices          = [];
    this.selectedChoice   = 0;
    this.onActionCallback = null;
    this._tree            = null;
  }

  startDialogue(npc, inventorySystem, onAction) {
    this.active           = true;
    this.currentNPC       = npc;
    this.onActionCallback = onAction;

    // ── Lock input ONCE on enter ──────────────────────────────────
    InputLockSystem.lock(LOCK_REASON);

    npc.memory.hasSpokenBefore = true;
    const tree = npc.dialogueTree || {};
    this._tree = tree;
    this._showNode(tree['initial'] || tree[Object.keys(tree)[0]]);
  }

  _showNode(node) {
    if (!node) { this.endDialogue(); return; }
    this.currentNode    = node;
    this.fullText       = node.text || '';
    this.displayText    = '';
    this.typeTimer      = 0;
    this.typingDone     = false;
    this.choices        = node.choices || [];
    this.selectedChoice = 0;
  }

  /**
   * Update — call every frame while dialogue.active is true.
   * Does NOT touch InputLockSystem here — only startDialogue/endDialogue do.
   */
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

    // E key: skip typing → confirm choice → close
    if (input.wasJustPressed('KeyE')) {
      if (!this.typingDone) {
        this.displayText = this.fullText;
        this.typingDone  = true;
      } else if (this.choices.length === 0) {
        this.endDialogue();
      } else {
        this._confirmChoice();
      }
    }

    // Arrow keys for choice navigation (read raw — not gated by lock)
    if (this.typingDone && this.choices.length > 0) {
      if (input.wasJustPressed('ArrowUp')   || input.wasJustPressed('KeyW'))
        this.selectedChoice = (this.selectedChoice - 1 + this.choices.length) % this.choices.length;
      if (input.wasJustPressed('ArrowDown') || input.wasJustPressed('KeyS'))
        this.selectedChoice = (this.selectedChoice + 1) % this.choices.length;
    }
  }

  _confirmChoice() {
    const choice = this.choices[this.selectedChoice];
    if (!choice) { this.endDialogue(); return; }
    if (choice.action && this.onActionCallback) this.onActionCallback(choice.action, this.currentNPC);
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

    // ── Clear lock ONCE on exit ───────────────────────────────────
    InputLockSystem.clearReason(LOCK_REASON);
  }
}
