// src/game/controllers/WaveManager.js

import { GAME_CONFIG } from "../config/GameConfig";

export class WaveManager {
  constructor(scene, playerController, levelManager, obstacleSpawner) {
    this.scene = scene;
    this.playerController = playerController;
    this.levelManager = levelManager;
    this.obstacleSpawner = obstacleSpawner;

    this.isSpikeShowerMode = false;
    this.lastScenarioIndex = -1;
    this.isBossActive = false;
  }

  startWave(durationSeconds, waveNumber) {
    this.isSpikeShowerMode = false;
    this.isBossActive = false;

    if (waveNumber === 2) {
      this.startWave2Sequence();
      return;
    }

    if (waveNumber === 3) {
      this.startWave3Sequence();
      return;
    }

    // Wave 1 still uses dynamic spawning
    this.planNextAction(waveNumber);
  }

  planNextAction(waveNumber) {
    if (!this.levelManager.isActive || this.isBossActive) return;

    if (waveNumber === 1) {
      this.planWave1Action();
    }
  }

  // === WAVE 1 LOGIC ===

  planWave1Action() {
    if (!this.levelManager.isActive || this.isBossActive) return;

    if (this.obstacleSpawner.activeSpike) {
      this.scene.time.delayedCall(500, () =>
        this.planNextAction(this.levelManager.currentWave)
      );
      return;
    }

    const actionType = Math.random();

    if (actionType < 0.4 && !this.obstacleSpawner.activeBall) {
      this.triggerRandomScenario();
    } else {
      this.obstacleSpawner.spawnTargetedSpike();
    }

    const nextDelay = this.obstacleSpawner.activeBall ? 2500 : 1800;
    this.scene.time.delayedCall(
      nextDelay / this.levelManager.difficultyMultiplier,
      () => this.planNextAction(1)
    );
  }

  // === COMBO SCENARIOS (Wave 1 only) ===

  triggerRandomScenario() {
    const scenarios = [
      () => this.scenarioTheDoubleDash(),
      () => this.scenarioTheTrap(),
      () => this.scenarioTheSideSwitch(),
    ];

    let index;
    do {
      index = Phaser.Math.Between(0, scenarios.length - 1);
    } while (index === this.lastScenarioIndex);

    this.lastScenarioIndex = index;
    scenarios[index]();
  }

  scenarioTheDoubleDash() {
    this.obstacleSpawner.spawnLaneSpike(GAME_CONFIG.PLAYER.LEFT_X);
    this.scene.time.delayedCall(800, () => {
      this.obstacleSpawner.spawnLaneSpike(GAME_CONFIG.PLAYER.RIGHT_X);
      this.scene.time.delayedCall(1500, () =>
        this.planNextAction(this.levelManager.currentWave)
      );
    });
  }

  scenarioTheTrap() {
    if (this.obstacleSpawner.activeBall || this.obstacleSpawner.activeSpike) {
      this.obstacleSpawner.spawnTargetedSpike();
      return;
    }

    this.obstacleSpawner.spawnBall();
    this.scene.time.delayedCall(800, () => {
      this.obstacleSpawner.spawnTargetedSpike();
    });
  }

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

  // === SPIKE SHOWERS ===

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

