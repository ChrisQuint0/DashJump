// src/game/controllers/LevelManager.js

import { GAME_CONFIG } from "../config/GameConfig";

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
    this.boss = null;
  }

  startLevel(durationSeconds = 60) {
    this.isActive = true;
    this.difficultyMultiplier = 1;

    this.difficultyEvent = this.scene.time.addEvent({
      delay: 15000,
      callback: () => {
        this.difficultyMultiplier += 0.2;
      },
      loop: true,
    });

    // ADD THIS - Store the level end timer so we can clear it if needed
    this.levelEndTimer = this.scene.time.delayedCall(
      durationSeconds * 1000,
      () => this.stopLevel()
    );

    this.planNextAction();
  }

  planNextAction() {
    if (!this.isActive) return;

    // RULE: If a spike is currently falling, wait 500ms and check again.
    // This prevents a ball from spawning while the player is dodging a spike.
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
    if (this.activeBall || this.activeSpike) return;

    const playerX = this.playerController.player.x;
    const isPlayerOnRight = playerX > 540;

    // Opposite Logic: If player is Right, spawn from Right moving Left (target is the other side)
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
    this.scene.physics.add.collider(sprite, this.scene.ground, () => {
      if (sprite.texture.key === "spike") {
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
      }
    });

    this.scene.physics.add.overlap(sprite, this.playerController.player, () => {
      // 1. Destroy the object that hit the player so it doesn't hit twice
      sprite.destroy();

      // 2. Clear tracking references so planNextAction() isn't blocked
      if (sprite === this.activeSpike) this.activeSpike = null;
      if (sprite === this.activeBall) this.activeBall = null;

      // 3. Trigger the life reduction in Game.js
      this.scene.updateLives();
    });
  }

  handlePlayerHit() {
    this.scene.cameras.main.shake(200, 0.02);
    this.handlePlayerHit();
  }

  stopLevel() {
    this.isActive = false;
    this.activeBall = null;
    this.activeSpike = null;

    // Clean up all timers
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

    // REMOVED: this.scene.time.removeAllEvents(); (too aggressive)

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
      tint: 0x00ff66, // Tint green to match your plasma
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

    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: this.boss,
        y: -500,
        duration: 2000,
        onComplete: () => {
          console.log("Boss Defeated/Left. Level 1 Complete.");
        },
      });
    });

    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: this.boss,
        y: -500,
        duration: 2000,
        onComplete: () => {
          // TRIGGER DIALOGUE 2 INSTEAD OF LOGGING
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

    // 1. Pass the new lines to the DialogueManager
    this.scene.dialogueManager.lines = postBossLines;
    this.scene.dialogueManager.dialogueIndex = 0;

    // 2. Show the dialogue
    this.scene.dialogueManager.showIntroduction(() => {
      // 3. Restore health after dialogue ends
      this.restoreHealth();

      // 4. Proceed to the next wave text and restart level logic
      this.scene.displayWaveText("SECOND WAVE", () => {
        this.startLevel(60);
      });
    });
  }

  restoreHealth() {
    // Restore lives to 2 if they are lower
    if (this.scene.lives < 2) {
      this.scene.lives = 2;
      // Update heart textures in the UI
      this.scene.hearts.forEach((heart) => heart.setTexture("heart"));
    }
  }
}
