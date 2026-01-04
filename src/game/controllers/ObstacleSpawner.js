// src/game/controllers/ObstacleSpawner.js

import { GAME_CONFIG } from "../config/GameConfig";

/**
 * ObstacleSpawner
 *
 * Manages the creation and behavior of all obstacle types in the game:
 * - Spikes: Falling hazards with three variants (targeted, lane, shower)
 * - Balls: Rolling obstacles that spawn from screen edges
 * - Weaves: Sinusoidal moving obstacles with optimized performance
 *
 * Features:
 * - Difficulty scaling through LevelManager multiplier
 * - Collision detection and cleanup
 * - Performance optimizations for Wave 3
 * - Audio integration for obstacle events
 * - Single active obstacle constraint (prevents overlap)
 *
 * Performance considerations:
 * - Particle trails disabled in Wave 3
 * - Reduced update frequencies for weave motion
 * - Efficient cleanup and memory management
 *
 * @class
 */
export class ObstacleSpawner {
  /**
   * Creates a new ObstacleSpawner instance
   *
   * @param {Phaser.Scene} scene - The game scene for sprite creation
   * @param {PlayerController} playerController - Controller for collision detection
   * @param {LevelManager} levelManager - Manager for difficulty scaling and wave info
   */
  constructor(scene, playerController, levelManager) {
    this.scene = scene;
    this.playerController = playerController;
    this.levelManager = levelManager;

    // ===== Active Obstacle Tracking =====
    // Only one obstacle of each type can be active at a time
    // This prevents overwhelming the player and maintains difficulty balance
    this.activeBall = null;
    this.activeSpike = null;
    this.activeWeave = null;
  }

  /**
   * Gets the current difficulty multiplier from LevelManager
   * Used to scale obstacle speed and behavior based on wave progression
   *
   * @returns {number} Current difficulty multiplier (starts at 1, increases over time)
   */
  get difficultyMultiplier() {
    return this.levelManager.difficultyMultiplier;
  }

  // ============================================================================
  // OBSTACLE CLEANUP
  // ============================================================================

  /**
   * Clears all active obstacle references
   *
   * Note: Does not destroy sprites - they exit naturally or are destroyed
   * by their own cleanup timers. This just clears the tracking references
   * to allow new obstacles to spawn.
   */
  clearAllObstacles() {
    this.activeBall = null;
    this.activeSpike = null;
    this.activeWeave = null;
  }

  // ============================================================================
  // SPIKE SPAWNING - THREE VARIANTS
  // ============================================================================

  /**
   * Spawns a spike that targets the player's current position
   * Used in Wave 1 for player-tracking difficulty
   *
   * Behavior:
   * 1. Appears above player's current X position
   * 2. Slowly descends to warning position (y: 150)
   * 3. After warning phase, drops rapidly with gravity
   * 4. Speed scales with difficulty multiplier
   *
   * Warning duration: 800ms / difficultyMultiplier (faster at higher difficulty)
   * Gravity: 4000 * difficultyMultiplier
   */
  spawnTargetedSpike() {
    const targetX = this.playerController.player.x;
    const spike = this.scene.physics.add.sprite(targetX, -100, "spike");
    spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.setDepth(5);
    spike.body.setAllowGravity(false);

    this.activeSpike = spike;

    const trail = this.createSpikeTrail(spike);

    // Warning phase: Slow descent to give player time to react
    this.scene.tweens.add({
      targets: spike,
      y: 150,
      duration: 800 / this.difficultyMultiplier,
      onComplete: () => {
        if (spike.active) {
          // Play audio cue when spike begins falling
          if (this.scene.audioManager) {
            this.scene.audioManager.playSpikeSound();
          }

          // Enable gravity for rapid fall
          spike.body.setAllowGravity(true);
          spike.setGravityY(4000 * this.difficultyMultiplier);
          trail.start();
        }
      },
    });

    this.setupObstacleCollision(spike, trail);
  }

