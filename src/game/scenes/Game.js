// src/game/scenes/Game.js

import { Scene } from "phaser";
import { PlayerController } from "../controllers/PlayerController";
import { InputHandler } from "../controllers/InputHandler";
import { ParticleEffects } from "../effects/ParticleEffects";
import { GAME_CONFIG } from "../config/GameConfig";
import { TutorialManager } from "../controllers/TutorialManager";
import { TitleScreenManager } from "../controllers/TitleScreenManager";
import { BackgroundManager } from "../controllers/BackgroundManager";
import { TransitionManager } from "../controllers/TransitionManager";
import { DialogueManager } from "../controllers/DialogueManager";
import { LevelManager } from "../controllers/LevelManager";
import { GameOverManager } from "../controllers/GameOverManager";
import { EndingScreenManager } from "../controllers/EndingScreenManager";

// ===== DEVELOPMENT MODE =====
// Set this to true to skip tutorial, dialogue, and wave 1
const DEV_MODE = true;
const DEV_START_WAVE = 3; // Which wave to start on
// ============================

export class Game extends Scene {
  constructor() {
    super("Game");
    this.isTitleScreen = true;
    this.lives = GAME_CONFIG.PLAYER.MAX_LIVES;
    this.hearts = [];
  }

  createSpeedLineTexture() {
    if (!this.textures.exists("speedLine")) {
      ParticleEffects.createSpeedLineTexture(this);
    }
  }

  create() {
    this.createSpeedLineTexture();
    // Reset lives at the start of create
    this.lives = GAME_CONFIG.PLAYER.MAX_LIVES;

    this.setupManagers();
    this.backgroundManager.setup();
    this.setupGround();

    if (this.isTitleScreen) {
      this.setupTitleScreen();
    } else {
      this.setupGameplay();

      if (this.registry.get("shouldOpenIris")) {
        this.transitionManager.openIris(() => {
          this.registry.set("shouldOpenIris", false);
        });
      }
    }

    if (!this.textures.exists("plasma")) {
      this.createPlasmaBulletTexture();
    }
  }

  setupUI() {
    this.hearts = [];
    for (let i = 0; i < GAME_CONFIG.PLAYER.MAX_LIVES; i++) {
      const x =
        GAME_CONFIG.PLAYER.HEART_START_X + i * GAME_CONFIG.PLAYER.HEART_SPACING;
      const y = GAME_CONFIG.PLAYER.HEART_START_Y;

      const heart = this.add
        .image(x, y, "heart")
        .setScale(GAME_CONFIG.PLAYER.HEART_SCALE)
        .setDepth(100)
        .setScrollFactor(0);

      this.hearts.push(heart);
    }
  }

