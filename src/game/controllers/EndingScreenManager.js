// src/game/controllers/EndingScreenManager.js

/**
 * EndingScreenManager
 *
 * Manages the game's ending screen sequence including:
 * - Thank you message display
 * - Rotating puppy image rewards (cycles through 3 dogs)
 * - Credits display with staggered animations
 * - Return to title functionality
 * - Completion tracking across play sessions
 *
 * Features a modal-style overlay with smooth fade-in animations and
 * interactive return button. Puppy images rotate based on completion count
 * to provide variety for repeat players.
 *
 * @class
 */
export class EndingScreenManager {
  /**
   * Creates a new EndingScreenManager instance
   *
   * @param {Phaser.Scene} scene - The game scene this manager operates in
   */
  constructor(scene) {
    this.scene = scene;
  }

  // ============================================================================
  // MAIN ENDING SEQUENCE
  // ============================================================================

  /**
   * Displays the complete ending screen sequence
   *
   * Animation timeline:
   * - 0ms: Dark overlay fades in
   * - 500ms: Title text appears
   * - 1000ms: Reward text appears
   * - 1500ms: Puppy image zooms in
   * - 2000-2400ms: Credits fade in sequentially
   * - 3000ms: Return button appears
   *
   * Also increments and tracks completion count for puppy rotation
   */
  show() {
    // Increment and persist completion count across sessions
    let completionCount = this.scene.registry.get("completionCount") || 0;
    completionCount++;
    this.scene.registry.set("completionCount", completionCount);

    // Cycle through 3 different puppy images (1 → 2 → 3 → 1 → ...)
    const puppyNumber = ((completionCount - 1) % 3) + 1;
    const puppyImage =
      puppyNumber === 1
        ? "puppyOne"
        : puppyNumber === 2
        ? "puppyTwo"
        : "puppyThree";

    // ===== Dark Modal Overlay =====
    const overlay = this.scene.add
      .rectangle(540, 960, 1080, 1920, 0x000000)
      .setDepth(199) // Behind all ending screen elements
      .setAlpha(0);

    this.scene.tweens.add({
      targets: overlay,
      alpha: 0.85, // Semi-transparent for modal effect
      duration: 500,
    });

    // ===== Title Text =====
    const titleText = this.scene.add
      .text(540, 200, "Thank you for Playing!", {
        fontFamily: '"Press Start 2P"',
        fontSize: "48px",
        fill: "#ff004d", // Game's signature red color
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 1000,
      delay: 500, // Appears after overlay settles
    });

    // ===== Reward Text =====
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
      delay: 1000, // Appears 500ms after title
    });

    // ===== Puppy Image (Rotates on each completion) =====
    const puppyImg = this.scene.add
      .image(540, 700, puppyImage)
      .setScale(0.8) // Start slightly smaller
      .setDepth(200)
      .setAlpha(0);

    this.scene.tweens.add({
      targets: puppyImg,
      alpha: 1,
      scale: 1, // Scale to full size
      duration: 1000,
      delay: 1500, // Appears 500ms after reward text
      ease: "Back.easeOut", // Bounce effect on entry
    });

    // ===== Credits Section =====
    const creditsY = 1100;
    const creditsSpacing = 50;

    // Credits with individual delays for staggered appearance
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

      // Staggered fade-in (200ms between each credit line)
      this.scene.tweens.add({
        targets: creditText,
        alpha: 1,
        duration: 800,
        delay: credit.delay,
      });
    });

    // ===== Return Button (Appears Last) =====
    this.scene.time.delayedCall(3000, () => {
      this.createReturnButton();
    });
  }

  // ============================================================================
  // INTERACTIVE BUTTON
  // ============================================================================

  /**
   * Creates an interactive "Return to Title" button
   *
   * Button features:
   * - Layered shadow effect for depth
   * - Press animation (button moves down on click)
   * - Smooth fade-in entrance
   *
   * @private
   */
  createReturnButton() {
    const btnX = 540;
    const btnY = 1450;

    // Button shadow (offset downward for depth effect)
    const shadow = this.scene.add
      .rectangle(btnX, btnY + 15, 550, 120, 0x1d2b53)
      .setDepth(200)
      .setInteractive();

    // Button face (main clickable area)
    const top = this.scene.add
      .rectangle(btnX, btnY, 550, 120, 0xff004d)
      .setDepth(200)
      .setInteractive();

    // Button text
    const buttonText = this.scene.add
      .text(btnX, btnY, "RETURN TO TITLE", {
        fontFamily: '"Press Start 2P"',
        fontSize: "32px",
        fill: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(200);

    // ===== Button Press Animation =====
    // Move button and text down when pressed
    top.on("pointerdown", () => {
      top.y = btnY + 10;
      buttonText.y = btnY + 10;
    });

    // Return to normal position and execute action on release
    top.on("pointerup", () => {
      top.y = btnY;
      buttonText.y = btnY;
      this.returnToTitle();
    });

    // ===== Button Entrance Animation =====
    // Start invisible and fade in
    top.setAlpha(0);
    shadow.setAlpha(0);
    buttonText.setAlpha(0);

    this.scene.tweens.add({
      targets: [top, shadow, buttonText],
      alpha: 1,
      duration: 500,
    });
  }

  // ============================================================================
  // SCENE TRANSITION
  // ============================================================================

  /**
   * Handles transition back to title screen
   *
   * Sequence:
   * 1. Stops all background music immediately
   * 2. Fades camera to black over 1 second
   * 3. Resets scene to title screen state
   * 4. Restarts scene
   *
   * Note: Sets shouldOpenIris to false to skip iris transition on restart
   *
   * @private
   */
  returnToTitle() {
    // Stop music immediately for clean audio transition
    if (this.scene.audioManager) {
      this.scene.audioManager.stopBackgroundMusic();
    }

    // Fade to black
    this.scene.cameras.main.fadeOut(1000, 0, 0, 0);

    this.scene.time.delayedCall(1000, () => {
      // Reset scene state to title screen
      this.scene.isTitleScreen = true;

      // Skip iris animation on restart (direct to title)
      this.scene.registry.set("shouldOpenIris", false);

      // Restart scene with reset state
      this.scene.scene.restart();
    });
  }
}
