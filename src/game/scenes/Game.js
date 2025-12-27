// src/game/scenes/Game.js

import { Scene } from "phaser";
import { PlayerController } from "../controllers/PlayerController";
import { InputHandler } from "../controllers/InputHandler";
import { ParticleEffects } from "../effects/ParticleEffects";
import { GAME_CONFIG } from "../config/GameConfig";
import { TutorialManager } from "../controllers/TutorialManager";

export class Game extends Scene {
  constructor() {
    super("Game");
  }

  preload() {
    this.load.setPath("assets");
    this.load.image("background", "bg.png");
    this.load.image("cloud", "cloud.png"); // Added cloud asset
    this.load.image("spike", "spike.png");
    this.load.image("hand", "hand.png");
    this.load.image("red", "red.png");
    this.load.spritesheet("player", "blu.png", {
      frameWidth: 9,
      frameHeight: 7,
      endFrame: 1,
    });

    // Load Pixel Font via Google Fonts
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    ParticleEffects.createSpeedLineTexture(this);
  }

  create() {
    this.setupBackground();
    this.setupPlayer();
    this.setupGround();
    this.setupParticles();
    this.setupInput();

    // Initialize and Start Tutorial
    this.tutorial = new TutorialManager(
      this,
      this.playerController,
      this.inputHandler
    );
    this.time.delayedCall(1000, () => this.tutorial.startTutorial());
  }

  setupBackground() {
    // Background base
    this.add.image(540, 960, "background");

    // Add 6 animated clouds
    const numClouds = 6;
    const cloudSpeed = 30000; // Uniform speed for all clouds
    const skyTop = 494;
    const skyBottom = 1500;
    const skyHeightRange = skyBottom - skyTop;

    for (let i = 0; i < numClouds; i++) {
      // Calculate a base Y to ensure even vertical distribution
      const baseY = skyTop + (skyHeightRange / numClouds) * i;
      // Add a random offset (jitter) so they aren't in a perfect line
      const y = baseY + Phaser.Math.Between(-50, 50);

      // Randomize initial X fully across the screen width to avoid the "staircase" look
      const initialX = Phaser.Math.Between(0, 1080);

      const scale = Phaser.Math.FloatBetween(8, 12);

      const cloud = this.add.image(initialX, y, "cloud");
      cloud.setScale(scale);
      cloud.setAlpha(0.7);
      cloud.setDepth(1);

      // Calculate how much distance is left to cover for the first run
      const targetX = 1280 + cloud.width * scale;
      const remainingDistance = targetX - initialX;
      const totalDistance = targetX + 200 + cloud.width * scale;
      const initialDuration = cloudSpeed * (remainingDistance / totalDistance);

      this.tweens.add({
        targets: cloud,
        x: targetX,
        duration: initialDuration,
        repeat: 0,
        onComplete: () => {
          this.startCloudLoop(cloud, cloudSpeed, skyTop, skyBottom);
        },
      });
    }

    this.cameras.main.setRoundPixels(true);
  }

  // Helper to maintain the uniform loop
  startCloudLoop(cloud, speed, skyTop, skyBottom) {
    const scale = Phaser.Math.FloatBetween(8, 12);
    cloud.setScale(scale);
    // Spawn completely off-screen to the left
    cloud.x = -200 - cloud.width * scale;
    cloud.y = Phaser.Math.Between(skyTop, skyBottom);

    this.tweens.add({
      targets: cloud,
      x: 1280 + cloud.width * scale,
      duration: speed,
      repeat: -1,
      onRepeat: () => {
        const newScale = Phaser.Math.FloatBetween(8, 12);
        cloud.setScale(newScale);
        cloud.x = -200 - cloud.width * newScale;
        cloud.y = Phaser.Math.Between(skyTop, skyBottom);
      },
    });
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

  update() {
    this.playerController.update();
  }
}
