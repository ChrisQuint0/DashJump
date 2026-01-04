// src/game/controllers/GameOverManager.js

/**
 * GameOverManager
 *
 * Manages the game over screen overlay including:
 * - "You Died" message display
 * - Interactive retry button
 * - Smooth fade-in/fade-out transitions
 * - Player retry callback handling
 *
 * Features a modal-style dark overlay with bold death message and
 * styled button matching the game's retro aesthetic. Designed for
 * quick player retry with minimal friction.
 *
 * @class
 */
export class GameOverManager {
  /**
   * Creates a new GameOverManager instance
   *
   * @param {Phaser.Scene} scene - The game scene this manager operates in
   */
  constructor(scene) {
    this.scene = scene;
  }

  // ============================================================================
  // GAME OVER DISPLAY
  // ============================================================================

  /**
   * Displays the game over screen with fade-in animation
   *
   * Creates a modal overlay with:
   * - Semi-transparent dark background
   * - Bold "YOU DIED" message
   * - Interactive retry button with press animation
   *
   * @param {Function} onRetry - Callback executed when player presses retry
   */
  show(onRetry) {
    // ===== Dark Modal Overlay =====
    // Semi-transparent background to focus attention on message
    this.overlay = this.scene.add
      .rectangle(540, 960, 1080, 1920, 0x000000, 0.7)
      .setDepth(200) // Behind game over UI elements
      .setAlpha(0); // Start invisible for fade-in

    // ===== Death Message =====
    // Large, bold text to clearly communicate game over state
    this.deathText = this.scene.add
      .text(540, 700, "YOU DIED", {
        fontFamily: '"Press Start 2P"',
        fontSize: "80px",
        fill: "#ff004d", // Game's signature red for emphasis
      })
      .setOrigin(0.5)
      .setDepth(201) // In front of overlay
      .setAlpha(0);

    // ===== Retry Button =====
    const btnX = 540;
    const btnY = 1000;

    // Button shadow (offset downward for depth effect)
    this.buttonShadow = this.scene.add
      .rectangle(btnX, btnY + 15, 450, 140, 0x1d2b53)
      .setDepth(201)
      .setAlpha(0)
      .setInteractive();

    // Button face (main clickable area)
    this.buttonTop = this.scene.add
      .rectangle(btnX, btnY, 450, 140, 0xff004d)
      .setDepth(201)
      .setAlpha(0)
      .setInteractive();

    // Button text
    this.buttonText = this.scene.add
      .text(btnX, btnY, "RETRY", {
        fontFamily: '"Press Start 2P"',
        fontSize: "64px",
        fill: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(202) // In front of button face
      .setAlpha(0);

    // ===== Button Press Animation =====
    // Move button and text down when pressed for tactile feedback
    this.buttonTop.on("pointerdown", () => {
      this.buttonTop.y = btnY + 10;
      this.buttonText.y = btnY + 10;
    });

    // Return to normal position and execute retry on release
    this.buttonTop.on("pointerup", () => {
      this.buttonTop.y = btnY;
      this.buttonText.y = btnY;
      this.hide();
      if (onRetry) onRetry();
    });

    // ===== Fade-In Animation =====
    // All elements fade in simultaneously for cohesive appearance
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

  // ============================================================================
  // CLEANUP & TRANSITIONS
  // ============================================================================

  /**
   * Hides the game over screen with fade-out animation
   *
   * Sequence:
   * 1. All elements fade out over 300ms
   * 2. Elements are destroyed to free memory
   *
   * Called automatically when player presses retry button
   */
  hide() {
    // Fade out all game over elements
    this.scene.tweens.add({
      targets: [
        this.overlay,
        this.deathText,
        this.buttonShadow,
        this.buttonTop,
        this.buttonText,
      ],
      alpha: 0,
      duration: 300, // Quick fade for minimal retry friction
      onComplete: () => {
        // Clean up all game over elements
        if (this.overlay) this.overlay.destroy();
        if (this.deathText) this.deathText.destroy();
        if (this.buttonShadow) this.buttonShadow.destroy();
        if (this.buttonTop) this.buttonTop.destroy();
        if (this.buttonText) this.buttonText.destroy();
      },
    });
  }
}
