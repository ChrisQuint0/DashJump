// src/game/controllers/GameOverManager.js

export class GameOverManager {
  constructor(scene) {
    this.scene = scene;
  }

  show(onRetry) {
    // Semi-transparent dark overlay
    this.overlay = this.scene.add
      .rectangle(540, 960, 1080, 1920, 0x000000, 0.7)
      .setDepth(200)
      .setAlpha(0);

    // "You Died" text
    this.deathText = this.scene.add
      .text(540, 700, "YOU DIED", {
        fontFamily: '"Press Start 2P"',
        fontSize: "80px",
        fill: "#ff004d",
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setAlpha(0);

    // Retry button (same style as title screen)
    const btnX = 540;
    const btnY = 1000;

    this.buttonShadow = this.scene.add
      .rectangle(btnX, btnY + 15, 450, 140, 0x1d2b53)
      .setDepth(201)
      .setAlpha(0)
      .setInteractive();

    this.buttonTop = this.scene.add
      .rectangle(btnX, btnY, 450, 140, 0xff004d)
      .setDepth(201)
      .setAlpha(0)
      .setInteractive();

    this.buttonText = this.scene.add
      .text(btnX, btnY, "RETRY", {
        fontFamily: '"Press Start 2P"',
        fontSize: "64px",
        fill: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(202)
      .setAlpha(0);

    // Button interaction
    this.buttonTop.on("pointerdown", () => {
      this.buttonTop.y = btnY + 10;
      this.buttonText.y = btnY + 10;
    });

    this.buttonTop.on("pointerup", () => {
      this.buttonTop.y = btnY;
      this.buttonText.y = btnY;
      this.hide();
      if (onRetry) onRetry();
    });

    // Fade in animation
    this.scene.tweens.add({
      targets: [
        this.overlay,
        this.deathText,
        this.buttonShadow,
        this.buttonTop,
        this.buttonText,
      ],
      alpha: 1,
      duration: 500,
      ease: "Power2",
    });
  }

  hide() {
    // Fade out and destroy
    this.scene.tweens.add({
      targets: [
        this.overlay,
        this.deathText,
        this.buttonShadow,
        this.buttonTop,
        this.buttonText,
      ],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        if (this.overlay) this.overlay.destroy();
        if (this.deathText) this.deathText.destroy();
        if (this.buttonShadow) this.buttonShadow.destroy();
        if (this.buttonTop) this.buttonTop.destroy();
        if (this.buttonText) this.buttonText.destroy();
      },
    });
  }
}
