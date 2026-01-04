// src/game/controllers/EndingScreenManager.js

export class EndingScreenManager {
  constructor(scene) {
    this.scene = scene;
  }

  show() {
    // Get completion count from registry
    let completionCount = this.scene.registry.get("completionCount") || 0;
    completionCount++;
    this.scene.registry.set("completionCount", completionCount);

    // Determine which puppy to show (cycle through 1, 2, 3)
    const puppyNumber = ((completionCount - 1) % 3) + 1;
    const puppyImage =
      puppyNumber === 1
        ? "puppyOne"
        : puppyNumber === 2
        ? "puppyTwo"
        : "puppyThree";

    // Dark overlay background (modal-style)
    const overlay = this.scene.add
      .rectangle(540, 960, 1080, 1920, 0x000000)
      .setDepth(199)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.85,
      duration: 500,
    });

    // Title text
    const titleText = this.scene.add
      .text(540, 200, "Thank you for Playing!", {
        fontFamily: '"Press Start 2P"',
        fontSize: "48px",
        fill: "#ff004d",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 1000,
      delay: 500,
    });

    // Reward text
    const rewardText = this.scene.add
      .text(540, 300, "For your reward, here's a picture\nof a cute dog.", {
        fontFamily: '"Press Start 2P"',
        fontSize: "28px",
        fill: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: rewardText,
      alpha: 1,
      duration: 1000,
      delay: 1000,
    });

    // Puppy image
    const puppyImg = this.scene.add
      .image(540, 700, puppyImage)
      .setScale(0.8)
      .setDepth(200)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: puppyImg,
      alpha: 1,
      scale: 1,
      duration: 1000,
      delay: 1500,
      ease: "Back.easeOut",
    });

    // Credits section
    const creditsY = 1100;
    const creditsSpacing = 50;

    const credits = [
      { text: "By Christopher Quinto", delay: 2000 },
      { text: "Game Assets By Kenney", delay: 2200 },
      { text: "Made using Phaser", delay: 2400 },
    ];

    credits.forEach((credit, index) => {
      const creditText = this.scene.add
        .text(540, creditsY + index * creditsSpacing, credit.text, {
          fontFamily: '"Press Start 2P"',
          fontSize: "24px",
          fill: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(200)
        .setAlpha(0);

      this.scene.tweens.add({
        targets: creditText,
        alpha: 1,
        duration: 800,
        delay: credit.delay,
      });
    });

    // Return to title button
    this.scene.time.delayedCall(3000, () => {
      this.createReturnButton();
    });
  }

  createReturnButton() {
    const btnX = 540;
    const btnY = 1450;

    const shadow = this.scene.add
      .rectangle(btnX, btnY + 15, 550, 120, 0x1d2b53)
      .setDepth(200)
      .setInteractive();

    const top = this.scene.add
      .rectangle(btnX, btnY, 550, 120, 0xff004d)
      .setDepth(200)
      .setInteractive();

    const buttonText = this.scene.add
      .text(btnX, btnY, "RETURN TO TITLE", {
        fontFamily: '"Press Start 2P"',
        fontSize: "32px",
        fill: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(200);

    // Button interaction
    top.on("pointerdown", () => {
      top.y = btnY + 10;
      buttonText.y = btnY + 10;
    });

    top.on("pointerup", () => {
      top.y = btnY;
      buttonText.y = btnY;
      this.returnToTitle();
    });

    // Fade in button
    top.setAlpha(0);
    shadow.setAlpha(0);
    buttonText.setAlpha(0);

    this.scene.tweens.add({
      targets: [top, shadow, buttonText],
      alpha: 1,
      duration: 500,
    });
  }

  returnToTitle() {
    // Stop all music immediately when returning to title
    if (this.scene.audioManager) {
      this.scene.audioManager.stopBackgroundMusic();
    }

    this.scene.cameras.main.fadeOut(1000, 0, 0, 0);

    this.scene.time.delayedCall(1000, () => {
      // Reset to title screen
      this.scene.isTitleScreen = true;
      this.scene.registry.set("shouldOpenIris", false);
      this.scene.scene.restart();
    });
  }
}
