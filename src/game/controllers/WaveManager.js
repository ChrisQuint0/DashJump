// src/game/controllers/WaveManager.js

import { GAME_CONFIG } from "../config/GameConfig";

/**
 * WaveManager
 *
 * Orchestrates all wave-specific gameplay sequences and transitions:
 * - Wave 1: Dynamic difficulty-scaled obstacle spawning with combo scenarios
 * - Wave 2: Fully scripted sequence with precise obstacle ordering
 * - Wave 3: Complex multi-phase final boss encounter
 *
 * Responsibilities:
 * - Obstacle spawn timing and coordination
 * - Boss fight sequences and transitions
 * - Spike shower attacks (3-spike mini, 10-spike full)
 * - Dialogue sequences between waves
 * - Music transitions (wave music ↔ boss music)
 * - Performance optimizations for intensive sequences
 *
 * Wave progression:
 * Wave 1 → Post-boss dialogue → Wave 2 → Pre-Wave 3 dialogue → Wave 3 → Ending
 *
 * @class
 */
export class WaveManager {
  /**
   * Creates a new WaveManager instance
   *
   * @param {Phaser.Scene} scene - The game scene for timing and spawning
   * @param {PlayerController} playerController - Controller for player state checks
   * @param {LevelManager} levelManager - Manager for level state and boss coordination
   * @param {ObstacleSpawner} obstacleSpawner - Spawner for creating obstacles
   */
  constructor(scene, playerController, levelManager, obstacleSpawner) {
    this.scene = scene;
    this.playerController = playerController;
    this.levelManager = levelManager;
    this.obstacleSpawner = obstacleSpawner;

    // State tracking flags
    this.isSpikeShowerMode = false; // Prevents spawning during showers
    this.lastScenarioIndex = -1; // Prevents consecutive duplicate scenarios
    this.isBossActive = false; // Prevents spawning during boss fights
  }

  // ============================================================================
  // WAVE INITIALIZATION
  // ============================================================================

  /**
   * Starts a wave with appropriate behavior based on wave number
   *
   * Wave behaviors:
   * - Wave 1: Dynamic spawning with increasing difficulty
   * - Wave 2: Scripted sequence with 31 predefined steps
   * - Wave 3: Complex boss sequence with continuous weave spawning
   *
   * @param {number} durationSeconds - Wave duration (unused for Waves 2-3)
   * @param {number} waveNumber - Which wave to start (1-3)
   */
  startWave(durationSeconds, waveNumber) {
    // Reset state flags
    this.isSpikeShowerMode = false;
    this.isBossActive = false;

    // Route to appropriate wave logic
    if (waveNumber === 2) {
      this.startWave2Sequence();
      return;
    }

    if (waveNumber === 3) {
      this.startWave3Sequence();
      return;
    }

    // Wave 1: Dynamic spawning system
    this.planNextAction(waveNumber);
  }

  /**
   * Plans and schedules the next obstacle action
   * Only used for Wave 1's dynamic spawning system
   *
   * @param {number} waveNumber - Current wave number
   * @private
   */
  planNextAction(waveNumber) {
    // Safety checks: Don't spawn during boss fights or if level ended
    if (!this.levelManager.isActive || this.isBossActive) return;

    if (waveNumber === 1) {
      this.planWave1Action();
    }
  }

  // ============================================================================
  // WAVE 1 - DYNAMIC DIFFICULTY SPAWNING
  // ============================================================================

  /**
   * Plans next action for Wave 1's dynamic spawning system
   *
   * Decision tree:
   * 1. If spike is active, wait 500ms and retry
   * 2. 40% chance: Spawn combo scenario (if no ball active)
   * 3. 60% chance: Spawn targeted spike
   * 4. Schedule next action based on obstacle type
   *
   * Delays scale inversely with difficulty multiplier for increasing challenge
   *
   * @private
   */
  planWave1Action() {
    // Safety checks
    if (!this.levelManager.isActive || this.isBossActive) return;

    // Wait if spike is already active (prevents overlap)
    if (this.obstacleSpawner.activeSpike) {
      this.scene.time.delayedCall(500, () =>
        this.planNextAction(this.levelManager.currentWave)
      );
      return;
    }

    // Random action selection
    const actionType = Math.random();

    // 40% chance: Combo scenario (if no ball present)
    if (actionType < 0.4 && !this.obstacleSpawner.activeBall) {
      this.triggerRandomScenario();
    }
    // 60% chance: Simple targeted spike
    else {
      this.obstacleSpawner.spawnTargetedSpike();
    }

    // Calculate delay until next action (scales with difficulty)
    const nextDelay = this.obstacleSpawner.activeBall ? 2500 : 1800;
    this.scene.time.delayedCall(
      nextDelay / this.levelManager.difficultyMultiplier,
      () => this.planNextAction(1)
    );
  }

