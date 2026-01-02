// src/game/controllers/LevelManager.js

import { GAME_CONFIG } from "../config/GameConfig";
import { ObstacleSpawner } from "./ObstacleSpawner";
import { WaveManager } from "./WaveManager";
import { BossManager } from "./BossManager";

// ===== DEVELOPMENT MODE =====
const DEV_MODE = true;
const DEV_START_WAVE = 3;
// ============================

export class LevelManager {
  constructor(scene, playerController) {
    this.scene = scene;
    this.playerController = playerController;
    this.isActive = false;
    this.difficultyMultiplier = 1;
    this.currentWave = 1;

    // Initialize sub-managers
    this.obstacleSpawner = new ObstacleSpawner(scene, playerController, this);
    this.waveManager = new WaveManager(
      scene,
      playerController,
      this,
      this.obstacleSpawner
    );
    this.bossManager = new BossManager(scene, playerController, this);

    // Timers
    this.difficultyEvent = null;
    this.levelEndTimer = null;
  }

  startLevel(durationSeconds = 60, waveNumber = 1) {
    this.isActive = true;
    this.currentWave = waveNumber;
    this.difficultyMultiplier = 1;

    // Delegate to WaveManager
    this.waveManager.startWave(durationSeconds, waveNumber);

    // Setup difficulty scaling (not for Wave 3 which is scripted)
    if (waveNumber !== 3) {
      this.difficultyEvent = this.scene.time.addEvent({
        delay: 15000,
        callback: () => {
          this.difficultyMultiplier += 0.2;
        },
        loop: true,
      });

      this.levelEndTimer = this.scene.time.delayedCall(
        durationSeconds * 1000,
        () => this.stopLevel()
      );
    }
  }

  stopLevel() {
    // Clean up all timers
    if (this.difficultyEvent) {
      this.difficultyEvent.remove();
      this.difficultyEvent = null;
    }
    if (this.levelEndTimer) {
      this.levelEndTimer.remove();
      this.levelEndTimer = null;
    }

    // Delegate wave ending to WaveManager
    this.waveManager.endWave(this.currentWave);

    // Deactivate after delay
    this.scene.time.delayedCall(7000, () => {
      this.isActive = false;
      this.obstacleSpawner.clearAllObstacles();
    });
  }

  restoreHealth() {
    if (this.scene.lives < 2) {
      this.scene.lives = 2;
      this.scene.hearts.forEach((heart) => heart.setTexture("heart"));
    }
  }

  handlePlayerHit() {
    this.scene.cameras.main.shake(200, 0.02);
  }
}