  updateLives() {
    this.lives--;

    // Update UI
    for (let i = 0; i < this.hearts.length; i++) {
      if (i >= this.lives) {
        this.hearts[i].setTexture("emptyHeart");
      }
    }

    // Camera shake for feedback
    this.cameras.main.shake(200, 0.01);

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  gameOver() {
    // Store the current wave before game over
    const currentWave = this.levelManager?.currentWave || 1;
    this.registry.set("restartWave", currentWave);

    // Stop all game activity IMMEDIATELY
    if (this.levelManager) {
      this.levelManager.isActive = false;

      if (this.levelManager.spawnTimer) {
        this.levelManager.spawnTimer.remove();
        this.levelManager.spawnTimer = null;
      }
      if (this.levelManager.difficultyEvent) {
        this.levelManager.difficultyEvent.remove();
        this.levelManager.difficultyEvent = null;
      }
      if (this.levelManager.levelEndTimer) {
        this.levelManager.levelEndTimer.remove();
        this.levelManager.levelEndTimer = null;
      }
    }

    this.time.removeAllEvents();
    this.physics.pause();
    this.player.setTint(0xff0000);

    this.gameOverManager.show(() => {
      this.isTitleScreen = false;
      this.registry.set("tutorialCompleted", true);
      this.registry.set("skipDialogue", true);
      this.scene.restart();
    });
  }

  setupManagers() {
    this.transitionManager = new TransitionManager(this);
    this.backgroundManager = new BackgroundManager(this);
    this.dialogueManager = new DialogueManager(this);
    this.gameOverManager = new GameOverManager(this);
    this.endingScreenManager = new EndingScreenManager(this);
  }

  setupTitleScreen() {
    this.titleScreenManager = new TitleScreenManager(this);
    this.titleScreenManager.setupUI();
    this.titleScreenManager.setupPlayer(this.ground);

    this.onTitlePlayPressed = () => this.startGame();
  }

  startGame() {
    this.transitionManager.closeIris(() => {
      this.isTitleScreen = false;
      this.registry.set("shouldOpenIris", true);
      this.scene.restart();
    });
  }

  setupGameplay() {
    this.setupPlayer();
    this.setupParticles();
    this.setupInput();
    this.setupUI();

    this.levelManager = new LevelManager(this, this.playerController);

    this.setupTutorial();
  }

  setupGround() {
    this.ground = this.add.rectangle(
      GAME_CONFIG.GROUND.X,
      GAME_CONFIG.GROUND.Y,
      GAME_CONFIG.GROUND.WIDTH,
      GAME_CONFIG.GROUND.HEIGHT,
      0x000000,
      0
    );
    this.physics.add.existing(this.ground, true);
  }

  setupPlayer() {
    this.player = this.physics.add.sprite(
      GAME_CONFIG.PLAYER.START_X,
      GAME_CONFIG.PLAYER.START_Y,
      "player",
      0
    );
    this.player.setScale(GAME_CONFIG.PLAYER.SCALE);
    this.player.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(2);
    this.physics.add.collider(this.player, this.ground);
  }

  setupParticles() {
    this.particleEffects = new ParticleEffects(this, this.player);
  }

  setupInput() {
    this.playerController = new PlayerController(
      this,
      this.player,
      this.particleEffects
    );
    this.inputHandler = new InputHandler(this, this.playerController);
  }

  setupTutorial() {
    // ===== DEV MODE SHORTCUT =====
    if (DEV_MODE) {
      console.log(`🔧 DEV MODE: Skipping to Wave ${DEV_START_WAVE}`);
      this.registry.set("tutorialCompleted", true);
      this.time.delayedCall(500, () => {
        let waveName = " ";
        if (DEV_START_WAVE === 1) {
          waveName = "FIRST WAVE";
        } else if (DEV_START_WAVE === 2) {
          waveName = "SECOND WAVE";
        } else if (DEV_START_WAVE === 3) {
          waveName = "THIRD WAVE";
        }

        this.displayWaveText(waveName, () => {
          this.levelManager.startLevel(60, DEV_START_WAVE);
        });
      });
      return;
    }
    // =============================

    // Check if we're restarting from a game over
    const restartWave = this.registry.get("restartWave");

    if (restartWave && restartWave > 1) {
      // Player died and needs to restart at their current wave
      console.log(`Restarting at Wave ${restartWave}`);

      let waveName = "";
      if (restartWave === 2) {
        waveName = "SECOND WAVE";
      } else if (restartWave === 3) {
        waveName = "THIRD WAVE";
      }

      this.time.delayedCall(500, () => {
        this.displayWaveText(waveName, () => {
          this.levelManager.startLevel(60, restartWave);
        });
      });
      return;
    }

    // Only show tutorial if not completed before
    if (!this.registry.get("tutorialCompleted")) {
      this.tutorial = new TutorialManager(
        this,
        this.playerController,
        this.inputHandler
      );
      this.time.delayedCall(500, () => this.tutorial.startTutorial());
    } else {
      // Skip tutorial and check if we should skip dialogue too
      if (this.registry.get("skipDialogue")) {
        this.registry.set("skipDialogue", false);
        this.time.delayedCall(500, () => {
          console.log("Skipping dialogue, starting level directly.");
          this.displayWaveText("FIRST WAVE", () => {
            this.levelManager.startLevel(60);
          });
        });
      } else {
        this.time.delayedCall(500, () => this.startIntroSequence());
      }
    }
  }

  displayWaveText(message, callback) {
    const waveText = this.add
      .text(540, 960, message, {
        fontFamily: '"Press Start 2P"',
        fontSize: "64px",
        fill: "#1d2b53",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(200);

    this.tweens.add({
      targets: waveText,
      alpha: 1,
      duration: 1000,
      hold: 1000,
      yoyo: true,
      ease: "Linear",
      onComplete: () => {
        waveText.destroy();
        if (callback) callback();
      },
    });
  }

  startIntroSequence() {
    this.dialogueManager.showDialogue(this.dialogueManager.introLines, () => {
      this.displayWaveText("FIRST WAVE", () => {
        this.levelManager.startLevel(60);
      });
    });
  }

  createPlasmaBulletTexture() {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      2,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.3, "#00ff66");
    gradient.addColorStop(0.7, "#00cc44");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    this.textures.addCanvas("plasma", canvas);
  }

  update() {
    if (this.isTitleScreen) {
      this.titleScreenManager?.update();
    } else {
      // Only update if playerController exists and player is properly initialized
      if (this.playerController && this.player && this.player.body) {
        this.playerController.update();
      }
    }
  }
}
