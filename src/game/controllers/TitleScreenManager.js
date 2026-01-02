// src/game/controllers/TitleScreenManager.js

import { GAME_CONFIG } from "../config/GameConfig";
import { ParticleEffects } from "../effects/ParticleEffects";

export class TitleScreenManager {
  constructor(scene) {
    this.scene = scene;
    this.titleLoopCount = 0;
  }

  setupUI() {
    // Logo with floating effect
    this.logo = this.scene.add
      .image(520, 800, "logo")
      .setScale(1.2)
      .setDepth(10);

    this.scene.tweens.add({
      targets: this.logo,
      y: 830,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.createPlayButton();
    this.createCreditsText();
  }

  createPlayButton() {
    const btnX = 540;
    const btnY = 1100;

    const shadow = this.scene.add
      .rectangle(btnX, btnY + 15, 450, 140, 0x1d2b53)
      .setInteractive();

    const top = this.scene.add
      .rectangle(btnX, btnY, 450, 140, 0xff004d)
      .setInteractive();

    const playText = this.scene.add
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
      this.onPlayButtonPressed();
    });
  }

  createCreditsText() {
    // Left credit: By Christopher Quinto
    this.scene.add
      .text(40, 1880, "By Christopher Quinto", {
        fontFamily: '"Press Start 2P"',
        fontSize: "22px",
        fill: "#ffffff",
      })
      .setOrigin(0, 1)
      .setDepth(10);

    // Right credit: Game Assets by Kenney
    this.scene.add
      .text(1040, 1880, "Game Assets by Kenney", {
        fontFamily: '"Press Start 2P"',
        fontSize: "22px",
        fill: "#ffffff",
      })
      .setOrigin(1, 1)
      .setDepth(10);
  }

  onPlayButtonPressed() {
    // This will be called from the scene
    if (this.scene.onTitlePlayPressed) {
      this.scene.onTitlePlayPressed();
    }
  }

  setupPlayer(ground) {
    this.titlePlayer = this.scene.physics.add.sprite(820, 1500, "player", 0);
    this.titlePlayer.setScale(GAME_CONFIG.PLAYER.SCALE);
    this.titlePlayer.setDepth(5);

    this.scene.physics.add.collider(this.titlePlayer, ground);

    this.particleEffects = new ParticleEffects(this.scene, this.titlePlayer);

    this.runPlayerLoop();
  }

  runPlayerLoop() {
    const isFirstPattern = this.titleLoopCount % 2 === 0;

    if (isFirstPattern) {
      this.runPattern1();
    } else {
      this.runPattern2();
    }
  }

  runPattern1() {
    // Pattern 1: Left -> Right -> Jump
    this.scene.tweens.chain({
      targets: this.titlePlayer,
      tweens: [
        this.createDashTween(255, true, 1000),
        this.createDashTween(820, false, 700),
        this.createJumpTween(800),
      ],
    });
  }

  runPattern2() {
    // Pattern 2: Right -> Left -> Right -> Jump
    this.scene.tweens.chain({
      targets: this.titlePlayer,
      tweens: [
        this.createDashTween(820, false, 1000),
        this.createDashTween(255, true, 700),
        this.createDashTween(820, false, 700),
        this.createJumpTween(800),
      ],
    });
  }

  createDashTween(targetX, flipX, delay) {
    return {
      x: targetX,
      duration: 300,
      ease: "Cubic.out",
      delay: delay,
      onStart: () => {
        this.titlePlayer.setFlipX(flipX);
        this.particleEffects.resetToDash();
        this.particleEffects.setDashOffset(flipX ? 40 : -40, 0);
        this.particleEffects.startDash();
      },
      onComplete: () => {
        this.particleEffects.stopDash();
      },
    };
  }

  createJumpTween(delay) {
    return {
      y: 1500,
      duration: 1,
      delay: delay,
      onComplete: () => {
        if (
          this.titlePlayer.body.blocked.down ||
          this.titlePlayer.body.touching.down
        ) {
          this.titlePlayer.setVelocityY(-1400);
          this.particleEffects.playJumpEffect();

          this.waitForLanding();
        }
      },
    };
  }

  waitForLanding() {
    const checkLanding = () => {
      if (
        this.titlePlayer.body.blocked.down ||
        this.titlePlayer.body.touching.down
      ) {
        this.titleLoopCount++;
        if (this.scene.scene.isActive()) {
          this.scene.time.delayedCall(5000, () => this.runPlayerLoop());
        }
      } else {
        this.scene.time.delayedCall(100, checkLanding);
      }
    };
    this.scene.time.delayedCall(100, checkLanding);
  }

  update() {
    if (this.titlePlayer && this.titlePlayer.body) {
      const grounded =
        this.titlePlayer.body.blocked.down ||
        this.titlePlayer.body.touching.down;
      this.titlePlayer.setFrame(grounded ? 0 : 1);
    }
  }

  destroy() {
    if (this.particleEffects) {
      this.particleEffects = null;
    }
    if (this.titlePlayer) {
      this.titlePlayer.destroy();
    }
    if (this.logo) {
      this.logo.destroy();
    }
  }
}