    // Note: For Wave 1, this spawns a ball after. For Wave 2, handled by sequence.
    this.scene.time.delayedCall(1500, () => {
      if (this.levelManager.isActive && this.levelManager.currentWave === 1) {
        this.obstacleSpawner.spawnBall();
      }
    });
  }

  startSpikeShower() {
    this.isSpikeShowerMode = true;

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

    this.scene.time.delayedCall(6000, () => {});

    this.scene.time.delayedCall(6500, () => {
      this.isSpikeShowerMode = false;
    });
  }

  // === WAVE 2 SCRIPTED SEQUENCE ===

  startWave2Sequence() {
    // Initialize shower tracking flag
    this.isShowerActive = false;

    this.wave2Sequence = [
      { type: "spike" },
      { type: "ball" },
      { type: "spike" },
      { type: "ball" },
      { type: "weave" },
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
      { type: "miniShower" },
      { type: "miniShower" },
      { type: "miniShower" },
    ];

    this.wave2SequenceIndex = 0;
    this.processNextWave2Step();
  }

  processNextWave2Step() {
    if (!this.levelManager.isActive) {
      return;
    }

    if (this.wave2SequenceIndex >= this.wave2Sequence.length) {
      this.levelManager.stopLevel();
      return;
    }

    const step = this.wave2Sequence[this.wave2SequenceIndex];

    this.wave2SequenceIndex++;

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

  spawnSpikeAndWait() {
    // Don't spawn if anything is active
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

    this.obstacleSpawner.spawnTargetedSpike();

    // Check every 100ms if spike is cleared
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.obstacleSpawner.activeSpike) {
          checkInterval.remove();
          // Small delay before next obstacle
          this.scene.time.delayedCall(300, () => this.processNextWave2Step());
        }
      },
      loop: true,
    });
  }

  spawnBallAndWait() {
    // Don't spawn if anything is active
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

    this.obstacleSpawner.spawnBall();

    // Check every 100ms if ball is cleared
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.obstacleSpawner.activeBall) {
          checkInterval.remove();
          // Small delay before next obstacle
          this.scene.time.delayedCall(300, () => this.processNextWave2Step());
        }
      },
      loop: true,
    });
  }

  spawnWeaveAndWait() {
    // Check if any other obstacles are active
    if (
      this.obstacleSpawner.activeSpike ||
      this.obstacleSpawner.activeBall ||
      this.obstacleSpawner.activeWeave ||
      this.isShowerActive
    ) {
      // Wait a bit and try again
      this.scene.time.delayedCall(200, () => {
        // Retry this same step (don't increment index)
        this.wave2SequenceIndex--;
        this.processNextWave2Step();
      });
      return;
    }

    this.obstacleSpawner.spawnWeave();

    // Check every 100ms if weave is cleared
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.obstacleSpawner.activeWeave) {
          checkInterval.remove();
          // Small delay before next obstacle
          this.scene.time.delayedCall(300, () => this.processNextWave2Step());
        }
      },
      loop: true,
    });
  }

  spawnMiniShowerAndWait() {
    // Don't spawn if anything is active
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

    // Mark shower as active IMMEDIATELY
    this.isShowerActive = true;

    // Track all spikes spawned in this shower
    this.miniShowerSpikes = [];

    const sequence = [
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 0 },
      { x: GAME_CONFIG.PLAYER.RIGHT_X, delay: 500 },
      { x: GAME_CONFIG.PLAYER.LEFT_X, delay: 1000 },
    ];

    sequence.forEach((spikeData, index) => {
      this.scene.time.delayedCall(spikeData.delay, () => {
        if (this.levelManager.isActive && this.isShowerActive) {
          // Spawn lane spike and track it
          const spike = this.scene.physics.add.sprite(
            spikeData.x,
            -100,
            "spike"
          );
          spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
          spike.body.setAllowGravity(false);

          this.miniShowerSpikes.push(spike);

          const trail = this.createSpikeTrailForShower(spike);

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

    // Check every 100ms if ALL shower spikes are cleared
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        // Only check if we have spawned all 3 spikes
        if (this.miniShowerSpikes.length < 3) {
          return; // Wait for all spikes to spawn first
        }

        // Check if all spikes from this shower are destroyed
        const allCleared = this.miniShowerSpikes.every(
          (spike) => !spike || !spike.active
        );

        if (allCleared) {
          checkInterval.remove();
          this.miniShowerSpikes = [];
          this.isShowerActive = false; // Mark shower as complete
          // Small delay before next obstacle
          this.scene.time.delayedCall(500, () => {
            this.processNextWave2Step();
          });
        }
      },
      loop: true,
    });
  }

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

  setupShowerSpikeCollision(spike, trail) {
    // Ground collision
    this.scene.physics.add.collider(spike, this.scene.ground, () => {
      if (trail) trail.stop();

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

  // === WAVE 3 CONTINUOUS WEAVE SPAWNING ===

  startWave3WeaveSpawning() {
    // Spawn first weave immediately
    this.spawnWeaveForWave3();

    // OPTIMIZED: Check less frequently (200ms instead of 100ms)
    // and with simpler logic
    this.wave3WeaveInterval = this.scene.time.addEvent({
      delay: 200, // Changed from 100ms to 200ms
      callback: () => {
        // Simple check: if no active weave, spawn one
        if (!this.obstacleSpawner.activeWeave && this.levelManager.isActive) {
          this.spawnWeaveForWave3();
        }
      },
      loop: true,
    });
  }

  spawnWeaveForWave3() {
    if (this.obstacleSpawner.activeWeave) return;

    this.obstacleSpawner.spawnWeave();
  }

  stopWave3WeaveSpawning() {
    if (this.wave3WeaveInterval) {
      this.wave3WeaveInterval.remove();
      this.wave3WeaveInterval = null;
    }
    // Note: We don't destroy the active weave here anymore
    // Let it exit naturally
  }

  // === WAVE 3 SCRIPTED SEQUENCE ===

  startWave3Sequence() {
    // Reduce particle effects for better performance
    if (this.scene.particleEffects) {
      this.scene.particleEffects.reduceParticleQuality();
    }

    let currentTime = 0;

    const scheduleEvent = (callback, delay) => {
      this.scene.time.delayedCall(currentTime + delay, callback);
      currentTime += delay;
      return currentTime;
    };

    // Opening sequence
    scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.startSpikeShower(), 0);
    scheduleEvent(() => {}, 7000);

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

    // First boss lane attack (boss enters, fires, exits)
    scheduleEvent(
      () =>
        this.levelManager.bossManager.bossFiresToLaneWithEntryExit(
          GAME_CONFIG.PLAYER.LEFT_X,
          10
        ),
      0
    );
    scheduleEvent(() => {}, 17000); // 1000ms warning + 16000ms attack

    scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
    scheduleEvent(() => {}, 2000);

    scheduleEvent(() => this.startSpikeShower(), 0);
    scheduleEvent(() => {}, 7000);

    // Second boss lane attack (boss enters, fires, exits)
    scheduleEvent(
      () =>
        this.levelManager.bossManager.bossFiresToLaneWithEntryExit(
          GAME_CONFIG.PLAYER.RIGHT_X,
          10
        ),
      0
    );
    scheduleEvent(() => {}, 17000); // 1000ms warning + 16000ms attack

    // === DEDICATED WEAVE SECTION ===
    // Weaves spawn continuously for 30 seconds

    scheduleEvent(() => this.startWave3WeaveSpawning(), 0);

    // Let weaves run for 30 seconds
    scheduleEvent(() => {}, 30000);

    // Trigger boss at the end of the sequence
    scheduleEvent(() => {
      this.stopWave3WeaveSpawning();
      this.levelManager.stopLevel();
    }, 0);
  }

  // === WAVE ENDINGS ===

  endWave(waveNumber) {
    if (waveNumber === 1) {
      this.endWave1();
    } else if (waveNumber === 2) {
      this.endWave2();
    } else if (waveNumber === 3) {
      this.endWave3();
    }
  }

  endWave1() {
    this.isBossActive = true;

    // Transition to boss music
    if (this.scene.audioManager) {
      this.scene.audioManager.transitionToBossMusic();
    }

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
        this.levelManager.bossManager.spawnWave1Boss(() => {
          this.isBossActive = false;
          this.triggerPostBossSequence();
        });
      },
    });
  }

  endWave2() {
    this.isBossActive = true;

    // Start spike shower first
    this.startSpikeShower();

    // Wait for spike shower to complete (6500ms) before starting boss music
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
            this.levelManager.bossManager.spawnWave2Boss(() => {
              this.isBossActive = false;
              this.triggerPreWave3Sequence();
            });
          },
        });
      });
    });
  }

  endWave3() {
    this.isBossActive = true;

    // Reduce particle effects for better performance
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
      // Wait for the weave to exit naturally
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

  startWave3BossSequence() {
    // Transition to boss music
    if (this.scene.audioManager) {
      this.scene.audioManager.transitionToBossMusic();
    }

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
          this.levelManager.bossManager.spawnWave3FinalBoss();
        },
      });
    });
  }

  // === ENDING SEQUENCE ===

  // src/game/controllers/WaveManager.js - EXCERPT showing the ending sequence changes

  // This is the complete triggerEndingSequence method that needs to replace the existing one

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

      this.scene.endingScreenManager.show();
    });
  }

  // === POST-WAVE SEQUENCES ===

  triggerPostBossSequence() {
    // Fade out boss music to silence (don't start wave music yet)
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

      this.levelManager.restoreHealth();
      this.scene.displayWaveText("SECOND WAVE", () => {
        this.levelManager.startLevel(60, 2);
      });
    });
  }

  triggerPreWave3Sequence() {
    // Fade out boss music to silence (don't start wave music yet)
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

      this.levelManager.restoreHealth();
      this.scene.displayWaveText("THIRD WAVE", () => {
        this.levelManager.startLevel(120, 3);
      });
    });
  }
}
