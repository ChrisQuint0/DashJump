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

    // Load Pixel Font via Google Fonts
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Prevent "Texture key already in use" error on restart
    if (!this.textures.exists("speedLine")) {
      ParticleEffects.createSpeedLineTexture(this);
    }
  }

  create() {
    // Create transition graphic FIRST before anything else
    this.transitionGraphic = this.add.graphics();
    this.transitionGraphic.setDepth(2000);

    this.setupBackground();
    this.setupGround();

    if (this.isTitleScreen) {
      this.setupTitleUI();
      this.setupTitlePlayer();
    } else {
      this.setupGameplay();
      // Check if we should open iris
      if (this.registry.get("shouldOpenIris")) {
        this.openIris();
      }
    }
  }

  setupBackground() {
    this.add.image(540, 960, "background");

    const numClouds = 6;
    const cloudSpeed = 30000;
    const skyTop = 494;
    const skyBottom = 1500;
    const skyHeightRange = skyBottom - skyTop;

    for (let i = 0; i < numClouds; i++) {
      const baseY = skyTop + (skyHeightRange / numClouds) * i;
      const y = baseY + Phaser.Math.Between(-50, 50);
      const initialX = Phaser.Math.Between(0, 1080);
      const scale = Phaser.Math.FloatBetween(8, 12);

      const cloud = this.add.image(initialX, y, "cloud");
      cloud.setScale(scale);
      cloud.setAlpha(0.7);
      cloud.setDepth(1);

      const targetX = 1280 + cloud.width * scale;
      const remainingDistance = targetX - initialX;
      const totalDistance = targetX + 200 + cloud.width * scale;
      const initialDuration = cloudSpeed * (remainingDistance / totalDistance);

      this.tweens.add({
        targets: cloud,
        x: targetX,
        duration: initialDuration,
        onComplete: () =>
          this.startCloudLoop(cloud, cloudSpeed, skyTop, skyBottom),
      });
    }

    this.cameras.main.setRoundPixels(true);
  }

  startCloudLoop(cloud, speed, skyTop, skyBottom) {
    const scale = Phaser.Math.FloatBetween(8, 12);
    cloud.setScale(scale);
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

  setupTitleUI() {
    // Logo with floating effect
    this.logo = this.add.image(520, 800, "logo").setScale(1.2).setDepth(10);
    this.tweens.add({
      targets: this.logo,
      y: 830,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Retro 3D Style Button
    const btnX = 540;
    const btnY = 1100;
    const shadow = this.add
      .rectangle(btnX, btnY + 15, 450, 140, 0x1d2b53)
      .setInteractive();
    const top = this.add
      .rectangle(btnX, btnY, 450, 140, 0xff004d)
      .setInteractive();
    const playText = this.add
      .text(btnX, btnY, "PLAY", {
        fontFamily: '"Press Start 2P"',
        fontSize: "64px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    top.on("pointerdown", () => {
      top.y = btnY + 10;
      playText.y = btnY + 10;
    });

    top.on("pointerup", () => {
      top.y = btnY;
      playText.y = btnY;
      this.playCartoonTransition();
    });
  }

  setupTitlePlayer() {
    // Positioned slightly above ground (1634) to allow falling/colliding
    this.titlePlayer = this.physics.add.sprite(820, 1500, "player", 0);
    this.titlePlayer.setScale(GAME_CONFIG.PLAYER.SCALE);
    this.titlePlayer.setDepth(5);

    this.physics.add.collider(this.titlePlayer, this.ground);

    // Setup particle effects for title player
    this.titleParticleEffects = new ParticleEffects(this, this.titlePlayer);

    this.runTitlePlayerLoop();
  }

  runTitlePlayerLoop() {
    if (!this.titleLoopCount) this.titleLoopCount = 0;

    // Alternate between two patterns
    const isFirstPattern = this.titleLoopCount % 2 === 0;

    if (isFirstPattern) {
      // Pattern 1: Left -> Right -> Jump
      this.tweens.chain({
        targets: this.titlePlayer,
        tweens: [
          {
            x: 255,
            duration: 300,
            ease: "Cubic.out",
            delay: 1000,
            onStart: () => {
              this.titlePlayer.setFlipX(true);
              // Dash left particle effect
              this.titleParticleEffects.resetToDash();
              this.titleParticleEffects.setDashOffset(40, 0);
              this.titleParticleEffects.startDash();
            },
            onComplete: () => {
              this.titleParticleEffects.stopDash();
            },
          },
          {
            x: 820,
            duration: 300,
            ease: "Cubic.out",
            delay: 700,
            onStart: () => {
              this.titlePlayer.setFlipX(false);
              // Dash right particle effect
              this.titleParticleEffects.resetToDash();
              this.titleParticleEffects.setDashOffset(-40, 0);
              this.titleParticleEffects.startDash();
            },
            onComplete: () => {
              this.titleParticleEffects.stopDash();
            },
          },
          {
            y: 1500,
            duration: 1,
            delay: 800,
            onComplete: () => {
              // Only jump once after the delay
              if (
                this.titlePlayer.body.blocked.down ||
                this.titlePlayer.body.touching.down
              ) {
                this.titlePlayer.setVelocityY(-1400);
                // Jump particle effect
                this.titleParticleEffects.playJumpEffect();

                // Wait for landing then continue loop
                const checkLanding = () => {
                  if (
                    this.titlePlayer.body.blocked.down ||
                    this.titlePlayer.body.touching.down
                  ) {
                    this.titleLoopCount++;
                    if (this.isTitleScreen && this.scene.isActive()) {
                      this.time.delayedCall(5000, () =>
                        this.runTitlePlayerLoop()
                      );
                    }
                  } else {
                    this.time.delayedCall(100, checkLanding);
                  }
                };
                this.time.delayedCall(100, checkLanding);
              }
            },
          },
        ],
      });
    } else {
      // Pattern 2: Right -> Left -> Right -> Jump
      this.tweens.chain({
        targets: this.titlePlayer,
        tweens: [
          {
            x: 820,
            duration: 300,
            ease: "Cubic.out",
            delay: 1000,
            onStart: () => {
              this.titlePlayer.setFlipX(false);
              // Dash right particle effect
              this.titleParticleEffects.resetToDash();
              this.titleParticleEffects.setDashOffset(-40, 0);
              this.titleParticleEffects.startDash();
            },
            onComplete: () => {
              this.titleParticleEffects.stopDash();
            },
          },
          {
            x: 255,
            duration: 300,
            ease: "Cubic.out",
            delay: 700,
            onStart: () => {
              this.titlePlayer.setFlipX(true);
              // Dash left particle effect
              this.titleParticleEffects.resetToDash();
              this.titleParticleEffects.setDashOffset(40, 0);
              this.titleParticleEffects.startDash();
            },
            onComplete: () => {
              this.titleParticleEffects.stopDash();
            },
          },
          {
            x: 820,
            duration: 300,
            ease: "Cubic.out",
            delay: 700,
            onStart: () => {
              this.titlePlayer.setFlipX(false);
              // Dash right particle effect
              this.titleParticleEffects.resetToDash();
              this.titleParticleEffects.setDashOffset(-40, 0);
              this.titleParticleEffects.startDash();
            },
            onComplete: () => {
              this.titleParticleEffects.stopDash();
            },
          },
          {
            y: 1500,
            duration: 1,
            delay: 800,
            onComplete: () => {
              // Only jump once after the delay
              if (
                this.titlePlayer.body.blocked.down ||
                this.titlePlayer.body.touching.down
              ) {
                this.titlePlayer.setVelocityY(-1400);
                // Jump particle effect
                this.titleParticleEffects.playJumpEffect();

                // Wait for landing then continue loop
                const checkLanding = () => {
                  if (
                    this.titlePlayer.body.blocked.down ||
                    this.titlePlayer.body.touching.down
                  ) {
                    this.titleLoopCount++;
                    if (this.isTitleScreen && this.scene.isActive()) {
                      this.time.delayedCall(5000, () =>
                        this.runTitlePlayerLoop()
                      );
                    }
                  } else {
                    this.time.delayedCall(100, checkLanding);
                  }
                };
                this.time.delayedCall(100, checkLanding);
              }
            },
          },
        ],
      });
    }
  }

  playCartoonTransition() {
    // Disable input during transition
    this.input.enabled = false;

    const width = 1080;
    const height = 1920;
    const maxRadius = Math.sqrt(width * width + height * height);
    const transitionState = { radius: maxRadius };

    // Close iris (circle shrinks)
    this.tweens.add({
      targets: transitionState,
      radius: 0,
      duration: 600,
      ease: "Power2.easeIn",
      onUpdate: () => {
        this.transitionGraphic.clear();
        this.transitionGraphic.fillStyle(0x3d2963, 1);

        // Draw the full rich purple screen
        this.transitionGraphic.fillRect(0, 0, width, height);

        // Cut out a circle in the middle (this creates the iris hole)
        this.transitionGraphic.fillStyle(0x000000, 0);
        this.transitionGraphic.fillCircle(
          width / 2,
          height / 2,
          transitionState.radius
        );

        // Use a mask to actually create the cutout effect
        const shape = this.make.graphics();
        shape.fillStyle(0xffffff);
        shape.fillCircle(width / 2, height / 2, transitionState.radius);

        const mask = shape.createGeometryMask();
        mask.setInvertAlpha(true);
        this.transitionGraphic.setMask(mask);
      },
      onComplete: () => {
        // Wait a moment at full black, then restart
        this.time.delayedCall(100, () => {
          this.isTitleScreen = false;

          // Store that we need to open iris
          this.registry.set("shouldOpenIris", true);

          this.scene.restart();
        });
      },
    });
  }

  openIris() {
    const width = 1080;
    const height = 1920;
    const maxRadius = Math.sqrt(width * width + height * height);
    const transitionState = { radius: 0 };

    // Start with rich purple screen
    this.transitionGraphic.clear();
    this.transitionGraphic.fillStyle(0x3d2963, 1);
    this.transitionGraphic.fillRect(0, 0, width, height);

    // Small delay before opening
    this.time.delayedCall(100, () => {
      // Open iris (circle expands)
      this.tweens.add({
        targets: transitionState,
        radius: maxRadius,
        duration: 600,
        ease: "Power2.easeOut",
        onUpdate: () => {
          this.transitionGraphic.clear();
          this.transitionGraphic.fillStyle(0x3d2963, 1);
          this.transitionGraphic.fillRect(0, 0, width, height);

          // Create a circular mask that grows
          const shape = this.make.graphics();
          shape.fillStyle(0xffffff);
          shape.fillCircle(width / 2, height / 2, transitionState.radius);

          const mask = shape.createGeometryMask();
          mask.setInvertAlpha(true);
          this.transitionGraphic.setMask(mask);
        },
        onComplete: () => {
          this.transitionGraphic.clear();
          this.transitionGraphic.clearMask();
          this.registry.set("shouldOpenIris", false);
        },
      });
    });
  }

  setupGameplay() {
    this.setupPlayer();
    this.setupParticles();
    this.setupInput();

    this.tutorial = new TutorialManager(
      this,
      this.playerController,
      this.inputHandler
    );
    this.time.delayedCall(500, () => this.tutorial.startTutorial());
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

  update() {
    const p = this.isTitleScreen ? this.titlePlayer : this.player;
    if (p && p.body) {
      const grounded = p.body.blocked.down || p.body.touching.down;
      p.setFrame(grounded ? 0 : 1);
    }

    if (!this.isTitleScreen && this.playerController) {
      this.playerController.update();
    }
  }
}