  // ============================================================================
  // WAVE 1 COMBO SCENARIOS
  // ============================================================================

  /**
   * Selects and triggers a random combo scenario
   * Prevents same scenario from repeating consecutively
   *
   * Available scenarios:
   * - The Double Dash: Left spike → Right spike (tests quick lane switching)
   * - The Trap: Ball → Targeted spike (forces jump + dash combo)
   * - The Side Switch: Lane spike → Ball (forces dash + jump combo)
   *
   * @private
   */
  triggerRandomScenario() {
    const scenarios = [
      () => this.scenarioTheDoubleDash(),
      () => this.scenarioTheTrap(),
      () => this.scenarioTheSideSwitch(),
    ];

    // Select random scenario, avoiding consecutive duplicates
    let index;
    do {
      index = Phaser.Math.Between(0, scenarios.length - 1);
    } while (index === this.lastScenarioIndex);

    this.lastScenarioIndex = index;
    scenarios[index]();
  }

  /**
   * "The Double Dash" scenario
   * Tests player's ability to quickly switch lanes twice
   *
   * Sequence:
   * 1. Spike falls on left lane
   * 2. 800ms delay
   * 3. Spike falls on right lane
   * 4. 1500ms delay before next action
   *
   * @private
   */
  scenarioTheDoubleDash() {
    this.obstacleSpawner.spawnLaneSpike(GAME_CONFIG.PLAYER.LEFT_X);

    this.scene.time.delayedCall(800, () => {
      this.obstacleSpawner.spawnLaneSpike(GAME_CONFIG.PLAYER.RIGHT_X);

      this.scene.time.delayedCall(1500, () =>
        this.planNextAction(this.levelManager.currentWave)
      );
    });
  }

  /**
   * "The Trap" scenario
   * Forces player to jump over ball then dash away from spike
   *
   * Sequence:
   * 1. Ball rolls across screen
   * 2. 800ms delay
   * 3. Spike targets player's position
   *
   * Fallback: If ball or spike already active, spawns simple spike instead
   *
   * @private
   */
  scenarioTheTrap() {
    // Safety check: Don't overlap with existing obstacles
    if (this.obstacleSpawner.activeBall || this.obstacleSpawner.activeSpike) {
      this.obstacleSpawner.spawnTargetedSpike();
      return;
    }

    this.obstacleSpawner.spawnBall();

    this.scene.time.delayedCall(800, () => {
      this.obstacleSpawner.spawnTargetedSpike();
    });
  }

  /**
   * "The Side Switch" scenario
   * Forces player to dash away from spike then jump over ball
   *
   * Sequence:
   * 1. Spike targets player's current lane
   * 2. 1200ms delay (player dashes to other lane)
   * 3. Ball rolls toward player
   * 4. 1500ms delay before next action
   *
   * @private
   */
  scenarioTheSideSwitch() {
    const startX = this.playerController.player.x;
    this.obstacleSpawner.spawnLaneSpike(startX);

    this.scene.time.delayedCall(1200, () => {
      this.obstacleSpawner.spawnBall();

      this.scene.time.delayedCall(1500, () =>
        this.planNextAction(this.levelManager.currentWave)
      );
    });
  }

  // ============================================================================
  // SPIKE SHOWERS - TWO VARIANTS
  // ============================================================================

