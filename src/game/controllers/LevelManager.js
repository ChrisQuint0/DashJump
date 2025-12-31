// src/game/controllers/LevelManager.js

import { GAME_CONFIG } from "../config/GameConfig";

// ===== DEVELOPMENT MODE =====
// Set this to true to skip directly to Wave 2 for testing
const DEV_MODE = true;
const DEV_START_WAVE = 2; // Which wave to start on in dev mode
// ============================

export class LevelManager {
  constructor(scene, playerController) {
    this.scene = scene;
    this.playerController = playerController;
    this.isActive = false;
    this.spawnTimer = null;
    this.difficultyMultiplier = 1;
    this.lastScenarioIndex = -1;

    this.difficultyEvent = null;
    this.levelEndTimer = null;

    // Tracker for active obstacles to prevent "impossible" overlaps
    this.activeBall = null;
    this.activeSpike = null;
    this.activeWeave = null;
    this.boss = null;

    // Wave system
    this.currentWave = 1;
    this.isSpikeShowerMode = false;
    this.weaveCount = 0; // Track how many weaves have been spawned
  }

  startLevel(durationSeconds = 60, waveNumber = 1) {
    this.isActive = true;
    this.currentWave = waveNumber;
    this.difficultyMultiplier = 1;
    this.isSpikeShowerMode = false;
    this.weaveCount = 0; // Reset weave count for each level

    this.difficultyEvent = this.scene.time.addEvent({
      delay: 15000,
      callback: () => {
        this.difficultyMultiplier += 0.2;
      },
      loop: true,
    });

    // Store the level end timer so we can clear it if needed
    this.levelEndTimer = this.scene.time.delayedCall(
      durationSeconds * 1000,
      () => this.stopLevel()
    );

    this.planNextAction();
  }

  planNextAction() {
    if (!this.isActive) return;

    // Route to wave-specific logic
    if (this.currentWave === 1) {
      this.planWave1Action();
    } else if (this.currentWave === 2) {
      this.planWave2Action();
    }
  }

  // === WAVE 1 LOGIC (Original) ===
  planWave1Action() {
    if (!this.isActive) return;

    // RULE: If a spike is currently falling, wait 500ms and check again.
    if (this.activeSpike) {
      this.scene.time.delayedCall(500, () => this.planNextAction());
      return;
    }

    const actionType = Math.random();

    // Only trigger a scenario if there isn't a ball or spike currently active
    if (actionType < 0.4 && !this.activeBall) {
      this.triggerRandomScenario();
    } else {
      this.spawnTargetedSpike();
    }
  }

  // === WAVE 2 LOGIC (New) ===
  planWave2Action() {
    if (!this.isActive || this.isSpikeShowerMode) return;

    // RULE: If spike is falling, wait and check again
    if (this.activeSpike) {
      this.scene.time.delayedCall(500, () => this.planNextAction());
      return;
    }

    // RULE: Cannot spawn spike or ball if weave is active (unless first 2 weaves)
    if (this.activeWeave) {
      // SPECIAL: First 2 weaves can have a targeted spike
      if (this.weaveCount <= 2 && Math.random() < 0.5) {
        this.spawnTargetedSpike();
        return;
      }
      // Otherwise wait for weave to finish
      this.scene.time.delayedCall(500, () => this.planNextAction());
      return;
    }

    // RULE: Cannot spawn weave if ball or spike is active
    // RULE: Only one weave at a time

    // 30% chance to spawn weave (if conditions allow)
    if (!this.activeWeave && !this.activeBall && Math.random() < 0.3) {
      this.spawnWeave();
      // Don't plan next action - weave exit handler will trigger mini shower
      return;
    }

    // Standard spike/ball logic (same as wave 1)
    const actionType = Math.random();
    if (actionType < 0.4 && !this.activeBall && !this.activeWeave) {
      this.triggerRandomScenario();
    } else {
      this.spawnTargetedSpike();
    }
  }

