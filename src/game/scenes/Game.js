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

export class Game extends Scene {
  constructor() {
    super("Game");
    this.isTitleScreen = true;
  }

  preload() {
    this.load.setPath("assets");
    this.load.image("background", "bg.png");
    this.load.image("cloud", "cloud.png");
    this.load.image("spike", "spike.png");
    this.load.image("hand", "hand.png");
    this.load.image("red", "red.png");
    this.load.image("logo", "dashJumpLogo.png");
    this.load.spritesheet("player", "blu.png", {
      frameWidth: 9,
      frameHeight: 7,
      endFrame: 1,
    });
    this.load.image("geri", "geri.png");
    this.load.image("bubble", "bubble.png");
    this.load.image("shootingBoss", "shootingBoss.png");

    this.loadFont();
    this.createSpeedLineTexture();
  }

  loadFont() {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  createSpeedLineTexture() {
    if (!this.textures.exists("speedLine")) {
      ParticleEffects.createSpeedLineTexture(this);
    }
  }

  create() {
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

  setupManagers() {
    this.transitionManager = new TransitionManager(this);
    this.backgroundManager = new BackgroundManager(this);
    this.dialogueManager = new DialogueManager(this);
    this.dialogueManager = new DialogueManager(this);
  }

  setupTitleScreen() {
    this.titleScreenManager = new TitleScreenManager(this);
    this.titleScreenManager.setupUI();
    this.titleScreenManager.setupPlayer(this.ground);

    // Set callback for play button
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

    // Initialize LevelManager
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
    this.tutorial = new TutorialManager(
      this,
      this.playerController,
      this.inputHandler
    );
    this.time.delayedCall(500, () => this.tutorial.startTutorial());
  }

  startIntroSequence() {
    this.dialogueManager.showIntroduction(() => {
      console.log("Dialogue complete! Start Level 1 logic here.");
      this.levelManager.startLevel(60);
    });
  }

  // Add this to your Game.js (or inside ParticleEffects.js)
  createPlasmaBulletTexture() {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    // Drawing a glowing radial gradient
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      2,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "#ffffff"); // White core
    gradient.addColorStop(0.3, "#00ff66"); // Bright green inner glow
    gradient.addColorStop(0.7, "#00cc44"); // Deeper green mid
    gradient.addColorStop(1, "transparent"); // Outer fade
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
      this.playerController?.update();
    }
  }
}