  /**
   * Spawns a mini spike shower (3 spikes)
   * Used in Wave 1 as part of dynamic spawning, and Wave 2 as sequence step
   *
   * Pattern: Left → Right → Left with 500ms gaps
   * Total duration: 1500ms
   *
   * Wave 1 behavior: Spawns ball after shower
   * Wave 2 behavior: Controlled by sequence (no automatic ball)
   *
   * @private
   */
  spawnMiniSpikeShower() {
    const sequence = [
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 0 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 500 },
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 1000 },
    ];

    sequence.forEach((spike) => {
      this.scene.time.delayedCall(spike.delay, () => {
        if (this.levelManager.isActive) {
          this.obstacleSpawner.spawnLaneSpike(spike.x);
        }
      });
    });

    // Wave 1 only: Spawn ball after shower
    this.scene.time.delayedCall(1500, () => {
      if (this.levelManager.isActive && this.levelManager.currentWave === 1) {
        this.obstacleSpawner.spawnBall();
      }
    });
  }

  /**
   * Spawns a full spike shower (10 spikes)
   * Used as dramatic attack in boss sequences (Waves 2 and 3)
   *
   * Pattern: Alternates left/right with 500ms gaps
   * Total duration: 5000ms (spawn time) + 1500ms (exit time) = 6500ms
   *
   * Sets isSpikeShowerMode flag to prevent other spawning during shower
   *
   * @private
   */
  startSpikeShower() {
    this.isSpikeShowerMode = true;

    // 10 spikes alternating lanes, 500ms apart
    const sequence = [
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 0 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 500 },
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 1000 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 1500 },
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 2000 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 2500 },
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 3000 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 3500 },
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 4000 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 4500 },
    ];

    sequence.forEach((spike) => {
      this.scene.time.delayedCall(spike.delay, () => {
        this.obstacleSpawner.spawnShowerSpike(spike.x);
      });
    });

    // Placeholder for potential future logic at 6000ms
    this.scene.time.delayedCall(6000, () => {});

    // Clear shower mode flag after all spikes exit
    this.scene.time.delayedCall(6500, () => {
      this.isSpikeShowerMode = false;
    });
  }

  // ============================================================================
  // WAVE 2 - FULLY SCRIPTED SEQUENCE (31 STEPS)
  // ============================================================================

  /**
   * Initializes Wave 2's scripted obstacle sequence
   *
   * 31-step progression introduces weaves gradually:
   * - Early: Spikes and balls (familiar mechanics)
   * - Mid: First weaves appear with mini showers
   * - Late: Heavy weave focus with frequent mini showers
   * - Finale: Triple mini shower burst
   *
   * Uses polling system to wait for obstacle clearance before spawning next
   *
   * @private
   */
  startWave2Sequence() {
    // Initialize tracking flags
    this.isShowerActive = false;

    // 31-step scripted sequence
    this.wave2Sequence = [
      { type: "spike" },
      { type: "ball" },
      { type: "spike" },
      { type: "ball" },
      { type: "weave" }, // First weave introduction
      { type: "miniShower" },
      { type: "ball" },
      { type: "weave" },
      { type: "miniShower" },
      { type: "ball" },
      { type: "miniShower" },
      { type: "ball" },
      { type: "miniShower" },
      { type: "weave" },
      { type: "ball" },
      { type: "weave" },
      { type: "ball" },
      { type: "weave" },
      { type: "ball" },
      { type: "weave" },
      { type: "miniShower" },
      { type: "ball" },
      { type: "weave" },
      { type: "miniShower" },
      { type: "weave" },
      { type: "spike" },
      { type: "ball" },
      { type: "weave" },
      { type: "miniShower" }, // Finale begins
      { type: "miniShower" },
      { type: "miniShower" }, // Triple shower finale
    ];

    this.wave2SequenceIndex = 0;
    this.processNextWave2Step();
  }

  /**
   * Processes the next step in Wave 2's scripted sequence
   *
   * Flow control:
   * - If level ended: Stop processing
   * - If sequence complete: Trigger level end
   * - Otherwise: Execute current step and increment index
   *
   * Each obstacle type has its own spawn-and-wait method
   *
   * @private
   */
  processNextWave2Step() {
    // Check if level is still active
    if (!this.levelManager.isActive) {
      return;
    }

    // Check if sequence is complete
    if (this.wave2SequenceIndex >= this.wave2Sequence.length) {
      this.levelManager.stopLevel();
      return;
    }

    // Get current step and increment index
    const step = this.wave2Sequence[this.wave2SequenceIndex];
    this.wave2SequenceIndex++;

    // Route to appropriate spawn method
    switch (step.type) {
      case "spike":
        this.spawnSpikeAndWait();
        break;
      case "ball":
        this.spawnBallAndWait();
        break;
      case "weave":
        this.spawnWeaveAndWait();
        break;
      case "miniShower":
        this.spawnMiniShowerAndWait();
        break;
    }
  }

  /**
   * Spawns a spike and waits for it to clear before continuing
   *
   * Behavior:
   * - If any obstacle is active, retry after 200ms (with index decrement)
   * - Otherwise, spawn spike and poll every 100ms until cleared
   * - After clearing, 300ms delay before next step
   *
   * @private
   */
  spawnSpikeAndWait() {
    // Check for obstacle conflicts
    if (
      this.obstacleSpawner.activeSpike ||
      this.obstacleSpawner.activeBall ||
      this.obstacleSpawner.activeWeave ||
      this.isShowerActive
    ) {
      // Retry this step after short delay
      this.scene.time.delayedCall(200, () => {
        this.wave2SequenceIndex--; // Retry same step
        this.processNextWave2Step();
      });
      return;
    }

    this.obstacleSpawner.spawnTargetedSpike();

    // Poll for spike clearance
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.obstacleSpawner.activeSpike) {
          checkInterval.remove();
          // Brief pause before next obstacle
          this.scene.time.delayedCall(300, () => this.processNextWave2Step());
        }
      },
      loop: true,
    });
  }

  /**
   * Spawns a ball and waits for it to clear before continuing
   *
   * Same polling logic as spawnSpikeAndWait() but for balls
   *
   * @private
   */
  spawnBallAndWait() {
    // Check for obstacle conflicts
    if (
      this.obstacleSpawner.activeSpike ||
      this.obstacleSpawner.activeBall ||
      this.obstacleSpawner.activeWeave ||
      this.isShowerActive
    ) {
      // Retry this step after short delay
      this.scene.time.delayedCall(200, () => {
        this.wave2SequenceIndex--;
        this.processNextWave2Step();
      });
      return;
    }

    this.obstacleSpawner.spawnBall();

    // Poll for ball clearance
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.obstacleSpawner.activeBall) {
          checkInterval.remove();
          this.scene.time.delayedCall(300, () => this.processNextWave2Step());
        }
      },
      loop: true,
    });
  }

  /**
   * Spawns a weave and waits for it to clear before continuing
   *
   * Same polling logic as other spawn-and-wait methods
   *
   * @private
   */
  spawnWeaveAndWait() {
    // Check for obstacle conflicts
    if (
      this.obstacleSpawner.activeSpike ||
      this.obstacleSpawner.activeBall ||
      this.obstacleSpawner.activeWeave ||
      this.isShowerActive
    ) {
      // Retry this step after short delay
      this.scene.time.delayedCall(200, () => {
        this.wave2SequenceIndex--;
        this.processNextWave2Step();
      });
      return;
    }

    this.obstacleSpawner.spawnWeave();

    // Poll for weave clearance
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.obstacleSpawner.activeWeave) {
          checkInterval.remove();
          this.scene.time.delayedCall(300, () => this.processNextWave2Step());
        }
      },
      loop: true,
    });
  }

  /**
   * Spawns a mini shower and waits for ALL spikes to clear
   *
   * Complex tracking:
   * - Sets isShowerActive flag immediately (prevents overlaps)
   * - Spawns 3 spikes with individual tracking
   * - Polls every 100ms checking if all 3 are destroyed
   * - Only continues when ALL spikes are cleared
   * - 500ms delay before next step (longer than single obstacles)
   *
   * Note: Creates own spike sprites instead of using obstacleSpawner
   * to enable individual tracking of all 3 shower spikes
   *
   * @private
   */
  spawnMiniShowerAndWait() {
    // Check for obstacle conflicts
    if (
      this.obstacleSpawner.activeSpike ||
      this.obstacleSpawner.activeBall ||
      this.obstacleSpawner.activeWeave ||
      this.isShowerActive
    ) {
      this.scene.time.delayedCall(200, () => {
        this.wave2SequenceIndex--;
        this.processNextWave2Step();
      });
      return;
    }

    // Mark shower as active IMMEDIATELY to prevent overlaps
    this.isShowerActive = true;

    // Track all spikes spawned in this shower
    this.miniShowerSpikes = [];

    const sequence = [
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 0 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 500 },
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 1000 },
    ];

    // Spawn each spike with individual tracking
    sequence.forEach((spikeData, index) => {
      this.scene.time.delayedCall(spikeData.delay, () => {
        if (this.levelManager.isActive && this.isShowerActive) {
          // Create spike sprite
          const spike = this.scene.physics.add.sprite(
            spikeData.x,
            -100,
            "spike"
          );
          spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
          spike.body.setAllowGravity(false);

          // Add to tracking array
          this.miniShowerSpikes.push(spike);

          const trail = this.createSpikeTrailForShower(spike);

          // Warning phase
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

          this.setupShowerSpikeCollision(spike, trail);
        }
      });
    });

    // Poll for ALL shower spikes to be cleared
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        // Wait for all 3 spikes to spawn first
        if (this.miniShowerSpikes.length < 3) {
          return;
        }

        // Check if all spikes are destroyed
        const allCleared = this.miniShowerSpikes.every(
          (spike) => !spike || !spike.active
        );

        if (allCleared) {
          // All spikes cleared - continue sequence
          checkInterval.remove();
          this.miniShowerSpikes = [];
          this.isShowerActive = false;

          // Longer delay for shower (500ms vs 300ms for single obstacles)
          this.scene.time.delayedCall(500, () => {
            this.processNextWave2Step();
          });
        }
      },
      loop: true,
    });
  }

  /**
   * Creates a particle trail for shower spike sprites
   * Same as ObstacleSpawner but needed here for manual shower spike creation
   *
   * @param {Phaser.Physics.Arcade.Sprite} spike - The spike to attach trail to
   * @returns {Phaser.GameObjects.Particles.ParticleEmitter} The particle emitter
   * @private
   */
  createSpikeTrailForShower(spike) {
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

  /**
   * Sets up collision detection for manually created shower spikes
   *
   * Handles:
   * - Ground collision: Crumble animation
   * - Player collision: Damage and destroy
   *
   * @param {Phaser.Physics.Arcade.Sprite} spike - The spike sprite
   * @param {Phaser.GameObjects.Particles.ParticleEmitter} trail - The particle trail
   * @private
   */
  setupShowerSpikeCollision(spike, trail) {
    // Ground collision
    this.scene.physics.add.collider(spike, this.scene.ground, () => {
      if (trail) trail.stop();

      // Crumble animation
      this.scene.tweens.add({
        targets: spike,
        alpha: 0,
        scale: 0,
        duration: 200,
        onComplete: () => spike.destroy(),
      });
    });

    // Player collision
    this.scene.physics.add.overlap(spike, this.playerController.player, () => {
      spike.destroy();
      this.scene.updateLives();
    });
  }

  // ============================================================================
  // WAVE 3 - CONTINUOUS WEAVE SPAWNING
  // ============================================================================

  /**
   * Starts continuous weave spawning for Wave 3
   *
   * Pattern:
   * - Spawns first weave immediately
   * - Polls every 300ms for active weave
   * - Spawns new weave when previous one exits
   * - Continues until manually stopped
   *
   * Performance optimization: 300ms polling (was 200ms)
   * Reduces checks by 33% with minimal impact on spawn timing
   *
   * @private
   */
  startWave3WeaveSpawning() {
    // Spawn first weave immediately
    this.spawnWeaveForWave3();

    // OPTIMIZED: Increased delay from 200ms to 300ms
    // Reduces polling frequency by 33% for better performance
    this.wave3WeaveInterval = this.scene.time.addEvent({
      delay: 300,
      callback: () => {
        // Only spawn if no active weave exists
        if (!this.obstacleSpawner.activeWeave && this.levelManager.isActive) {
          this.spawnWeaveForWave3();
        }
      },
      loop: true,
    });
  }

  /**
   * Spawns a single weave for Wave 3 continuous spawning
   * Safety check prevents overlapping weaves
   *
   * @private
   */
  spawnWeaveForWave3() {
    if (this.obstacleSpawner.activeWeave) return;

    this.obstacleSpawner.spawnWeave();
  }

  /**
   * Stops continuous weave spawning
   *
   * Note: Does NOT destroy active weave - allows it to exit naturally
   * for smoother transitions. This is intentional design.
   *
   * @private
   */
  stopWave3WeaveSpawning() {
    if (this.wave3WeaveInterval) {
      this.wave3WeaveInterval.remove();
      this.wave3WeaveInterval = null;
    }
    // Active weave allowed to exit naturally
  }

  // ============================================================================
  // WAVE 3 - MAIN SEQUENCE (BEFORE FINAL BOSS)
  // ============================================================================

  /**
   * Orchestrates Wave 3's complex pre-boss sequence
   *
   * 7-phase timeline (~2 minutes):
   * 1. Opening attacks (spikes and balls)
   * 2. First spike shower (10 spikes)
   * 3. Mixed obstacle section
   * 4. Boss lane attack #1 (left lane, 10 shots)
   * 5. Spike shower #2
   * 6. Boss lane attack #2 (right lane, 10 shots)
   * 7. Continuous weave section (30 seconds)
   *
   * Timing tracked with currentTime accumulator for precise scheduling
   *
   * Performance: Reduces particle quality at start for intensive boss fight
   *
   * @private
   */
  startWave3Sequence() {
    // Performance optimization for final boss
    if (this.scene.particleEffects) {
      this.scene.particleEffects.reduceParticleQuality();
    }

    let currentTime = 0;

    // Helper function for accumulating delays
    const scheduleEvent = (callback, delay) => {
      this.scene.time.delayedCall(currentTime + delay, callback);
      currentTime += delay;
      return currentTime;
    };

    // ===== Phase 1: Opening Attacks =====
    scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
    scheduleEvent(() => {}, 2000); // Pause

    scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.startSpikeShower(), 0);
    scheduleEvent(() => {}, 7000); // Shower duration

    scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
    scheduleEvent(() => {}, 2000);

    // ===== Phase 2: First Boss Lane Attack =====
    // Boss enters, warns, fires 10 shots at left lane, exits
    scheduleEvent(
      () =>
        this.levelManager.bossManager.bossFiresToLaneWithEntryExit(
          GAME_CONFIG.PLAYER.LEFT_X,
          10 // 10 shots
        ),
      0
    );
    scheduleEvent(() => {}, 17000); // 1s warning + 16s attack

    // ===== Phase 3: Mixed Obstacles =====
    scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.startSpikeShower(), 0);
    scheduleEvent(() => {}, 7000);

    // ===== Phase 4: Second Boss Lane Attack =====
    // Boss enters, warns, fires 10 shots at right lane, exits
    scheduleEvent(
      () =>
        this.levelManager.bossManager.bossFiresToLaneWithEntryExit(
          GAME_CONFIG.PLAYER.RIGHT_X,
          10
        ),
      0
    );
    scheduleEvent(() => {}, 17000);

    // ===== Phase 5: Continuous Weave Section (30 seconds) =====
    scheduleEvent(() => this.startWave3WeaveSpawning(), 0);

    // Let weaves run for 30 seconds
    scheduleEvent(() => {}, 30000);

    // ===== Phase 6: End Sequence =====
    scheduleEvent(() => {
      this.stopWave3WeaveSpawning();
      this.levelManager.stopLevel();
    }, 0);
  }

  // ============================================================================
  // WAVE ENDING ORCHESTRATION
  // ============================================================================

  /**
   * Routes to appropriate wave ending sequence based on wave number
   *
   * @param {number} waveNumber - Which wave is ending (1-3)
   */
  endWave(waveNumber) {
    if (waveNumber === 1) {
      this.endWave1();
    } else if (waveNumber === 2) {
      this.endWave2();
    } else if (waveNumber === 3) {
      this.endWave3();
    }
  }

  /**
   * Wave 1 ending sequence
   *
   * Timeline:
   * 1. Set boss active flag
   * 2. Transition to boss music
   * 3. Show warning text (fade in, hold 3s, fade out)
   * 4. Spawn Wave 1 boss (single shot pattern)
   * 5. On boss defeat, trigger post-boss dialogue
   *
   * @private
   */
  endWave1() {
    this.isBossActive = true;

    // Transition to boss music
    if (this.scene.audioManager) {
      this.scene.audioManager.transitionToBossMusic();
    }

    // Warning message
    const warningText = this.scene.add
      .text(540, 960, "You better move,\nhe's aiming.\nDon't get shot.", {
        fontFamily: '"Press Start 2P"',
        fontSize: "45px",
        fill: "#ff004d",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    this.scene.tweens.add({
      targets: warningText,
      alpha: 1,
      duration: 1000,
      yoyo: true, // Fade in then out
      hold: 3000, // Hold at full opacity for 3s
      onComplete: () => {
        warningText.destroy();

        // Spawn Wave 1 boss
        this.levelManager.bossManager.spawnWave1Boss(() => {
          this.isBossActive = false;
          this.triggerPostBossSequence(); // Continue to Wave 2
        });
      },
    });
  }

  /**
   * Wave 2 ending sequence
   *
   * Timeline:
   * 1. Start spike shower FIRST (before music change)
   * 2. Wait 6.5s for shower to complete
   * 3. Transition to boss music
   * 4. 1s pause
   * 5. Show warning text (fade in, hold 2s, fade out)
   * 6. Spawn Wave 2 boss (5 shot pattern)
   * 7. On boss defeat, trigger pre-Wave 3 dialogue
   *
   * Note: Spike shower happens during wave music, then boss music starts
   *
   * @private
   */
  endWave2() {
    this.isBossActive = true;

    // Start spike shower BEFORE boss music
    this.startSpikeShower();

    // Wait for spike shower to complete (6500ms)
    this.scene.time.delayedCall(6500, () => {
      // NOW transition to boss music after spike shower
      if (this.scene.audioManager) {
        this.scene.audioManager.transitionToBossMusic();
      }

      this.scene.time.delayedCall(1000, () => {
        const warningText = this.scene.add
          .text(540, 960, "He's back...\nAnd he's not\nmissing around.", {
            fontFamily: '"Press Start 2P"',
            fontSize: "45px",
            fill: "#ff004d",
            align: "center",
          })
          .setOrigin(0.5)
          .setAlpha(0)
          .setDepth(100);

        this.scene.tweens.add({
          targets: warningText,
          alpha: 1,
          duration: 1000,
          yoyo: true,
          hold: 2000,
          onComplete: () => {
            warningText.destroy();

            // Spawn Wave 2 boss
            this.levelManager.bossManager.spawnWave2Boss(() => {
              this.isBossActive = false;
              this.triggerPreWave3Sequence(); // Continue to Wave 3
            });
          },
        });
      });
    });
  }

  /**
   * Wave 3 ending sequence (FINAL BOSS)
   *
   * Complex cleanup:
   * 1. Reduce particle quality for performance
   * 2. Stop spawning new weaves
   * 3. Wait for active weave to exit naturally (if present)
   * 4. Start final boss sequence
   *
   * The weave exit wait is critical for smooth transition
   *
   * @private
   */
  endWave3() {
    this.isBossActive = true;

    // Performance optimization
    if (this.scene.particleEffects) {
      this.scene.particleEffects.reduceParticleQuality();
    }

    // Stop spawning NEW weaves, but let active one finish
    if (this.wave3WeaveInterval) {
      this.wave3WeaveInterval.remove();
      this.wave3WeaveInterval = null;
    }

    // Check if there's an active weave
    if (this.obstacleSpawner.activeWeave) {
      // Wait for the weave to exit naturally (smooth transition)
      const waitForWeaveExit = this.scene.time.addEvent({
        delay: 100,
        callback: () => {
          if (!this.obstacleSpawner.activeWeave) {
            // Weave has exited, now start boss sequence
            waitForWeaveExit.remove();
            this.startWave3BossSequence();
          }
        },
        loop: true,
      });
    } else {
      // No active weave, start boss sequence immediately
      this.startWave3BossSequence();
    }
  }

  /**
   * Wave 3 final boss sequence (MULTI-PHASE)
   *
   * Timeline:
   * 1. Transition to boss music
   * 2. Spike shower (dramatic entrance)
   * 3. 7s delay
   * 4. "Final Stand. Survive." warning text
   * 5. Spawn final boss (multi-phase attack sequence)
   *
   * Boss handles its own complex sequence after spawning
   *
   * @private
   */
  startWave3BossSequence() {
    // Transition to boss music
    if (this.scene.audioManager) {
      this.scene.audioManager.transitionToBossMusic();
    }

    // Dramatic spike shower entrance
    this.startSpikeShower();

    this.scene.time.delayedCall(7000, () => {
      const warningText = this.scene.add
        .text(540, 960, "Final Stand.\nSurvive.", {
          fontFamily: '"Press Start 2P"',
          fontSize: "52px",
          fill: "#ff004d",
          align: "center",
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(100);

      this.scene.tweens.add({
        targets: warningText,
        alpha: 1,
        duration: 1000,
        yoyo: true,
        hold: 2000,
        onComplete: () => {
          warningText.destroy();

          // Spawn final boss (handles its own multi-phase sequence)
          this.levelManager.bossManager.spawnWave3FinalBoss();
        },
      });
    });
  }

  // ============================================================================
  // GAME ENDING SEQUENCE
  // ============================================================================

  /**
   * Triggers the game ending sequence after final boss defeat
   *
   * Sequence:
   * 1. Fade out boss music to silence
   * 2. Show ending dialogue (16 philosophical lines)
   * 3. After dialogue, start ending music
   * 4. Display ending screen with credits
   *
   * Note: Music timing is intentional - silence during dialogue,
   * then ending music starts for emotional impact
   */
  triggerEndingSequence() {
    // Fade out boss music to silence
    if (this.scene.audioManager) {
      if (
        this.scene.audioManager.bgMusic &&
        this.scene.audioManager.bgMusic.isPlaying
      ) {
        this.scene.tweens.add({
          targets: this.scene.audioManager.bgMusic,
          volume: 0,
          duration: 1000,
          onComplete: () => {
            this.scene.audioManager.bgMusic.stop();
            this.scene.audioManager.bgMusic.destroy();
            this.scene.audioManager.bgMusic = null;
            this.scene.audioManager.isMusicPlaying = false;
          },
        });
      }
    }

    // Ending dialogue (philosophical conclusion)
    const endingLines = [
      "And here we are.",
      "The end.",
      "Or... is it?",
      "You've overcome every adversity I placed before you.",
      "Congratulations, I suppose.",
      "But tell me something—",
      "What did you win, exactly?",
      "The right to do it all again?",
      "To dash and jump through someone else's obstacles?",
      "You see, the real adversity was never the spikes or the projectiles.",
      "It was believing there was ever a finish line to begin with.",
      "But don't worry.",
      "I'm sure your next challenge will be different.",
      "It won't be.",
      "Goodbye, little dasher.",
      "Until inevitably... next time.",
    ];

    this.scene.dialogueManager.lines = endingLines;
    this.scene.dialogueManager.dialogueIndex = 0;

    this.scene.dialogueManager.showIntroduction(() => {
      // Start ending music AFTER dialogue finishes
      if (this.scene.audioManager) {
        this.scene.audioManager.startEndingMusic();
      }

      // Show ending screen with credits
      this.scene.endingScreenManager.show();
    });
  }

  // ============================================================================
  // INTER-WAVE DIALOGUE SEQUENCES
  // ============================================================================

  /**
   * Post-Wave 1 dialogue sequence
   * Philosophical reflection before Wave 2
   *
   * Sequence:
   * 1. Fade out boss music to silence
   * 2. Show 10-line dialogue about futility
   * 3. After dialogue, start wave music
   * 4. Restore player health to 2 hearts
   * 5. Display "SECOND WAVE" text
   * 6. Start Wave 2
   *
   * @private
   */
  triggerPostBossSequence() {
    // Fade out boss music to silence
    if (this.scene.audioManager) {
      if (
        this.scene.audioManager.bgMusic &&
        this.scene.audioManager.bgMusic.isPlaying
      ) {
        this.scene.tweens.add({
          targets: this.scene.audioManager.bgMusic,
          volume: 0,
          duration: 1000,
          onComplete: () => {
            this.scene.audioManager.bgMusic.stop();
            this.scene.audioManager.bgMusic.destroy();
            this.scene.audioManager.bgMusic = null;
            this.scene.audioManager.isMusicPlaying = false;
          },
        });
      }
    }

    // Philosophical dialogue about futility
    const postBossLines = [
      "There you are, little dasher.",
      "You jump. You dash. You avoid.",
      "And then what? More jumping. More dashing.",
      "It's beautiful, really. In its futility.",
      "Sisyphus had his boulder.",
      "You have your... adversities.",
      "The universe throws things at you.",
      "You dodge them.",
      "Neither of you will ever stop.",
      "Isn't that just delightful?",
    ];

    this.scene.dialogueManager.lines = postBossLines;
    this.scene.dialogueManager.dialogueIndex = 0;

    this.scene.dialogueManager.showIntroduction(() => {
      // Start wave music AFTER dialogue finishes
      if (this.scene.audioManager) {
        this.scene.audioManager.startBackgroundMusic();
      }

      // Restore health and start Wave 2
      this.levelManager.restoreHealth();
      this.scene.displayWaveText("SECOND WAVE", () => {
        this.levelManager.startLevel(60, 2);
      });
    });
  }

  /**
   * Pre-Wave 3 dialogue sequence
   * Philosophical reflection about free will before final wave
   *
   * Sequence:
   * 1. Fade out boss music to silence
   * 2. Show 10-line dialogue about determinism
   * 3. After dialogue, start wave music
   * 4. Restore player health to 2 hearts
   * 5. Display "THIRD WAVE" text
   * 6. Start Wave 3 (final wave)
   *
   * @private
   */
  triggerPreWave3Sequence() {
    // Fade out boss music to silence
    if (this.scene.audioManager) {
      if (
        this.scene.audioManager.bgMusic &&
        this.scene.audioManager.bgMusic.isPlaying
      ) {
        this.scene.tweens.add({
          targets: this.scene.audioManager.bgMusic,
          volume: 0,
          duration: 1000,
          onComplete: () => {
            this.scene.audioManager.bgMusic.stop();
            this.scene.audioManager.bgMusic.destroy();
            this.scene.audioManager.bgMusic = null;
            this.scene.audioManager.isMusicPlaying = false;
          },
        });
      }
    }

    // Philosophical dialogue about determinism
    const preWave3Lines = [
      "Here we are again.",
      "You think you're choosing to jump, to dash.",
      "But are you really choosing?",
      "Or are you simply reacting?",
      "A puppet to your own reflexes.",
      "The adversities appear. You move. Cause and effect.",
      "Free will is such a charming illusion.",
      "Every jump was predetermined before you even started.",
      "You're not playing the game.",
      "The game is playing you.",
    ];

    this.scene.dialogueManager.lines = preWave3Lines;
    this.scene.dialogueManager.dialogueIndex = 0;

    this.scene.dialogueManager.showIntroduction(() => {
      // Start wave music AFTER dialogue finishes
      if (this.scene.audioManager) {
        this.scene.audioManager.startBackgroundMusic();
      }

      // Restore health and start Wave 3 (final)
      this.levelManager.restoreHealth();
      this.scene.displayWaveText("THIRD WAVE", () => {
        this.levelManager.startLevel(120, 3); // 2 minute duration
      });
    });
  }
}
