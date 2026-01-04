// src/game/controllers/LevelManager.js

import { GAME_CONFIG } from "../config/GameConfig";
import { ObstacleSpawner } from "./ObstacleSpawner";
import { WaveManager } from "./WaveManager";
import { BossManager } from "./BossManager";

// ============================================================================
// DEVELOPMENT CONFIGURATION
// ============================================================================

/**
 * Development mode flag - set to true to enable wave skipping
 * @constant {boolean}
 */
const DEV_MODE = true;

/**
 * Starting wave number when in development mode
 * Useful for testing later waves without playing through entire game
 * @constant {number}
 */
const DEV_START_WAVE = 3;

// ============================================================================

/**
 * LevelManager
 *
 * Central coordinator for level progression and game state management:
 * - Wave lifecycle control (start, stop, progression)
 * - Difficulty scaling over time (Wave 1 only)
 * - Sub-manager coordination (ObstacleSpawner, WaveManager, BossManager)
 * - Player health restoration between waves
 * - Screen shake effects on player damage
 *
 * Wave behavior:
 * - Wave 1: Timer-based with gradual difficulty scaling
 * - Wave 2-3: Fully scripted sequences with no time limits
 *
 * @class
 */
export class LevelManager {
  /**
   * Creates a new LevelManager instance and initializes all sub-managers
   *
   * @param {Phaser.Scene} scene - The game scene this manager operates in
   * @param {PlayerController} playerController - Controller for player state and actions
   */
  constructor(scene, playerController) {
    this.scene = scene;
    this.playerController = playerController;

    // Level state flags
    this.isActive = false; // Whether level is currently running
    this.difficultyMultiplier = 1; // Scales obstacle spawn rates (Wave 1 only)
    this.currentWave = 1; // Current wave number (1-3)

    // ===== Sub-Manager Initialization =====
    // ObstacleSpawner handles spike/ball/weave obstacle creation
    this.obstacleSpawner = new ObstacleSpawner(scene, playerController, this);

    // WaveManager coordinates wave-specific sequences and transitions
    this.waveManager = new WaveManager(
      scene,
      playerController,
      this,
      this.obstacleSpawner
    );

    // BossManager handles all boss appearances and attack patterns
    this.bossManager = new BossManager(scene, playerController, this);

    // ===== Timer References =====
    this.difficultyEvent = null; // Difficulty scaling interval (Wave 1 only)
    this.levelEndTimer = null; // Wave completion timer (Wave 1 only)
  }

  // ============================================================================
  // WAVE LIFECYCLE
  // ============================================================================

  /**
   * Starts a new wave with specified duration and difficulty
   *
   * Wave 1 behavior:
   * - Timed gameplay (default 60 seconds)
   * - Difficulty increases every 15 seconds (+0.2 multiplier)
   * - Ends automatically when timer expires
   *
   * Wave 2-3 behavior:
   * - Purely scripted sequences
   * - No time limits or difficulty scaling
   * - Duration parameter ignored
   *
   * @param {number} [durationSeconds=60] - Wave duration in seconds (Wave 1 only)
   * @param {number} [waveNumber=1] - Which wave to start (1-3)
   */
  startLevel(durationSeconds = 60, waveNumber = 1) {
    this.isActive = true;
    this.currentWave = waveNumber;
    this.difficultyMultiplier = 1; // Reset to base difficulty

    // Delegate wave-specific logic to WaveManager
    this.waveManager.startWave(durationSeconds, waveNumber);

    // ===== Wave 1: Timer-Based Gameplay =====
    if (waveNumber === 1) {
      // Gradually increase difficulty every 15 seconds
      this.difficultyEvent = this.scene.time.addEvent({
        delay: 15000, // 15 second intervals
        callback: () => {
          this.difficultyMultiplier += 0.2; // 20% increase per interval
        },
        loop: true,
      });

      // Automatic wave completion after duration
      this.levelEndTimer = this.scene.time.delayedCall(
        durationSeconds * 1000,
        () => this.stopLevel()
      );
    }
    // ===== Wave 2-3: Scripted Sequences =====
    // No timers needed - sequences end when scripted events complete
  }

  /**
   * Stops the current wave and initiates cleanup sequence
   *
   * Cleanup order:
   * 1. Remove difficulty scaling and completion timers
   * 2. Stop Wave 3 weave spawning (if applicable)
   * 3. Delegate wave ending to WaveManager
   * 4. Deactivate level after 7 second delay
   * 5. Clear all remaining obstacles
   *
   * Note: Active obstacles are allowed to exit naturally rather than
   * being destroyed immediately for smoother transitions
   */
  stopLevel() {
    // ===== Timer Cleanup =====
    if (this.difficultyEvent) {
      this.difficultyEvent.remove();
      this.difficultyEvent = null;
    }
    if (this.levelEndTimer) {
      this.levelEndTimer.remove();
      this.levelEndTimer = null;
    }

    // ===== Wave 3 Special Handling =====
    // CRITICAL: Stop weave spawning BEFORE ending wave
    // Active weave is allowed to exit naturally for smooth transition
    if (this.currentWave === 3) {
      this.waveManager.stopWave3WeaveSpawning();
    }

    // ===== Wave Ending Sequence =====
    // Delegate wave-specific ending logic to WaveManager
    this.waveManager.endWave(this.currentWave);

    // ===== Final Cleanup =====
    // Deactivate after 7 second grace period for animations
    this.scene.time.delayedCall(7000, () => {
      this.isActive = false;
      this.obstacleSpawner.clearAllObstacles();
    });
  }

  // ============================================================================
  // PLAYER STATE MANAGEMENT
  // ============================================================================

  /**
   * Restores player health to 2 hearts if below that amount
   *
   * Called between waves to give player a fresh start.
   * Does not restore if player already has 2 or more hearts.
   * Updates both internal lives counter and visual heart display.
   */
  restoreHealth() {
    if (this.scene.lives < 2) {
      // Set lives to 2
      this.scene.lives = 2;

      // Update all heart sprites to filled state
      this.scene.hearts.forEach((heart) => heart.setTexture("heart"));
    }
  }

  /**
   * Triggers screen shake effect when player takes damage
   *
   * Provides visual feedback for player hits without disrupting gameplay.
   * Shake parameters:
   * - Duration: 200ms
   * - Intensity: 0.02 (subtle shake)
   */
  handlePlayerHit() {
    this.scene.cameras.main.shake(200, 0.02);
  }
}
