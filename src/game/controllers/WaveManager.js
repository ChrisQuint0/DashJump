// src/game/controllers/WaveManager.js

import { GAME_CONFIG } from "../config/GameConfig";

export class WaveManager {
  constructor(scene, playerController, levelManager, obstacleSpawner) {
    this.scene = scene;
    this.playerController = playerController;
    this.levelManager = levelManager;
    this.obstacleSpawner = obstacleSpawner;

    this.isSpikeShowerMode = false;
    this.weaveCount = 0;
    this.lastScenarioIndex = -1;
  }

  startWave(durationSeconds, waveNumber) {
    this.isSpikeShowerMode = false;
    this.weaveCount = 0;

    if (waveNumber === 3) {
      this.startWave3Sequence();
      return;
    }

    this.planNextAction(waveNumber);
  }

  planNextAction(waveNumber) {
    if (!this.levelManager.isActive) return;

    if (waveNumber === 1) {
      this.planWave1Action();
    } else if (waveNumber === 2) {
      this.planWave2Action();
    }
  }

  // === WAVE 1 LOGIC ===

  planWave1Action() {
    if (!this.levelManager.isActive) return;

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

  // === WAVE 2 LOGIC ===

  planWave2Action() {
    if (!this.levelManager.isActive || this.isSpikeShowerMode) return;

    if (this.obstacleSpawner.activeSpike) {
      this.scene.time.delayedCall(500, () =>
        this.planNextAction(this.levelManager.currentWave)
      );
      return;
    }

    if (this.obstacleSpawner.activeWeave) {
      if (this.weaveCount <= 2 && Math.random() < 0.5) {
        this.obstacleSpawner.spawnTargetedSpike();
        return;
      }
      this.scene.time.delayedCall(500, () =>
        this.planNextAction(this.levelManager.currentWave)
      );
      return;
    }

    // 30% chance to spawn weave
    if (
      !this.obstacleSpawner.activeWeave &&
      !this.obstacleSpawner.activeBall &&
      Math.random() < 0.3
    ) {
      this.weaveCount++;
      const weaveData = this.obstacleSpawner.spawnWeave();

      // Monitor for weave exit
      this.monitorWeaveExit(weaveData.exitCheck);
      return;
    }

    // Standard spike/ball logic
    const actionType = Math.random();
    if (
      actionType < 0.4 &&
      !this.obstacleSpawner.activeBall &&
      !this.obstacleSpawner.activeWeave
    ) {
      this.triggerRandomScenario();
    } else {
      this.obstacleSpawner.spawnTargetedSpike();
    }

    const nextDelay = this.obstacleSpawner.activeBall ? 2500 : 1800;
    this.scene.time.delayedCall(
      nextDelay / this.levelManager.difficultyMultiplier,
      () => this.planNextAction(2)
    );
  }

  monitorWeaveExit(exitCheck) {
    const checkInterval = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (!this.obstacleSpawner.activeWeave) {
          checkInterval.remove();

          // Trigger mini shower after weave exits naturally
          if (
            !this.obstacleSpawner.activeBall &&
            !this.obstacleSpawner.activeSpike
          ) {
            this.spawnMiniSpikeShower();
          } else {
            this.scene.time.delayedCall(1000, () => this.planNextAction(2));
          }
        }
      },
      loop: true,
    });
  }

  // === COMBO SCENARIOS ===

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

    this.scene.time.delayedCall(1500, () => {
      if (this.levelManager.isActive) {
        console.log("Mini shower complete - spawning ball");
        this.obstacleSpawner.spawnBall();
      }
    });

    this.scene.time.delayedCall(2000, () => this.planNextAction(2));
  }

  startSpikeShower() {
    console.log("Starting spike shower!");
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
        console.log(`Spawning shower spike at ${spike.x}`);
        this.obstacleSpawner.spawnShowerSpike(spike.x);
      });
    });

    this.scene.time.delayedCall(6000, () => {
      console.log("Spike shower complete");
    });

    this.scene.time.delayedCall(6500, () => {
      this.isSpikeShowerMode = false;
      console.log("Spike shower mode ended");
    });
  }

  // === WAVE 3 SCRIPTED SEQUENCE ===

  startWave3Sequence() {
    console.log("Starting Wave 3 scripted sequence");
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
    scheduleEvent(() => {}, 16000);

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
    scheduleEvent(() => {}, 16000);

    const timeRemaining = 90000 - currentTime; // 1:30 total duration
    console.log(
      `Time remaining to fill: ${timeRemaining}ms, current: ${currentTime}ms`
    );

    // More interesting fill patterns with variety
    let patternIndex = 0;
    const fillPatterns = [
      // Pattern 1: Double dash scenario
      () => {
        scheduleEvent(
          () => this.obstacleSpawner.spawnLaneSpike(GAME_CONFIG.PLAYER.LEFT_X),
          0
        );
        scheduleEvent(() => {}, 800);
        scheduleEvent(
          () => this.obstacleSpawner.spawnLaneSpike(GAME_CONFIG.PLAYER.RIGHT_X),
          0
        );
        scheduleEvent(() => {}, 1500);
        scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
        scheduleEvent(() => {}, 2500);
      },

      // Pattern 2: Ball gauntlet
      () => {
        scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
        scheduleEvent(() => {}, 2000);
        scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
        scheduleEvent(() => {}, 2000);
        scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
        scheduleEvent(() => {}, 2500);
      },

      // Pattern 3: Mini spike shower with ball
      () => {
        scheduleEvent(() => this.spawnMiniSpikeShower(), 0);
        scheduleEvent(() => {}, 3500);
      },

      // Pattern 4: Targeted spike pressure
      () => {
        scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
        scheduleEvent(() => {}, 1500);
        scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
        scheduleEvent(() => {}, 1500);
        scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
        scheduleEvent(() => {}, 2500);
      },

      // Pattern 5: The trap scenario
      () => {
        scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
        scheduleEvent(() => {}, 800);
        scheduleEvent(() => this.obstacleSpawner.spawnTargetedSpike(), 0);
        scheduleEvent(() => {}, 2000);
        scheduleEvent(() => this.obstacleSpawner.spawnBall(), 0);
        scheduleEvent(() => {}, 2500);
      },
    ];

    while (currentTime < 85000) {
      // Fill until 85 seconds (leave 5s for ending)
      fillPatterns[patternIndex % fillPatterns.length]();
      patternIndex++;
    }

    console.log(`Final sequence time: ${currentTime}ms`);

    // Trigger boss at 90 seconds (1:30)
    this.scene.time.delayedCall(90000, () => {
      console.log("Wave 3 time complete, triggering final boss");
      this.levelManager.stopLevel();
    });
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
          this.triggerPostBossSequence();
        });
      },
    });
  }

  endWave2() {
    this.startSpikeShower();

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
          this.levelManager.bossManager.spawnWave2Boss(() => {
            this.triggerPreWave3Sequence();
          });
        },
      });
    });
  }

  endWave3() {
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
          // This triggers the FINAL boss sequence (10 shots, 10 shots, lane attacks)
          this.levelManager.bossManager.spawnWave3FinalBoss();
        },
      });
    });
  }

  // === POST-WAVE SEQUENCES ===

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
      this.levelManager.restoreHealth();
      this.scene.displayWaveText("SECOND WAVE", () => {
        this.levelManager.startLevel(60, 2);
      });
    });
  }

  triggerPreWave3Sequence() {
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
      this.levelManager.restoreHealth();
      this.scene.displayWaveText("THIRD WAVE", () => {
        this.levelManager.startLevel(120, 3);
      });
    });
  }
}