  // === WEAVE ENTITY (Wave 2) ===
  spawnWeave() {
    // Safety check: don't spawn if anything else is active
    if (this.activeWeave || this.activeBall || this.activeSpike) return;

    this.weaveCount++; // Increment weave counter

    // Spawn from top center of screen
    const weave = this.scene.physics.add.sprite(540, -100, "weave");
    weave.setScale(GAME_CONFIG.PLAYER.SCALE - 5);
    weave.setDepth(5);
    weave.body.setAllowGravity(false);

    // Move DOWN the screen
    weave.setVelocityY(400 * this.difficultyMultiplier);

    this.activeWeave = weave;

    // Sine wave HORIZONTAL weaving motion as it falls
    const weaveMotion = this.scene.time.addEvent({
      delay: 16, // ~60fps
      callback: () => {
        if (!weave.active) {
          weaveMotion.remove();
          return;
        }
        // Horizontal sine wave oscillation (left to right)
        const offset = Math.sin(this.scene.time.now / 300) * 250;
        weave.x = 540 + offset; // Weaves around center (540)
      },
      loop: true,
    });

    // Check for screen exit (bottom)
    const exitCheck = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (weave.active && weave.y > 2000) {
          weave.destroy();
          this.activeWeave = null;
          weaveMotion.remove();
          exitCheck.remove();

          // RULE: After weave exits, trigger mini spike shower
          this.spawnMiniSpikeShower();
        } else if (!weave.active) {
          // Weave was destroyed (hit player) - clean up and continue
          this.activeWeave = null;
          weaveMotion.remove();
          exitCheck.remove();

          // Continue spawning after a short delay
          this.scene.time.delayedCall(1000, () => this.planNextAction());
        }
      },
      loop: true,
    });

    this.setupObstacleCollision(weave);
  }

  // === MINI SPIKE SHOWER (After Weave) ===
  spawnMiniSpikeShower() {
    // Alternating left-right-left pattern with gaps for dashing
    const sequence = [
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 0 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 500 },
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 1000 },
    ];

    sequence.forEach((spike) => {
      this.scene.time.delayedCall(spike.delay, () => {
        if (this.isActive) this.spawnLaneSpike(spike.x);
      });
    });

    // RULE: Spawn red ball 500ms after mini shower completes
    // Last spike spawns at 1000ms, so ball spawns at 1500ms
    this.scene.time.delayedCall(1500, () => {
      if (this.isActive) {
        console.log("Mini shower complete - spawning ball");
        this.spawnBall();
      }
    });

    // Plan next action after ball spawns
    this.scene.time.delayedCall(2000, () => this.planNextAction());
  }

  // === SPIKE SHOWER (Wave 2 Finale) ===
  startSpikeShower() {
    console.log("Starting spike shower!");
    this.isSpikeShowerMode = true;
    // CRITICAL: Keep isActive true during shower
    // Don't set isActive to false until shower completes

    // 5-second shower with spikes every 500ms = 10 spikes
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
        console.log(
          `Spawning shower spike at ${spike.x}, isActive: ${this.isActive}`
        );
        this.spawnShowerSpike(spike.x);
      });
    });

    // RULE: Spawn red ball 500ms after the LAST spike completes its full animation
    // Last spike spawns at 4500ms, takes ~1500ms to hit ground, so ball spawns at 6000ms
    this.scene.time.delayedCall(6000, () => {
      console.log("Spike shower complete - spawning ball");
      this.spawnBall();
    });

    // Show completion message and end shower mode
    this.scene.time.delayedCall(6500, () => {
      this.isSpikeShowerMode = false;
      console.log("Wave 2 cleared!");
    });
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
          spike.body.setAllowGravity(true);
          spike.setGravityY(5000);
          trail.start();
        }
      },
    });

    this.setupObstacleCollision(spike, trail);
  }

  // --- TARGETING LOGIC ---
  spawnTargetedSpike() {
    const targetX = this.playerController.player.x;
    const spike = this.scene.physics.add.sprite(targetX, -100, "spike");
    spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.setDepth(5);
    spike.body.setAllowGravity(false);

    this.activeSpike = spike; // Lock spawning

    const trail = this.createSpikeTrail(spike);

    this.scene.tweens.add({
      targets: spike,
      y: 150,
      duration: 800 / this.difficultyMultiplier,
      onComplete: () => {
        if (spike.active) {
          spike.body.setAllowGravity(true);
          spike.setGravityY(4000 * this.difficultyMultiplier);
          trail.start();
        }
      },
    });

    this.setupObstacleCollision(spike, trail);

    const nextDelay = this.activeBall ? 2500 : 1800;
    this.scene.time.delayedCall(nextDelay / this.difficultyMultiplier, () =>
      this.planNextAction()
    );
  }

  // --- COMBO SCENARIOS ---
  triggerRandomScenario() {
    const scenarios = [
      this.scenarioTheDoubleDash,
      this.scenarioTheTrap,
      this.scenarioTheSideSwitch,
    ];

    let index;
    do {
      index = Phaser.Math.Between(0, scenarios.length - 1);
    } while (index === this.lastScenarioIndex);

    this.lastScenarioIndex = index;
    scenarios[index].call(this);
  }

  scenarioTheDoubleDash() {
    this.spawnLaneSpike(GAME_CONFIG.PLAYER.LEFT_X);
    this.scene.time.delayedCall(800, () => {
      this.spawnLaneSpike(GAME_CONFIG.PLAYER.RIGHT_X);
      this.scene.time.delayedCall(1500, () => this.planNextAction());
    });
  }

  scenarioTheTrap() {
    if (this.activeBall || this.activeSpike) {
      this.spawnTargetedSpike();
      return;
    }

    this.spawnBall();
    // Wait for ball to be mid-screen before dropping a spike
    this.scene.time.delayedCall(800, () => {
      this.spawnTargetedSpike();
    });
  }

  scenarioTheSideSwitch() {
    const startX = this.playerController.player.x;
    this.spawnLaneSpike(startX);

    // Only spawn the ball after the spike is handled
    this.scene.time.delayedCall(1200, () => {
      this.spawnBall();
      this.scene.time.delayedCall(1500, () => this.planNextAction());
    });
  }

  // --- REFACTORED BALL SPAWN ---
  spawnBall() {
    // Strict Check: Don't spawn if a ball OR a falling spike already exists
    if (this.activeBall || this.activeSpike || this.activeWeave) {
      console.log("Ball spawn blocked - obstacles active:", {
        ball: !!this.activeBall,
        spike: !!this.activeSpike,
        weave: !!this.activeWeave,
      });
      return;
    }

    console.log("Spawning ball");
    const playerX = this.playerController.player.x;
    const isPlayerOnRight = playerX > 540;

    // Opposite Logic: If player is Right, spawn from Right moving Left
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

  // --- HELPERS ---
  spawnLaneSpike(x) {
    const spike = this.scene.physics.add
      .sprite(x, -100, "spike")
      .setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.body.setAllowGravity(false);

    this.activeSpike = spike; // Set global spike lock

    const trail = this.createSpikeTrail(spike);

    this.scene.tweens.add({
      targets: spike,
      y: 150,
      duration: 500,
      onComplete: () => {
        if (spike.active) {
          spike.body.setAllowGravity(true);
          spike.setGravityY(4500);
          trail.start();
        }
      },
    });
    this.setupObstacleCollision(spike, trail);
  }

  createSpikeTrail(spike) {
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

  setupObstacleCollision(sprite, trail = null) {
    // Only add ground collision for spikes (not weave or ball)
    if (sprite.texture.key === "spike") {
      this.scene.physics.add.collider(sprite, this.scene.ground, () => {
        if (trail) trail.stop();

        // UNLOCK: When spike hits ground, allow new spawns
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

    this.scene.physics.add.overlap(sprite, this.playerController.player, () => {
      // 1. Destroy the object that hit the player so it doesn't hit twice
      sprite.destroy();

      // 2. Clear tracking references so planNextAction() isn't blocked
      if (sprite === this.activeSpike) this.activeSpike = null;
      if (sprite === this.activeBall) this.activeBall = null;
      if (sprite === this.activeWeave) this.activeWeave = null;

      // 3. Trigger the life reduction in Game.js
      this.scene.updateLives();
    });
  }

  handlePlayerHit() {
    this.scene.cameras.main.shake(200, 0.02);
  }

  stopLevel() {
    // Clean up all timers FIRST before calling wave endings
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = null;
    }
    if (this.difficultyEvent) {
      this.difficultyEvent.remove();
      this.difficultyEvent = null;
    }
    if (this.levelEndTimer) {
      this.levelEndTimer.remove();
      this.levelEndTimer = null;
    }

    // Wave-specific endings (these may spawn new timers)
    if (this.currentWave === 1) {
      this.endWave1();
    } else if (this.currentWave === 2) {
      this.endWave2();
    }

    // IMPORTANT: Only set isActive to false AFTER wave endings
    // This allows spike showers and other finale events to execute
    this.scene.time.delayedCall(7000, () => {
      this.isActive = false;
      this.activeBall = null;
      this.activeSpike = null;
      this.activeWeave = null;
    });
  }

  // === WAVE 1 ENDING (Boss Fight) ===
  endWave1() {
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
      yoyo: true,
      hold: 3000,
      onComplete: () => {
        warningText.destroy();
        this.spawnBoss();
      },
    });
  }

  // === WAVE 2 ENDING (Spike Shower + Boss) ===
  endWave2() {
    // First execute the spike shower
    this.startSpikeShower();

    // Then show the warning text AFTER the shower completes
    // Shower takes 5 seconds, so show text after 5.5 seconds
    this.scene.time.delayedCall(5500, () => {
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
          this.spawnWave2Boss();
        },
      });
    });
  }

  spawnWave2Boss() {
    this.boss = this.scene.add.sprite(540, -300, "shootingBoss");
    this.boss.setScale(30);
    this.boss.setDepth(10);

    this.scene.tweens.add({
      targets: this.boss,
      y: 400,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => this.bossWave2AimingSequence(),
    });
  }

  bossWave2AimingSequence() {
    // Aim sequence - green tint flashing
    this.scene.tweens.add({
      targets: this.boss,
      tint: 0x00ff66,
      duration: 500,
      yoyo: true,
      repeat: 9,
      onComplete: () => this.fireBossWave2Shots(),
    });
  }

  fireBossWave2Shots() {
    // Shot 1 - immediately after aiming
    this.fireBossShotWave2(0);

    // Shot 2 - 1500ms delay
    this.scene.time.delayedCall(1500, () => {
      this.fireBossShotWave2(1);
    });

    // Shot 3 - 1500ms after shot 2 (3000ms total)
    this.scene.time.delayedCall(3000, () => {
      this.fireBossShotWave2(2);
    });

    // Shot 4 - 1500ms after shot 3 (4500ms total)
    this.scene.time.delayedCall(4500, () => {
      this.fireBossShotWave2(3);
    });

    // Shot 5 - 5000ms after shot 4 (9500ms total)
    this.scene.time.delayedCall(9500, () => {
      this.fireBossShotWave2(4);

      // Boss exits after final shot
      this.scene.time.delayedCall(2000, () => {
        this.scene.tweens.add({
          targets: this.boss,
          y: -500,
          duration: 2000,
          onComplete: () => {
            console.log("Wave 2 boss defeated! Game complete!");
            // TODO: Add game completion sequence here
          },
        });
      });
    });
  }

  fireBossShotWave2(shotNumber) {
    console.log(`Boss firing shot ${shotNumber + 1}/5`);

    const targetX = this.playerController.player.x;
    const targetY = this.playerController.player.y;

    const bullet = this.scene.physics.add.sprite(
      this.boss.x,
      this.boss.y,
      "plasma"
    );
    bullet.setScale(4);
    bullet.body.setAllowGravity(false);

    const emitter = this.scene.add.particles(0, 0, "plasma", {
      speed: 20,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 500,
      follow: bullet,
      blendMode: "ADD",
    });

    this.scene.physics.moveTo(bullet, targetX, targetY, 1200);

    this.scene.physics.add.overlap(this.playerController.player, bullet, () => {
      this.scene.updateLives();
      bullet.destroy();
      emitter.destroy();
    });
  }

  spawnBoss() {
    this.boss = this.scene.add.sprite(540, -300, "shootingBoss");
    this.boss.setScale(30);
    this.boss.setDepth(10);

    this.scene.tweens.add({
      targets: this.boss,
      y: 400,
      duration: 2500,
      ease: "Back.easeOut",
      onComplete: () => this.bossAimingSequence(),
    });
  }

  bossAimingSequence() {
    this.scene.tweens.add({
      targets: this.boss,
      tint: 0x00ff66,
      duration: 500,
      yoyo: true,
      repeat: 9,
      onComplete: () => this.fireBossShot(),
    });
  }

  fireBossShot() {
    const targetX = this.playerController.player.x;
    const targetY = this.playerController.player.y;

    const bullet = this.scene.physics.add.sprite(
      this.boss.x,
      this.boss.y,
      "plasma"
    );
    bullet.setScale(4);
    bullet.body.setAllowGravity(false);

    const emitter = this.scene.add.particles(0, 0, "plasma", {
      speed: 20,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 500,
      follow: bullet,
      blendMode: "ADD",
    });

    this.scene.physics.moveTo(bullet, targetX, targetY, 1200);

    this.scene.physics.add.overlap(this.playerController.player, bullet, () => {
      this.scene.updateLives();
      bullet.destroy();
      emitter.destroy();
    });

    // Boss exits after shooting
    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: this.boss,
        y: -500,
        duration: 2000,
        onComplete: () => {
          this.triggerPostBossSequence();
        },
      });
    });
  }

  triggerPostBossSequence() {
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
      this.restoreHealth();
      this.scene.displayWaveText("SECOND WAVE", () => {
        this.startLevel(60, 2); // Start Wave 2!
      });
    });
  }

  restoreHealth() {
    if (this.scene.lives < 2) {
      this.scene.lives = 2;
      this.scene.hearts.forEach((heart) => heart.setTexture("heart"));
    }
  }
}
