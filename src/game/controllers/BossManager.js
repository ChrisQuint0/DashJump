// src/game/controllers/BossManager.js

import { GAME_CONFIG } from "../config/GameConfig";

export class BossManager {
  constructor(scene, playerController, levelManager) {
    this.scene = scene;
    this.playerController = playerController;
    this.levelManager = levelManager;
    this.boss = null;

    // Track active bullets to prevent overflow
    this.activeBullets = [];
    this.maxBullets = this.levelManager?.currentWave === 3 ? 5 : 10;

    this.createExclamationTexture();
  }

  createExclamationTexture() {
    if (this.scene.textures.exists("exclamation")) return;

    const canvas = document.createElement("canvas");
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Pixel art exclamation point
    ctx.fillStyle = "#ff004d"; // Red color matching game theme

    // Main vertical bar (6 pixels wide, 18 pixels tall)
    ctx.fillRect(13, 4, 6, 18);

    // Bottom dot (6x6 pixels)
    ctx.fillRect(13, 24, 6, 6);

    this.scene.textures.addCanvas("exclamation", canvas);
  }

  showLaneWarning(targetX, callback) {
    // Create exclamation point sprite at the target lane
    const warning = this.scene.add.sprite(targetX, 1200, "exclamation");
    warning.setScale(8); // Scale up for visibility
    warning.setDepth(150);
    warning.setAlpha(0);

    // Pulsing animation
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

  // === WAVE 1 BOSS ===

  spawnWave1Boss(onComplete) {
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
        this.wave1AimingSequence(onComplete);
      },
    });
  }

  wave1AimingSequence(onComplete) {
    this.scene.tweens.add({
      targets: this.boss,
      tint: 0x00ff66,
      duration: 500,
      yoyo: true,
      repeat: 9,
      onComplete: () => this.fireWave1Shot(onComplete),
    });
  }

  fireWave1Shot(onComplete) {
    const targetX = this.playerController.player.x;
    const targetY = this.playerController.player.y;

    const bullet = this.createBullet(this.boss.x, this.boss.y);
    this.scene.physics.moveTo(bullet.sprite, targetX, targetY, 1200);

    this.setupBulletCollision(bullet.sprite, bullet.emitter);

    // Boss exits after shooting
    this.scene.time.delayedCall(2000, () => {
      this.exitBoss(() => {
        if (onComplete) onComplete();
      });
    });
  }

  // === WAVE 2 BOSS ===

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

  fireWave2Shots(onComplete) {
    const shotDelays = [0, 800, 1600, 2400, 3200];

    shotDelays.forEach((delay, index) => {
      this.scene.time.delayedCall(delay, () => {
        this.fireTrackedShot(index);

        // Spawn first ball after first shot (500ms delay)
        if (index === 0) {
          this.scene.time.delayedCall(500, () => {
            this.spawnBallWithTracking();
          });
        }

        // Exit after final shot
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

  // === WAVE 3 FINAL BOSS ===

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

  wave3FinalSequence() {
    let currentTime = 0;

    // First barrage: 10 tracked shots
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(currentTime, () => {
        this.fireTrackedShot(i);

        // Spawn first ball after first shot (500ms delay) and keep spawning
        if (i === 0) {
          this.scene.time.delayedCall(500, () => {
            this.spawnBallWithTracking();
          });
        }
      });
      currentTime += 800;
    }

    // Boss exits after first barrage
    this.scene.time.delayedCall(currentTime + 500, () => {
      this.stopBallSpawning();
      this.exitBoss(() => {});
    });
    currentTime += 2500; // Wait for exit animation

    // Spike shower
    this.scene.time.delayedCall(currentTime, () => {
      this.levelManager.waveManager.startSpikeShower();
    });
    currentTime += 7000;

    // Boss re-enters for second barrage
    this.scene.time.delayedCall(currentTime, () => {
      this.spawnBossForSecondBarrage();
    });
    currentTime += 2500; // Wait for entrance animation

    // Second barrage: 10 more tracked shots
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(currentTime, () => {
        this.fireTrackedShot(i + 10);

        // Spawn ball after first shot of second barrage
        if (i === 0) {
          this.scene.time.delayedCall(500, () => {
            this.spawnBallWithTracking();
          });
        }
      });
      currentTime += 800;
    }

    // Boss exits after second barrage
    this.scene.time.delayedCall(currentTime + 500, () => {
      this.stopBallSpawning();
      this.exitBoss(() => {});
    });
    currentTime += 2500; // Wait for exit animation

    // Second spike shower
    this.scene.time.delayedCall(currentTime, () => {
      this.levelManager.waveManager.startSpikeShower();
    });
    currentTime += 7000;

    // Boss re-enters for lane attacks and stays until the end
    this.scene.time.delayedCall(currentTime, () => {
      this.spawnBossForLaneAttacks();
    });
    currentTime += 2500; // Wait for entrance animation

    // Lane attacks - boss stays in place
    // LEFT LANE WITH WARNING
    this.scene.time.delayedCall(currentTime, () => {
      this.showLaneWarning(GAME_CONFIG.PLAYER.LEFT_X, () => {
        this.bossFiresToLaneInPlace(GAME_CONFIG.PLAYER.LEFT_X, 10);
      });
    });
    currentTime += 13000; // 1000ms warning + 12000ms attack

    // RIGHT LANE WITH WARNING
    this.scene.time.delayedCall(currentTime, () => {
      this.showLaneWarning(GAME_CONFIG.PLAYER.RIGHT_X, () => {
        this.bossFiresToLaneInPlace(GAME_CONFIG.PLAYER.RIGHT_X, 10);
      });
    });
    currentTime += 13000; // 1000ms warning + 12000ms attack

    // Final exit at the very end
    this.scene.time.delayedCall(currentTime, () => {
      this.exitBoss(() => {
        // Trigger the ending dialogue
        this.levelManager.waveManager.triggerEndingSequence();
      });
    });
  }

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

  // === BOSS LANE FIRING ===

  // Used in Wave 3 scripted sequence - boss enters, fires, exits
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

          // Exit after all shots
          this.scene.time.delayedCall(shotCount * 1000 + 1500, () => {
            this.exitBoss(() => {});
          });
        });
      },
    });
  }

  // Used in final boss sequence - boss is already on screen, just fires
  bossFiresToLaneInPlace(targetX, shotCount) {
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

  // Spawns balls continuously during lane attack sequences
  startLaneBallSpawning(duration) {
    // Spawn first ball immediately
    this.levelManager.obstacleSpawner.spawnBall();

    // Keep spawning new balls as they leave the screen
    this.laneBallInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        const currentBall = this.levelManager.obstacleSpawner.activeBall;

        // If no active ball, spawn a new one
        if (!currentBall) {
          this.levelManager.obstacleSpawner.spawnBall();
        }
      },
      loop: true,
    });

    // Stop spawning after the lane attack duration
    this.scene.time.delayedCall(duration, () => {
      this.stopLaneBallSpawning();
    });
  }

  stopLaneBallSpawning() {
    if (this.laneBallInterval) {
      this.laneBallInterval.remove();
      this.laneBallInterval = null;
    }
    // Destroy any active ball
    if (this.levelManager.obstacleSpawner.activeBall) {
      this.levelManager.obstacleSpawner.activeBall.destroy();
      this.levelManager.obstacleSpawner.activeBall = null;
    }
  }

  // === SHOOTING HELPERS ===

  fireTrackedShot(shotNumber) {
    // Clean up off-screen bullets first
    this.cleanupBullets();

    // Limit active bullets in Wave 3
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

    const targetX = this.playerController.player.x;
    const targetY = this.playerController.player.y;

    const bullet = this.createBullet(this.boss.x, this.boss.y);
    this.scene.physics.moveTo(bullet.sprite, targetX, targetY, 1800);
    this.setupBulletCollision(bullet.sprite, bullet.emitter);

    // Track this bullet
    this.activeBullets.push(bullet);
  }

  cleanupBullets() {
    this.activeBullets = this.activeBullets.filter((bullet) => {
      // Remove if sprite is destroyed or off-screen
      if (!bullet.sprite || !bullet.sprite.active) {
        return false;
      }

      const sprite = bullet.sprite;
      if (
        sprite.y > 2000 ||
        sprite.y < -500 ||
        sprite.x < -500 ||
        sprite.x > 1600
      ) {
        sprite.destroy();
        if (bullet.emitter && bullet.emitter.destroy) {
          bullet.emitter.destroy();
        }
        return false;
      }

      return true;
    });
  }

  fireShotToPosition(targetX, targetY) {
    if (!this.boss) return;

    const bullet = this.createBullet(this.boss.x, this.boss.y);
    this.scene.physics.moveTo(bullet.sprite, targetX, targetY, 1800);
    this.setupBulletCollision(bullet.sprite, bullet.emitter);
  }

  createBullet(x, y) {
    if (this.scene.audioManager) {
      this.scene.audioManager.playPlasmaSound();
    }

    const sprite = this.scene.physics.add.sprite(x, y, "plasma");
    sprite.setScale(4);
    sprite.body.setAllowGravity(false);

    // CRITICAL FIX: Disable particle emitters in Wave 3 for performance
    let emitter = null;

    if (this.levelManager.currentWave !== 3) {
      // Only create particle trails in Wave 1 and 2
      emitter = this.scene.add.particles(0, 0, "plasma", {
        speed: 20,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 500,
        follow: sprite,
        blendMode: "ADD",
      });
    } else {
      // Wave 3: Create a dummy emitter object to prevent crashes
      emitter = {
        destroy: () => {},
      };
    }

    return { sprite, emitter };
  }

  setupBulletCollision(bullet, emitter) {
    this.scene.physics.add.overlap(this.playerController.player, bullet, () => {
      this.scene.updateLives();
      bullet.destroy();
      if (emitter && emitter.destroy) {
        emitter.destroy();
      }

      // Remove from tracking
      this.activeBullets = this.activeBullets.filter(
        (b) => b.sprite !== bullet
      );
    });
  }

  // === CONTINUOUS BALL SPAWNING ===

  spawnBallWithTracking() {
    // Spawn a ball immediately
    this.levelManager.obstacleSpawner.spawnBall();

    // Set up continuous spawning - check every 100ms if ball has left
    this.ballCheckInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        const currentBall = this.levelManager.obstacleSpawner.activeBall;

        // If no active ball, spawn a new one
        if (!currentBall) {
          this.levelManager.obstacleSpawner.spawnBall();
        }

        // Stop checking when boss is gone or level is inactive
        if (!this.boss || !this.levelManager.isActive) {
          this.stopBallSpawning();
        }
      },
      loop: true,
    });
  }

  stopBallSpawning() {
    if (this.ballCheckInterval) {
      this.ballCheckInterval.remove();
      this.ballCheckInterval = null;
    }
    // Also destroy any active ball
    if (this.levelManager.obstacleSpawner.activeBall) {
      this.levelManager.obstacleSpawner.activeBall.destroy();
      this.levelManager.obstacleSpawner.activeBall = null;
    }
  }

  // === HOVER ANIMATION ===

  startHoverAnimation() {
    if (!this.boss) return;

    // Kill any existing hover animation on this boss
    this.scene.tweens.killTweensOf(this.boss);

    // Store the hover tween so we can kill it later if needed
    this.hoverTween = this.scene.tweens.add({
      targets: this.boss,
      y: this.boss.y - 20,
      duration: 2000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  stopHoverAnimation() {
    if (this.hoverTween) {
      this.hoverTween.remove();
      this.hoverTween = null;
    }
  }

  // === BOSS EXIT ===

  exitBoss(onComplete) {
    if (!this.boss) {
      if (onComplete) onComplete();
      return;
    }

    // Stop hover animation before exit
    this.stopHoverAnimation();

    // Store reference and clear this.boss immediately to prevent reuse
    const exitingBoss = this.boss;
    this.boss = null;

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