  /**
   * Spawns a spike at a specific lane position
   * Used for scripted lane attack sequences in Wave 2 and 3
   *
   * Behavior:
   * - Fixed X position (no player tracking)
   * - Faster warning phase (500ms)
   * - Higher base gravity (4500) for aggressive attacks
   *
   * @param {number} x - X coordinate of the lane to target
   */
  spawnLaneSpike(x) {
    const spike = this.scene.physics.add
      .sprite(x, -100, "spike")
      .setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.body.setAllowGravity(false);

    this.activeSpike = spike;

    const trail = this.createSpikeTrail(spike);

    // Short warning phase for lane attacks
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

  /**
   * Spawns a spike for shower attack sequences
   * Fastest variant with minimal warning time
   *
   * Used in Wave 3 spike showers where multiple spikes
   * rain down in rapid succession
   *
   * Behavior:
   * - Very short warning (400ms)
   * - Highest gravity (5000) for fast-paced attacks
   * - No difficulty scaling
   *
   * @param {number} x - X coordinate to spawn spike at
   */
  spawnShowerSpike(x) {
    const spike = this.scene.physics.add
      .sprite(x, -100, "spike")
      .setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.body.setAllowGravity(false);

    const trail = this.createSpikeTrail(spike);

    // Minimal warning for shower attacks
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

  /**
   * Creates a particle trail effect for falling spikes
   * Provides visual feedback for spike velocity
   *
   * Performance optimization: Disabled in Wave 3 to reduce particle overhead
   * during intensive final boss sequences
   *
   * @param {Phaser.Physics.Arcade.Sprite} spike - The spike sprite to attach trail to
   * @returns {Object} Particle emitter or dummy object with no-op methods
   * @private
   */
  createSpikeTrail(spike) {
    // Wave 3 optimization: Skip trail creation for better performance
    if (this.levelManager.currentWave === 3) {
      // Return dummy object with same interface to prevent crashes
      return {
        start: () => {},
        stop: () => {},
        destroy: () => {},
      };
    }

    // Create speed line particle effect
    const trail = this.scene.add.particles(0, 0, "speedLine", {
      follow: spike,
      scale: { start: 6, end: 1 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 300,
      frequency: 20,
      blendMode: "ADD",
      emitting: false, // Start disabled, enabled when spike falls
    });
    trail.setDepth(4); // Behind spike but in front of background

    // Auto-cleanup when spike is destroyed
    spike.on("destroy", () => trail.destroy());

    return trail;
  }

  // ============================================================================
  // BALL SPAWNING
  // ============================================================================

  /**
   * Spawns a rolling ball obstacle from the screen edge
   *
   * Intelligence: Ball spawns from the opposite side of where player is standing
   * to increase challenge and prevent easy avoidance
   *
   * Behavior:
   * - Rolls along ground at scaled velocity
   * - Rotates continuously for realistic motion
   * - Auto-destroys when off-screen
   * - Only spawns if no other obstacles are active
   *
   * Velocity: 650 * difficultyMultiplier (scaled with game progression)
   */
  spawnBall() {
    // Prevent spawning if any obstacle is already active
    if (this.activeBall || this.activeSpike || this.activeWeave) {
      return;
    }

    // Determine spawn side based on player position
    const playerX = this.playerController.player.x;
    const isPlayerOnRight = playerX > 540; // Screen center
    const spawnFromRight = !isPlayerOnRight; // Spawn from opposite side

    // Calculate spawn position and velocity
    const spawnX = spawnFromRight ? 1200 : -120;
    const velocity = (spawnFromRight ? -650 : 650) * this.difficultyMultiplier;

    // Create ball sprite
    const ball = this.scene.physics.add.sprite(
      spawnX,
      GAME_CONFIG.GROUND.Y - 50,
      "red"
    );
    ball.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    ball.setCircle(ball.width / 2); // Circular hitbox for accurate collision
    ball.setDepth(5);
    ball.body.setAllowGravity(false);
    ball.setVelocityX(velocity);

    // Play rolling sound effect
    if (this.scene.audioManager) {
      this.scene.audioManager.playRollSound();
    }

    this.activeBall = ball;

    // Continuous rotation animation for realistic rolling
    this.scene.tweens.add({
      targets: ball,
      angle: spawnFromRight ? -360 : 360, // Rotate in direction of travel
      duration: 1000 / this.difficultyMultiplier,
      repeat: -1, // Loop infinitely
    });

    this.setupObstacleCollision(ball);

    // Auto-cleanup when ball exits screen bounds
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

  // ============================================================================
  // WEAVE SPAWNING - PERFORMANCE OPTIMIZED
  // ============================================================================

  /**
   * Spawns a weave obstacle with sinusoidal horizontal motion
   * Optimized for performance during intensive Wave 2 and 3 sequences
   *
   * Motion pattern:
   * - Constant downward velocity (400 * difficultyMultiplier)
   * - Horizontal oscillation using sine wave (amplitude: 250px)
   * - Centered at x: 540 (screen center)
   *
   * Performance optimizations applied:
   * 1. Pre-calculated values (amplitude, frequency, centerX)
   * 2. Reduced motion update frequency: 50ms (was 32ms) = 36% fewer calculations
   * 3. Reduced exit check frequency: 250ms (was 150ms) = 40% fewer checks
   *
   * Trade-off: Slightly less smooth motion, but imperceptible to players
   * and significantly reduces CPU load during complex sequences
   *
   * @returns {{weave: Phaser.Physics.Arcade.Sprite, exitCheck: Phaser.Time.TimerEvent}}
   *          Object containing weave sprite and exit check timer for external cleanup
   */
  spawnWeave() {
    // Prevent spawning if any obstacle is already active
    if (this.activeWeave || this.activeBall || this.activeSpike) return;

    // Create weave sprite
    const weave = this.scene.physics.add.sprite(540, -100, "weave");
    weave.setScale(GAME_CONFIG.PLAYER.SCALE - 5);
    weave.setDepth(5);
    weave.body.setAllowGravity(false);
    weave.setVelocityY(400 * this.difficultyMultiplier);

    this.activeWeave = weave;

    // OPTIMIZATION 1: Pre-calculate constants once (avoids repeated calculations)
    const startTime = this.scene.time.now;
    const amplitude = 250; // Horizontal oscillation range
    const frequency = 0.003; // Oscillation speed
    const centerX = 540; // Screen center

    // OPTIMIZATION 2: Reduced update frequency from 32ms to 50ms
    // Result: 36% fewer calculations with minimal visual impact
    const weaveMotion = this.scene.time.addEvent({
      delay: 50, // Was 32ms
      callback: () => {
        if (!weave.active) {
          weaveMotion.remove();
          return;
        }

        // Calculate sinusoidal horizontal position
        const elapsed = this.scene.time.now - startTime;
        const offset = Math.sin(elapsed * frequency) * amplitude;
        weave.x = centerX + offset;
      },
      loop: true,
    });

    // OPTIMIZATION 3: Increased exit check interval from 150ms to 250ms
    // Result: 40% fewer checks while still catching exits promptly
    const exitCheck = this.scene.time.addEvent({
      delay: 250, // Was 150ms
      callback: () => {
        if (!weave.active) {
          this.activeWeave = null;
          weaveMotion.remove();
          exitCheck.remove();
          return;
        }

        // Check if weave has exited screen bounds
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

    // Return references for external cleanup if needed
    return { weave, exitCheck };
  }

  // ============================================================================
  // COLLISION DETECTION
  // ============================================================================

  /**
   * Sets up collision detection for an obstacle
   * Handles both ground collision (spikes) and player collision (all obstacles)
   *
   * Ground collision behavior (spikes only):
   * - Stops particle trail
   * - Fades out and shrinks over 200ms
   * - Destroys after animation
   *
   * Player collision behavior (all obstacles):
   * - Immediately destroys obstacle
   * - Clears active obstacle reference
   * - Triggers player damage through scene.updateLives()
   *
   * @param {Phaser.Physics.Arcade.Sprite} sprite - The obstacle sprite
   * @param {Object} [trail=null] - Optional particle trail for spikes
   * @private
   */
  setupObstacleCollision(sprite, trail = null) {
    // ===== Ground Collision (Spikes Only) =====
    if (sprite.texture.key === "spike") {
      this.scene.physics.add.collider(sprite, this.scene.ground, () => {
        // Stop particle trail
        if (trail) trail.stop();

        // Clear active reference
        if (this.activeSpike === sprite) {
          this.activeSpike = null;
        }

        // Fade out animation for smooth cleanup
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          scale: 0,
          duration: 200,
          onComplete: () => sprite.destroy(),
        });
      });
    }

    // ===== Player Collision (All Obstacles) =====
    this.scene.physics.add.overlap(sprite, this.playerController.player, () => {
      // Immediate cleanup
      sprite.destroy();

      // Clear appropriate active reference
      if (sprite === this.activeSpike) this.activeSpike = null;
      if (sprite === this.activeBall) this.activeBall = null;
      if (sprite === this.activeWeave) this.activeWeave = null;

      // Trigger player damage
      this.scene.updateLives();
    });
  }
}
