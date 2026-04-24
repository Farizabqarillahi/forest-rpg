/**
 * Game - Top-level game controller
 * Initializes all systems and runs the game loop
 */
import { GameLoop } from './engine/GameLoop.js';
import { AssetLoader } from './engine/AssetLoader.js';
import { KeyboardController } from './engine/KeyboardController.js';
import { GameScene } from './map/GameScene.js';
import mapData from './map/map.json';

export class Game {
  constructor(canvas, uiCallbacks) {
    this.canvas = canvas;
    this.uiCallbacks = uiCallbacks;
    this.assets = new AssetLoader();
    this.keyboard = new KeyboardController();
    this.scene = null;
    this.loop = null;
    this.initialized = false;
  }

  async init() {
    // Load all assets (with fallback procedural generation)
    await this.assets.loadAll();

    // Create main scene
    this.scene = new GameScene(
      this.canvas,
      this.assets,
      mapData,
      this.uiCallbacks
    );

    // Create game loop
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha)
    );

    // Handle canvas resize
    this._setupResize();

    this.initialized = true;
    return this;
  }

  start() {
    if (!this.initialized) return;
    this.loop.start();
  }

  stop() {
    if (this.loop) this.loop.stop();
    if (this.keyboard) this.keyboard.destroy();
  }

  update(deltaTime) {
    if (!this.scene) return;
    this.scene.update(deltaTime, this.keyboard);
  }

  render() {
    if (!this.scene) return;
    this.scene.render();
  }

  save() { this.scene?.save(); }
  load() { this.scene?.load(); }

  dropItem(slotIndex) { this.scene?.dropItem(slotIndex); }
  useItem(slotIndex) { this.scene?.useItem(slotIndex); }

  _setupResize() {
    const resize = () => {
      this.canvas.width = this.canvas.offsetWidth;
      this.canvas.height = this.canvas.offsetHeight;
      this.scene?.resize(this.canvas.width, this.canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();
  }
}
