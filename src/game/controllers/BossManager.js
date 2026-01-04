// src/game/controllers/BossManager.js

import { GAME_CONFIG } from "../config/GameConfig";

/**
 * BossManager
 *
 * Manages all boss-related behaviors across different game waves including:
 * - Boss spawning and animations
 * - Attack patterns and bullet firing
 * - Obstacle coordination (balls and spikes)
 * - Lane-based attack sequences
 * - Visual warning indicators
 *
 * Wave 1: Single tracked shot
 * Wave 2: Multiple tracked shots with ball obstacles
 * Wave 3: Complex multi-phase final boss sequence with lane attacks
 *
 * @class
 */
export class BossManager {
  /**
   * Creates a new BossManager instance
   *
   * @param {Phaser.Scene} scene - The game scene this manager operates in
   * @param {PlayerController} playerController - Controller for player tracking and collision
   * @param {LevelManager} levelManager - Manager for level state and wave progression
   */
  constructor(scene, playerController, levelManager) {
    this.scene = scene;
    this.playerController = playerController;
    this.levelManager = levelManager;
    this.boss = null;

    // Bullet tracking to prevent memory overflow in intensive wave 3
    this.activeBullets = [];
    this.maxBullets = this.levelManager?.currentWave === 3 ? 5 : 10;

    this.createExclamationTexture();
  }

  // ============================================================================
  // VISUAL ELEMENTS
  // ============================================================================

  /**
   * Creates a reusable exclamation point texture for lane warnings
   * Uses pixel art style consistent with game aesthetics
   *
   * @private
   */
  createExclamationTexture() {
    if (this.scene.textures.exists("exclamation")) return;

    const canvas = document.createElement("canvas");
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Red exclamation point using game's color scheme
    ctx.fillStyle = "#ff004d";

    // Vertical bar (6x18 pixels)
    ctx.fillRect(13, 4, 6, 18);

    // Bottom dot (6x6 pixels)
    ctx.fillRect(13, 24, 6, 6);

    this.scene.textures.addCanvas("exclamation", canvas);
  }

