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
  }

  setupManagers() {
    this.transitionManager = new TransitionManager(this);
    this.backgroundManager = new BackgroundManager(this);
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

  update() {
    if (this.isTitleScreen) {
      this.titleScreenManager?.update();
    } else {
      this.playerController?.update();
    }
  }
}
