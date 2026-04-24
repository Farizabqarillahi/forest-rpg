/**
 * GameLoop - Core game loop with fixed timestep and delta time
 * Manages update/render cycle at target FPS
 */
export class GameLoop {
  constructor(updateFn, renderFn) {
    this.update = updateFn;
    this.render = renderFn;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedStep = 1000 / 60; // 60fps fixed update
    this.running = false;
    this.animFrameId = null;
    this.fps = 0;
    this.fpsCounter = 0;
    this.fpsTimer = 0;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  tick(timestamp) {
    if (!this.running) return;

    // Calculate delta time in ms, clamped to prevent spiral of death
    const rawDelta = timestamp - this.lastTime;
    const deltaTime = Math.min(rawDelta, 100);
    this.lastTime = timestamp;

    // FPS counter
    this.fpsTimer += deltaTime;
    this.fpsCounter++;
    if (this.fpsTimer >= 1000) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    // Accumulate time and run fixed updates
    this.accumulator += deltaTime;
    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep / 1000); // Convert to seconds
      this.accumulator -= this.fixedStep;
    }

    // Render every frame with interpolation factor
    const alpha = this.accumulator / this.fixedStep;
    this.render(alpha);

    this.animFrameId = requestAnimationFrame((t) => this.tick(t));
  }
}