  /**
   * Displays a pulsing warning indicator at a target lane
   * Used before lane attack sequences to give player time to react
   *
   * @param {number} targetX - X coordinate of the lane to warn about
   * @param {Function} callback - Function to execute after warning completes
   */
  showLaneWarning(targetX, callback) {
    // Create warning sprite at target location
    const warning = this.scene.add.sprite(targetX, 1200, "exclamation");
    warning.setScale(8);
    warning.setDepth(150);
    warning.setAlpha(0);

    // Pulsing animation (fade in, scale up, then reverse)
    this.scene.tweens.add({
      targets: warning,
      alpha: 1,
      scale: 10,
      duration: 300,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        warning.destroy();
        if (callback) callback();
      },
    });
  }

  // ============================================================================
  // WAVE 1 BOSS - SINGLE SHOT PATTERN
  // ============================================================================

  /**
   * Spawns the Wave 1 boss with entry animation
   * Pattern: Single aimed shot at player's position
   *
   * @param {Function} onComplete - Callback executed after boss exits
   */
  spawnWave1Boss(onComplete) {
    this.boss = this.scene.add.sprite(540, -300, "shootingBoss");
    this.boss.setScale(30);
    this.boss.setDepth(10);

    // Boss enters from above with bounce effect
    this.scene.tweens.add({
      targets: this.boss,
      y: 400,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.startHoverAnimation();
        this.wave1AimingSequence(onComplete);
      },
    });
  }

  /**
   * Wave 1 aiming sequence with visual telegraph
   * Boss flashes green to indicate charging
   *
   * @param {Function} onComplete - Callback for wave completion
   * @private
   */
  wave1AimingSequence(onComplete) {
    // Green flash indicates boss is aiming
    this.scene.tweens.add({
      targets: this.boss,
      tint: 0x00ff66,
      duration: 500,
      yoyo: true,
      repeat: 9,
      onComplete: () => this.fireWave1Shot(onComplete),
    });
  }

  /**
   * Fires a single tracked shot at player's current position
   * Boss exits after firing
   *
   * @param {Function} onComplete - Callback for wave completion
   * @private
   */
  fireWave1Shot(onComplete) {
    const targetX = this.playerController.player.x;
    const targetY = this.playerController.player.y;

    const bullet = this.createBullet(this.boss.x, this.boss.y);
    this.scene.physics.moveTo(bullet.sprite, targetX, targetY, 1200);

    this.setupBulletCollision(bullet.sprite, bullet.emitter);

    // Exit after 2 second delay
    this.scene.time.delayedCall(2000, () => {
      this.exitBoss(() => {
        if (onComplete) onComplete();
      });
    });
  }

  // ============================================================================
  // WAVE 2 BOSS - MULTI-SHOT PATTERN WITH OBSTACLES
  // ============================================================================

  /**
   * Spawns the Wave 2 boss with entry animation
   * Pattern: 5 tracked shots with rolling ball obstacles
   *
   * @param {Function} onComplete - Callback executed after boss exits
   */
  spawnWave2Boss(onComplete) {
    this.boss = this.scene.add.sprite(540, -300, "shootingBoss");
    this.boss.setScale(30);
    this.boss.setDepth(10);

    this.scene.tweens.add({
      targets: this.boss,
      y: 400,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.startHoverAnimation();
        this.wave2AimingSequence(onComplete);
      },
    });
  }

  /**
   * Wave 2 aiming sequence with faster telegraph
   * Shorter flash duration indicates increased difficulty
   *
   * @param {Function} onComplete - Callback for wave completion
   * @private
   */
  wave2AimingSequence(onComplete) {
    this.scene.tweens.add({
      targets: this.boss,
      tint: 0x00ff66,
      duration: 300,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.fireWave2Shots(onComplete),
    });
  }

  /**
   * Fires 5 tracked shots at 800ms intervals
   * Spawns first rolling ball obstacle after first shot
   *
   * @param {Function} onComplete - Callback for wave completion
   * @private
   */
  fireWave2Shots(onComplete) {
    const shotDelays = [0, 800, 1600, 2400, 3200];

    shotDelays.forEach((delay, index) => {
      this.scene.time.delayedCall(delay, () => {
        this.fireTrackedShot(index);

        // Spawn first ball 500ms after first shot
        if (index === 0) {
          this.scene.time.delayedCall(500, () => {
            this.spawnBallWithTracking();
          });
        }

        // Exit after final shot (index 4)
        if (index === 4) {
          this.scene.time.delayedCall(1000, () => {
            this.exitBoss(() => {
              if (onComplete) onComplete();
            });
          });
        }
      });
    });
  }

  // ============================================================================
  // WAVE 3 FINAL BOSS - COMPLEX MULTI-PHASE SEQUENCE
  // ============================================================================

  /**
   * Spawns the Wave 3 final boss and initiates complex attack sequence
   *
   * Sequence breakdown:
   * 1. First barrage: 10 tracked shots with continuous ball spawning
   * 2. Boss exits, spike shower attack
   * 3. Boss re-enters, second barrage: 10 more tracked shots
   * 4. Boss exits, second spike shower
   * 5. Boss re-enters for lane attacks (left then right)
   * 6. Final exit triggers ending dialogue
   */
  spawnWave3FinalBoss() {
    this.boss = this.scene.add.sprite(540, -300, "shootingBoss");
    this.boss.setScale(30);
    this.boss.setDepth(10);

    this.scene.tweens.add({
      targets: this.boss,
      y: 400,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.startHoverAnimation();
        this.wave3FinalSequence();
      },
    });
  }

  /**
   * Orchestrates the complete Wave 3 final boss sequence
   * Uses precise timing to coordinate multiple attack phases
   *
   * @private
   */
  wave3FinalSequence() {
    let currentTime = 0;

    // ===== PHASE 1: First Barrage (10 shots) =====
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(currentTime, () => {
        this.fireTrackedShot(i);

        // Start continuous ball spawning after first shot
        if (i === 0) {
          this.scene.time.delayedCall(500, () => {
            this.spawnBallWithTracking();
          });
        }
      });
      currentTime += 800; // 800ms between shots
    }

    // Exit after first barrage
    this.scene.time.delayedCall(currentTime + 500, () => {
      this.stopBallSpawning();
      this.exitBoss(() => {});
    });
    currentTime += 2500; // Wait for exit animation

    // ===== PHASE 2: First Spike Shower =====
    this.scene.time.delayedCall(currentTime, () => {
      this.levelManager.waveManager.startSpikeShower();
    });
    currentTime += 7000; // Spike shower duration

    // ===== PHASE 3: Second Barrage (10 shots) =====
    this.scene.time.delayedCall(currentTime, () => {
      this.spawnBossForSecondBarrage();
    });
    currentTime += 2500; // Wait for entrance

    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(currentTime, () => {
        this.fireTrackedShot(i + 10);

        // Restart ball spawning on first shot
        if (i === 0) {
          this.scene.time.delayedCall(500, () => {
            this.spawnBallWithTracking();
          });
        }
      });
      currentTime += 800;
    }

    // Exit after second barrage
    this.scene.time.delayedCall(currentTime + 500, () => {
      this.stopBallSpawning();
      this.exitBoss(() => {});
    });
    currentTime += 2500;

    // ===== PHASE 4: Second Spike Shower =====
    this.scene.time.delayedCall(currentTime, () => {
      this.levelManager.waveManager.startSpikeShower();
    });
    currentTime += 7000;

    // ===== PHASE 5: Lane Attacks =====
    this.scene.time.delayedCall(currentTime, () => {
      this.spawnBossForLaneAttacks();
    });
    currentTime += 2500; // Wait for entrance

    // Left lane attack with 1s warning
    this.scene.time.delayedCall(currentTime, () => {
      this.showLaneWarning(GAME_CONFIG.PLAYER.LEFT_X, () => {
        this.bossFiresToLaneInPlace(GAME_CONFIG.PLAYER.LEFT_X, 10);
      });
    });
    currentTime += 13000; // 1s warning + 12s attack

    // Right lane attack with 1s warning
    this.scene.time.delayedCall(currentTime, () => {
      this.showLaneWarning(GAME_CONFIG.PLAYER.RIGHT_X, () => {
        this.bossFiresToLaneInPlace(GAME_CONFIG.PLAYER.RIGHT_X, 10);
      });
    });
    currentTime += 13000;

    // ===== PHASE 6: Final Exit & Ending =====
    this.scene.time.delayedCall(currentTime, () => {
      this.exitBoss(() => {
        this.levelManager.waveManager.triggerEndingSequence();
      });
    });
  }

  /**
   * Spawns boss for second barrage (Wave 3 phase 3)
   * Boss re-enters after first spike shower
   *
   * @private
   */
  spawnBossForSecondBarrage() {
    this.boss = this.scene.add.sprite(540, -300, "shootingBoss");
    this.boss.setScale(30);
    this.boss.setDepth(10);

    this.scene.tweens.add({
      targets: this.boss,
      y: 400,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.startHoverAnimation();
      },
    });
  }

  /**
   * Spawns boss for lane attack phase (Wave 3 phase 5)
   * Boss remains on screen for multiple lane attacks
   *
   * @private
   */
  spawnBossForLaneAttacks() {
    this.boss = this.scene.add.sprite(540, -300, "shootingBoss");
    this.boss.setScale(30);
    this.boss.setDepth(10);

    this.scene.tweens.add({
      targets: this.boss,
      y: 400,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.startHoverAnimation();
      },
    });
  }

  // ============================================================================
  // LANE ATTACK SYSTEMS
  // ============================================================================

  /**
   * Complete lane attack with boss entry and exit
   * Used in Wave 3 scripted sequences
   *
   * Sequence: Boss enters → Warning → Fires → Exits
   *
   * @param {number} targetX - X coordinate of target lane
   * @param {number} shotCount - Number of shots to fire at lane
   */
  bossFiresToLaneWithEntryExit(targetX, shotCount) {
    this.boss = this.scene.add.sprite(540, -300, "shootingBoss");
    this.boss.setScale(30);
    this.boss.setDepth(10);

    this.scene.tweens.add({
      targets: this.boss,
      y: 400,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.startHoverAnimation();

        // Show warning before firing
        this.showLaneWarning(targetX, () => {
          // Fire shots at 1 second intervals
          for (let i = 0; i < shotCount; i++) {
            this.scene.time.delayedCall(i * 1000, () => {
              this.fireShotToPosition(targetX, GAME_CONFIG.GROUND.Y - 50);

              // Start ball spawning after first shot
              if (i === 0) {
                this.scene.time.delayedCall(500, () => {
                  this.startLaneBallSpawning(shotCount * 1000);
                });
              }
            });
          }

          // Exit after all shots complete
          this.scene.time.delayedCall(shotCount * 1000 + 1500, () => {
            this.exitBoss(() => {});
          });
        });
      },
    });
  }

  /**
   * Lane attack when boss is already on screen
   * Used in final boss sequence where boss stays visible
   *
   * @param {number} targetX - X coordinate of target lane
   * @param {number} shotCount - Number of shots to fire at lane
   */
  bossFiresToLaneInPlace(targetX, shotCount) {
    // Fire shots at 1 second intervals
    for (let i = 0; i < shotCount; i++) {
      this.scene.time.delayedCall(i * 1000, () => {
        this.fireShotToPosition(targetX, GAME_CONFIG.GROUND.Y - 50);

        // Start ball spawning after first shot
        if (i === 0) {
          this.scene.time.delayedCall(500, () => {
            this.startLaneBallSpawning(shotCount * 1000);
          });
        }
      });
    }
  }

  /**
   * Starts continuous ball spawning during lane attacks
   * Checks every 100ms and spawns new ball when previous one exits
   *
   * @param {number} duration - How long to maintain ball spawning (ms)
   * @private
   */
  startLaneBallSpawning(duration) {
    // Spawn first ball immediately
    this.levelManager.obstacleSpawner.spawnBall();

    // Continuous spawning loop
    this.laneBallInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        const currentBall = this.levelManager.obstacleSpawner.activeBall;

        // Spawn new ball if none active
        if (!currentBall) {
          this.levelManager.obstacleSpawner.spawnBall();
        }
      },
      loop: true,
    });

    // Stop after duration
    this.scene.time.delayedCall(duration, () => {
      this.stopLaneBallSpawning();
    });
  }

  /**
   * Stops continuous lane ball spawning
   * Cleans up interval and destroys active ball
   *
   * @private
   */
  stopLaneBallSpawning() {
    if (this.laneBallInterval) {
      this.laneBallInterval.remove();
      this.laneBallInterval = null;
    }

    // Clean up any active ball
    if (this.levelManager.obstacleSpawner.activeBall) {
      this.levelManager.obstacleSpawner.activeBall.destroy();
      this.levelManager.obstacleSpawner.activeBall = null;
    }
  }

  // ============================================================================
  // BULLET AND PROJECTILE SYSTEMS
  // ============================================================================

  /**
   * Fires a single bullet tracked to player's current position
   * Includes bullet cleanup and limit enforcement for Wave 3
   *
   * @param {number} shotNumber - Shot index for tracking purposes
   */
  fireTrackedShot(shotNumber) {
    // Remove off-screen bullets first
    this.cleanupBullets();

    // Enforce bullet limit in Wave 3 for performance
    if (
      this.levelManager.currentWave === 3 &&
      this.activeBullets.length >= this.maxBullets
    ) {
      // Destroy oldest bullet to make room
      const oldest = this.activeBullets.shift();
      if (oldest.sprite && oldest.sprite.active) {
        oldest.sprite.destroy();
      }
      if (oldest.emitter && oldest.emitter.destroy) {
        oldest.emitter.destroy();
      }
    }

    // Fire at player's current position
    const targetX = this.playerController.player.x;
    const targetY = this.playerController.player.y;

    const bullet = this.createBullet(this.boss.x, this.boss.y);
    this.scene.physics.moveTo(bullet.sprite, targetX, targetY, 1800);
    this.setupBulletCollision(bullet.sprite, bullet.emitter);

    // Add to tracking array
    this.activeBullets.push(bullet);
  }

  /**
   * Removes bullets that are off-screen or destroyed
   * Prevents memory leaks during extended boss fights
   *
   * @private
   */
  cleanupBullets() {
    this.activeBullets = this.activeBullets.filter((bullet) => {
      // Check if sprite still exists and is active
      if (!bullet.sprite || !bullet.sprite.active) {
        return false;
      }

      const sprite = bullet.sprite;

      // Check if bullet is off-screen (with generous bounds)
      if (
        sprite.y > 2000 ||
        sprite.y < -500 ||
        sprite.x < -500 ||
        sprite.x > 1600
      ) {
        // Destroy off-screen bullet and its particle emitter
        sprite.destroy();
        if (bullet.emitter && bullet.emitter.destroy) {
          bullet.emitter.destroy();
        }
        return false;
      }

      // Keep bullet in tracking array
      return true;
    });
  }

  /**
   * Fires a bullet to a specific position (used for lane attacks)
   *
   * @param {number} targetX - X coordinate of target
   * @param {number} targetY - Y coordinate of target
   */
  fireShotToPosition(targetX, targetY) {
    if (!this.boss) return;

    const bullet = this.createBullet(this.boss.x, this.boss.y);
    this.scene.physics.moveTo(bullet.sprite, targetX, targetY, 1800);
    this.setupBulletCollision(bullet.sprite, bullet.emitter);
  }

  /**
   * Creates a bullet sprite with particle trail effect
   * Wave 3 disables particle emitters for performance optimization
   *
   * @param {number} x - Starting X position
   * @param {number} y - Starting Y position
   * @returns {{sprite: Phaser.Physics.Arcade.Sprite, emitter: Object}} Bullet object with sprite and emitter
   * @private
   */
  createBullet(x, y) {
    // Play shooting sound effect
    if (this.scene.audioManager) {
      this.scene.audioManager.playPlasmaSound();
    }

    // Create physics-enabled sprite
    const sprite = this.scene.physics.add.sprite(x, y, "plasma");
    sprite.setScale(4);
    sprite.body.setAllowGravity(false);

    let emitter = null;

    if (this.levelManager.currentWave !== 3) {
      // Waves 1 & 2: Full particle trail effect
      emitter = this.scene.add.particles(0, 0, "plasma", {
        speed: 20,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 500,
        follow: sprite,
        blendMode: "ADD",
      });
    } else {
      // Wave 3: Dummy emitter to prevent crashes (performance optimization)
      emitter = {
        destroy: () => {},
      };
    }

    return { sprite, emitter };
  }

  /**
   * Sets up collision detection between bullet and player
   * Triggers life loss and cleanup on hit
   *
   * @param {Phaser.Physics.Arcade.Sprite} bullet - The bullet sprite
   * @param {Object} emitter - The particle emitter attached to bullet
   * @private
   */
  setupBulletCollision(bullet, emitter) {
    this.scene.physics.add.overlap(this.playerController.player, bullet, () => {
      // Player loses a life
      this.scene.updateLives();

      // Destroy bullet and its particle effect
      bullet.destroy();
      if (emitter && emitter.destroy) {
        emitter.destroy();
      }

      // Remove from tracking array
      this.activeBullets = this.activeBullets.filter(
        (b) => b.sprite !== bullet
      );
    });
  }

  // ============================================================================
  // CONTINUOUS OBSTACLE SPAWNING
  // ============================================================================

  /**
   * Starts continuous ball spawning system
   * Automatically spawns new balls as previous ones exit screen
   * Used during boss barrages in Wave 2 and 3
   */
  spawnBallWithTracking() {
    // Spawn initial ball
    this.levelManager.obstacleSpawner.spawnBall();

    // Check every 100ms if new ball is needed
    this.ballCheckInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        const currentBall = this.levelManager.obstacleSpawner.activeBall;

        // Spawn new ball if none active
        if (!currentBall) {
          this.levelManager.obstacleSpawner.spawnBall();
        }

        // Stop if boss is gone or level ended
        if (!this.boss || !this.levelManager.isActive) {
          this.stopBallSpawning();
        }
      },
      loop: true,
    });
  }

  /**
   * Stops continuous ball spawning
   * Cleans up interval timer and active ball
   */
  stopBallSpawning() {
    if (this.ballCheckInterval) {
      this.ballCheckInterval.remove();
      this.ballCheckInterval = null;
    }

    // Destroy any active ball
    if (this.levelManager.obstacleSpawner.activeBall) {
      this.levelManager.obstacleSpawner.activeBall.destroy();
      this.levelManager.obstacleSpawner.activeBall = null;
    }
  }

  // ============================================================================
  // BOSS ANIMATION CONTROLS
  // ============================================================================

  /**
   * Starts the boss idle hover animation
   * Smooth vertical oscillation to make boss feel alive
   */
  startHoverAnimation() {
    if (!this.boss) return;

    // Clean up any existing hover animation
    this.scene.tweens.killTweensOf(this.boss);

    // Create new hover tween
    this.hoverTween = this.scene.tweens.add({
      targets: this.boss,
      y: this.boss.y - 20,
      duration: 2000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1, // Loop infinitely
    });
  }

  /**
   * Stops the boss hover animation
   * Called before boss exits or is destroyed
   *
   * @private
   */
  stopHoverAnimation() {
    if (this.hoverTween) {
      this.hoverTween.remove();
      this.hoverTween = null;
    }
  }

  // ============================================================================
  // BOSS LIFECYCLE
  // ============================================================================

  /**
   * Smoothly exits the boss from the scene
   * Animates upward off-screen then destroys sprite
   *
   * @param {Function} onComplete - Callback executed after exit completes
   */
  exitBoss(onComplete) {
    if (!this.boss) {
      if (onComplete) onComplete();
      return;
    }

    // Stop hover before exit
    this.stopHoverAnimation();

    // Store reference and clear this.boss to prevent reuse
    const exitingBoss = this.boss;
    this.boss = null;

    // Animate exit upward
    this.scene.tweens.add({
      targets: exitingBoss,
      y: -500,
      duration: 2000,
      onComplete: () => {
        exitingBoss.destroy();
        if (onComplete) onComplete();
      },
    });
  }
}
