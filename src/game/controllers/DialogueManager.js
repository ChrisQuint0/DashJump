// src/game/controllers/DialogueManager.js

/**
 * DialogueManager
 *
 * Manages all dialogue sequences in the game including:
 * - Character avatar animations
 * - Speech bubble display
 * - Typewriter text effect
 * - User interaction handling
 * - Dialogue progression
 *
 * Features a pixel-art aesthetic with smooth animations and tap-to-continue
 * functionality. Supports skipping typewriter effect and custom dialogue sets.
 *
 * @class
 */
export class DialogueManager {
  /**
   * Creates a new DialogueManager instance
   *
   * @param {Phaser.Scene} scene - The game scene this manager operates in
   */
  constructor(scene) {
    this.scene = scene;
    this.dialogueIndex = 0; // Current line being displayed
    this.isTyping = false; // Whether typewriter effect is active
    this.fullText = ""; // Complete text of current line

    // Default introduction dialogue
    this.introLines = [
      "Ah, you've arrived. How... inevitable.",
      "You know what's funny about adversities?",
      "They only exist because you insist on moving forward.",
      "But here's the thing—",
      "What if the adversities aren't the problem?",
      "What if it's the dashing? The jumping?",
      "This desperate need to keep going?",
      "Have you considered just... stopping?",
      "Standing still is a choice too, you know.",
      "But you won't. You never do.",
    ];

    // Start with intro lines by default
    this.lines = this.introLines;

    // Pixel-art retro text styling
    this.textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: "26px",
      fill: "#000000",
      align: "left",
      wordWrap: { width: 690 }, // Fits within speech bubble
      lineSpacing: 10,
    };
  }

  // ============================================================================
  // DIALOGUE CONFIGURATION
  // ============================================================================

  /**
   * Sets a new dialogue sequence
   * Resets the dialogue index to start from the beginning
   *
   * @param {string[]} newLines - Array of dialogue strings to display
   */
  setDialogue(newLines) {
    this.lines = newLines;
    this.dialogueIndex = 0;
  }

  /**
   * Shows a custom dialogue sequence with callback
   * Convenience method that combines setDialogue and showIntroduction
   *
   * @param {string[]} newLines - Array of dialogue strings to display
   * @param {Function} onComplete - Callback executed when dialogue finishes
   */
  showDialogue(newLines, onComplete) {
    this.setDialogue(newLines);
    this.showIntroduction(onComplete);
  }

  // ============================================================================
  // DIALOGUE DISPLAY & ANIMATION
  // ============================================================================

  /**
   * Initiates the dialogue sequence with animated entrance
   *
   * Animation sequence:
   * 1. Avatar slides in from left with bounce effect
   * 2. Speech bubble fades in
   * 3. First line begins typewriter effect
   *
   * @param {Function} onComplete - Callback executed when all dialogue finishes
   */
  showIntroduction(onComplete) {
    this.onComplete = onComplete;

    // Create avatar starting off-screen to the left
    this.avatar = this.scene.add.image(-200, 500, "geri").setDepth(150);

    // Create speech bubble (initially invisible)
    this.bubble = this.scene.add
      .image(650, 500, "bubble")
      .setDepth(149) // Behind text but in front of avatar
      .setAlpha(0);

    // Create dialogue text (empty initially for typewriter effect)
    this.dialogueText = this.scene.add
      .text(340, 440, "", this.textStyle)
      .setDepth(151); // In front of bubble

    // Create "TAP TO CONTINUE" prompt (invisible until line finishes)
    this.promptText = this.scene.add
      .text(540, 1000, "TAP TO CONTINUE", {
        fontFamily: '"Press Start 2P"',
        fontSize: "32px",
        fill: "##1d2b53",
      })
      .setOrigin(0.5)
      .setDepth(151)
      .setAlpha(0);

    // Phase 1: Slide avatar in from left with bounce
    this.scene.tweens.add({
      targets: this.avatar,
      x: 150, // Final position
      duration: 800,
      ease: "Back.easeOut", // Creates bounce effect
      onComplete: () => {
        // Phase 2: Fade in speech bubble
        this.scene.tweens.add({
          targets: this.bubble,
          alpha: 1,
          duration: 300,
          onComplete: () => {
            // Phase 3: Enable input and start dialogue
            this.setupInput();
            this.showNextLine();
          },
        });
      },
    });
  }

  /**
   * Displays the next line of dialogue with typewriter effect
   * Automatically finishes dialogue when all lines are shown
   *
   * @private
   */
  showNextLine() {
    // Check if all lines have been displayed
    if (this.dialogueIndex >= this.lines.length) {
      this.finishDialogue();
      return;
    }

    // Prepare for new line
    this.fullText = this.lines[this.dialogueIndex];
    this.dialogueText.setText("");
    this.isTyping = true;
    this.promptText.setAlpha(0); // Hide prompt during typing

    // Typewriter effect: reveal one character at a time
    let charIndex = 0;
    this.scene.time.addEvent({
      delay: 30, // 30ms per character (fast)
      repeat: this.fullText.length - 1,
      callback: () => {
        // Display text up to current character
        this.dialogueText.setText(this.fullText.substring(0, charIndex + 1));
        charIndex++;

        // When finished typing, show prompt
        if (charIndex === this.fullText.length) {
          this.isTyping = false;
          this.showPrompt();
        }
      },
    });

    // Move to next line for next call
    this.dialogueIndex++;
  }

  /**
   * Shows the "TAP TO CONTINUE" prompt with pulsing animation
   * Indicates to player they can progress to next line
   *
   * @private
   */
  showPrompt() {
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 500,
      yoyo: true, // Fade in then out
      repeat: -1, // Loop indefinitely
    });
  }

  // ============================================================================
  // INPUT HANDLING
  // ============================================================================

  /**
   * Sets up tap/click input listener for dialogue progression
   * Called once when dialogue sequence begins
   *
   * @private
   */
  setupInput() {
    this.scene.input.on("pointerdown", this.handleTap, this);
  }

  /**
   * Handles tap/click input during dialogue
   *
   * Behavior depends on current state:
   * - If typing: Instantly completes current line (skips typewriter)
   * - If not typing: Advances to next line
   *
   * @private
   */
  handleTap() {
    if (this.isTyping) {
      // Skip typewriter effect and show full text immediately
      this.isTyping = false;
      this.scene.time.removeAllEvents(); // Stop typewriter timer
      this.dialogueText.setText(this.fullText);
      this.showPrompt();
    } else {
      // Progress to next line
      this.showNextLine();
    }
  }

  // ============================================================================
  // DIALOGUE COMPLETION
  // ============================================================================

  /**
   * Finishes the dialogue sequence with fade-out animation
   *
   * Animation sequence:
   * 1. All elements fade out and slide down
   * 2. Elements are destroyed
   * 3. onComplete callback is executed
   *
   * Also removes input listener to prevent interaction after completion
   *
   * @private
   */
  finishDialogue() {
    // Remove input listener to prevent further interaction
    this.scene.input.off("pointerdown", this.handleTap, this);

    // Fade out all dialogue elements with downward movement
    this.scene.tweens.add({
      targets: [this.avatar, this.bubble, this.dialogueText, this.promptText],
      alpha: 0,
      y: "+=50", // Slide down 50 pixels
      duration: 500,
      onComplete: () => {
        // Clean up all dialogue elements
        this.avatar.destroy();
        this.bubble.destroy();
        this.dialogueText.destroy();
        this.promptText.destroy();

        // Execute completion callback if provided
        if (this.onComplete) this.onComplete();
      },
    });
  }
}
