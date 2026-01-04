// src/game/controllers/ObstacleSpawner.js

import { GAME_CONFIG } from "../config/GameConfig";

export class ObstacleSpawner {
  constructor(scene, playerController, levelManager) {
    this.scene = scene;
    this.playerController = playerController;
    this.levelManager = levelManager;

    // Track active obstacles
    this.activeBall = null;
    this.activeSpike = null;
    this.activeWeave = null;
  }

  get difficultyMultiplier() {
    return this.levelManager.difficultyMultiplier;
  }

  clearAllObstacles() {
    this.activeBall = null;
    this.activeSpike = null;
    this.activeWeave = null;
  }

  // === SPIKE SPAWNING ===

  spawnTargetedSpike() {
    const targetX = this.playerController.player.x;
    const spike = this.scene.physics.add.sprite(targetX, -100, "spike");
    spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.setDepth(5);
    spike.body.setAllowGravity(false);

    this.activeSpike = spike;

    const trail = this.createSpikeTrail(spike);

    this.scene.tweens.add({
      targets: spike,
      y: 150,
      duration: 800 / this.difficultyMultiplier,
      onComplete: () => {
        if (spike.active) {
          // Play spike sound when it starts falling (after warning phase)
          if (this.scene.audioManager) {
            this.scene.audioManager.playSpikeSound();
          }

          spike.body.setAllowGravity(true);
          spike.setGravityY(4000 * this.difficultyMultiplier);
          trail.start();
        }
      },
    });

    this.setupObstacleCollision(spike, trail);
  }

  spawnLaneSpike(x) {
    const spike = this.scene.physics.add
      .sprite(x, -100, "spike")
      .setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.body.setAllowGravity(false);

    this.activeSpike = spike;

    const trail = this.createSpikeTrail(spike);

    this.scene.tweens.add({
      targets: spike,
      y: 150,
      duration: 500,
      onComplete: () => {
        if (spike.active) {
          if (this.scene.audioManager) {
            this.scene.audioManager.playSpikeSound();
          }

          spike.body.setAllowGravity(true);
          spike.setGravityY(4500);
          trail.start();
        }
      },
    });

    this.setupObstacleCollision(spike, trail);
  }

  spawnShowerSpike(x) {
    const spike = this.scene.physics.add
      .sprite(x, -100, "spike")
      .setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.body.setAllowGravity(false);

    const trail = this.createSpikeTrail(spike);

    this.scene.tweens.add({
      targets: spike,
      y: 150,
      duration: 400,
      onComplete: () => {
        if (spike.active) {
          if (this.scene.audioManager) {
            this.scene.audioManager.playSpikeSound();
          }

          spike.body.setAllowGravity(true);
          spike.setGravityY(5000);
          trail.start();
        }
      },
    });

    this.setupObstacleCollision(spike, trail);
  }

  createSpikeTrail(spike) {
    // Skip trail creation in Wave 3 for better performance
    if (this.levelManager.currentWave === 3) {
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    const trail = this.scene.add.particles(0, 0, "speedLine", {
      follow: spike,
      scale: { start: 6, end: 1 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 300,
      frequency: 20,
      blendMode: "ADD",
      emitting: false,
    });
    trail.setDepth(4);
    spike.on("destroy", () => trail.destroy());
    return trail;
  }
  // === BALL SPAWNING ===

  spawnBall() {
    if (this.activeBall || this.activeSpike || this.activeWeave) {
      return;
    }

    const playerX = this.playerController.player.x;
    const isPlayerOnRight = playerX > 540;
    const spawnFromRight = !isPlayerOnRight;

    const spawnX = spawnFromRight ? 1200 : -120;
    const velocity = (spawnFromRight ? -650 : 650) * this.difficultyMultiplier;

    const ball = this.scene.physics.add.sprite(
      spawnX,
      GAME_CONFIG.GROUND.Y - 50,
      "red"
    );
    ball.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    ball.setCircle(ball.width / 2);
    ball.setDepth(5);
    ball.body.setAllowGravity(false);
    ball.setVelocityX(velocity);

    if (this.scene.audioManager) {
      this.scene.audioManager.playRollSound();
    }

    this.activeBall = ball;

    this.scene.tweens.add({
      targets: ball,
      angle: spawnFromRight ? -360 : 360,
      duration: 1000 / this.difficultyMultiplier,
      repeat: -1,
    });

    this.setupObstacleCollision(ball);

    this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (ball.active && (ball.x < -400 || ball.x > 1500)) {
          ball.destroy();
          this.activeBall = null;
        }
      },
      loop: true,
    });
  }

  // === WEAVE SPAWNING (Wave 2) ===

  // === WEAVE SPAWNING (OPTIMIZED FOR PERFORMANCE) ===

  spawnWeave() {
    if (this.activeWeave || this.activeBall || this.activeSpike) return;

    const weave = this.scene.physics.add.sprite(540, -100, "weave");
    weave.setScale(GAME_CONFIG.PLAYER.SCALE - 5);
    weave.setDepth(5);
    weave.body.setAllowGravity(false);
    weave.setVelocityY(400 * this.difficultyMultiplier);

    this.activeWeave = weave;

    // OPTIMIZATION 1: Pre-calculate values once
    const startTime = this.scene.time.now;
    const amplitude = 250;
    const frequency = 0.003;
    const centerX = 540;

    // OPTIMIZATION 2: Reduced update frequency from 32ms to 50ms
    // This reduces calculations by 36% with minimal visual impact
    const weaveMotion = this.scene.time.addEvent({
      delay: 50, // Changed from 32ms to 50ms
      callback: () => {
        if (!weave.active) {
          weaveMotion.remove();
          return;
        }

        const elapsed = this.scene.time.now - startTime;
        const offset = Math.sin(elapsed * frequency) * amplitude;
        weave.x = centerX + offset;
      },
      loop: true,
    });

    // OPTIMIZATION 3: Increased exit check from 150ms to 250ms
    // This reduces checks by 40% while still catching exits promptly
    const exitCheck = this.scene.time.addEvent({
      delay: 250, // Changed from 150ms to 250ms
      callback: () => {
        if (!weave.active) {
          this.activeWeave = null;
          weaveMotion.remove();
          exitCheck.remove();
          return;
        }

        if (weave.y > 2000) {
          weave.destroy();
          this.activeWeave = null;
          weaveMotion.remove();
          exitCheck.remove();
        }
      },
      loop: true,
    });

    this.setupObstacleCollision(weave);

    return { weave, exitCheck };
  }

  // === COLLISION SETUP ===

  setupObstacleCollision(sprite, trail = null) {
    // Ground collision for spikes
    if (sprite.texture.key === "spike") {
      this.scene.physics.add.collider(sprite, this.scene.ground, () => {
        if (trail) trail.stop();

        if (this.activeSpike === sprite) {
          this.activeSpike = null;
        }

        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          scale: 0,
          duration: 200,
          onComplete: () => sprite.destroy(),
        });
      });
    }

    // Player collision
    this.scene.physics.add.overlap(sprite, this.playerController.player, () => {
      sprite.destroy();

      if (sprite === this.activeSpike) this.activeSpike = null;
      if (sprite === this.activeBall) this.activeBall = null;
      if (sprite === this.activeWeave) this.activeWeave = null;

      this.scene.updateLives();
    });
  }
}
