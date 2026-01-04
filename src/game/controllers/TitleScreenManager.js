// src/game/controllers/TitleScreenManager.js

import { GAME_CONFIG } from "../config/GameConfig";
import { ParticleEffects } from "../effects/ParticleEffects";

/**
 * TitleScreenManager
 *
 * Manages the game's title screen including:
 * - Logo display with floating animation
 * - Interactive play button with press effects
 * - Credits display
 * - Animated demonstration player (showcases gameplay mechanics)
 * - Looping movement patterns for visual interest
 *
 * Features two alternating player movement patterns that demonstrate
 * the game's core mechanics (dashing and jumping) while providing
 * dynamic visual interest on the title screen.
 *
 * Pattern 1: Left → Right → Jump
 * Pattern 2: Right → Left → Right → Jump
 *
 * @class
 */
export class TitleScreenManager {
  /**
   * Creates a new TitleScreenManager instance
   *
   * @param {Phaser.Scene} scene - The game scene for UI and animation management
   */
  constructor(scene) {
    this.scene = scene;

    // Tracks pattern cycles for alternating demonstrations
    this.titleLoopCount = 0;
  }

  // ============================================================================
  // UI SETUP
  // ============================================================================

  /**
   * Initializes all title screen UI elements
   * Creates logo, play button, and credits in proper display order
   *
   * Called once when title screen is shown
   */
  setupUI() {
    // ===== Floating Logo =====
    this.logo = this.scene.add
      .image(520, 800, "logo")
      .setScale(1.2)
      .setDepth(10);

    // Gentle vertical floating animation for visual interest
    this.scene.tweens.add({
      targets: this.logo,
      y: 830, // 30px vertical range
      duration: 2000, // 2 second cycle
      yoyo: true, // Float up and down
      repeat: -1, // Loop infinitely
      ease: "Sine.easeInOut", // Smooth, natural motion
    });

    this.createPlayButton();
    this.createCreditsText();
  }

  /**
   * Creates the interactive "PLAY" button with layered shadow effect
   *
   * Button structure:
   * - Shadow layer: Dark blue rectangle offset down for depth
   * - Top layer: Red rectangle (main clickable surface)
   * - Text: "PLAY" centered on button
   *
   * Interaction:
   * - On press: Button and text move down 10px (simulates press)
   * - On release: Button returns to normal position and triggers game start
   *
   * @private
   */
  createPlayButton() {
    const btnX = 540;
    const btnY = 1100;

    // Button shadow (offset downward for 3D effect)
    const shadow = this.scene.add
      .rectangle(btnX, btnY + 15, 450, 140, 0x1d2b53)
      .setInteractive();

    // Button face (main clickable area)
    const top = this.scene.add
      .rectangle(btnX, btnY, 450, 140, 0xff004d)
      .setInteractive();

    // Button text
    const playText = this.scene.add
      .text(btnX, btnY, "PLAY", {
        fontFamily: '"Press Start 2P"',
        fontSize: "64px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    // ===== Button Press Animation =====
    // Move button and text down when pressed for tactile feedback
    top.on("pointerdown", () => {
      top.y = btnY + 10;
      playText.y = btnY + 10;
    });

    // Return to normal position and start game on release
    top.on("pointerup", () => {
      top.y = btnY;
      playText.y = btnY;
      this.onPlayButtonPressed();
    });
  }

  /**
   * Creates credits text display in bottom corners
   *
   * Layout:
   * - Bottom left: Developer credit
   * - Bottom right: Asset credit
   *
   * Uses origin points for precise corner alignment:
   * - Left: origin(0, 1) = align left edge to X, bottom to Y
   * - Right: origin(1, 1) = align right edge to X, bottom to Y
   *
   * @private
   */
  createCreditsText() {
    // Left credit: Developer
    this.scene.add
      .text(40, 1880, "By Christopher Quinto", {
        fontFamily: '"Press Start 2P"',
        fontSize: "22px",
        fill: "#ffffff",
      })
      .setOrigin(0, 1) // Align left-bottom
      .setDepth(10);

    // Right credit: Asset creator
    this.scene.add
      .text(1040, 1880, "Game Assets by Kenney", {
        fontFamily: '"Press Start 2P"',
        fontSize: "22px",
        fill: "#ffffff",
      })
      .setOrigin(1, 1) // Align right-bottom
      .setDepth(10);
  }

  /**
   * Handles play button press event
   *
   * Actions:
   * - Plays button click sound
   * - Delegates to scene's play handler for game start sequence
   *
   * @private
   */
  onPlayButtonPressed() {
    // Play audio feedback
    if (this.scene.audioManager) {
      this.scene.audioManager.playClickSound();
    }

    // Delegate to scene for game start sequence
    if (this.scene.onTitlePlayPressed) {
      this.scene.onTitlePlayPressed();
    }
  }

  // ============================================================================
  // ANIMATED DEMONSTRATION PLAYER
  // ============================================================================

  /**
   * Creates and initializes the demonstration player sprite
   *
   * The demo player showcases the game's movement mechanics through
   * automated looping patterns, providing visual interest and teaching
   * players what to expect from gameplay
   *
   * @param {Phaser.Physics.Arcade.StaticGroup} ground - Ground platform for collision
   */
  setupPlayer(ground) {
    // Create player sprite at right side of screen
    this.titlePlayer = this.scene.physics.add.sprite(820, 1500, "player", 0);
    this.titlePlayer.setScale(GAME_CONFIG.PLAYER.SCALE);
    this.titlePlayer.setDepth(5);

    // Enable ground collision for realistic physics
    this.scene.physics.add.collider(this.titlePlayer, ground);

    // Initialize particle effects for visual feedback
    this.particleEffects = new ParticleEffects(this.scene, this.titlePlayer);

    // Start the looping animation patterns
    this.runPlayerLoop();
  }

  /**
   * Selects and runs a player movement pattern
   * Alternates between two patterns based on loop count
   *
   * Pattern selection:
   * - Even loop count (0, 2, 4...): Pattern 1 (simpler)
   * - Odd loop count (1, 3, 5...): Pattern 2 (more complex)
   *
   * @private
   */
  runPlayerLoop() {
    const isFirstPattern = this.titleLoopCount % 2 === 0;

    if (isFirstPattern) {
      this.runPattern1();
    } else {
      this.runPattern2();
    }
  }

  /**
   * Pattern 1: Simple movement demonstration
   * Sequence: Left → Right → Jump
   *
   * Timeline:
   * - 0ms: Dash left (1000ms delay before starting)
   * - 1300ms: Dash right (700ms delay)
   * - 2000ms: Jump (800ms delay)
   * - Then waits for landing and starts next cycle
   *
   * @private
   */
  runPattern1() {
    this.scene.tweens.chain({
      targets: this.titlePlayer,
      tweens: [
        this.createDashTween(255, true, 1000), // Dash to left lane
        this.createDashTween(820, false, 700), // Dash to right lane
        this.createJumpTween(800), // Jump in place
      ],
    });
  }

  /**
   * Pattern 2: Complex movement demonstration
   * Sequence: Right → Left → Right → Jump
   *
   * Timeline:
   * - 0ms: Dash right (1000ms delay)
   * - 1300ms: Dash left (700ms delay)
   * - 2000ms: Dash right (700ms delay)
   * - 2700ms: Jump (800ms delay)
   * - Then waits for landing and starts next cycle
   *
   * Shows more lane switching to demonstrate evasion tactics
   *
   * @private
   */
  runPattern2() {
    this.scene.tweens.chain({
      targets: this.titlePlayer,
      tweens: [
        this.createDashTween(820, false, 1000), // Dash to right lane
        this.createDashTween(255, true, 700), // Dash to left lane
        this.createDashTween(820, false, 700), // Dash back to right
        this.createJumpTween(800), // Jump in place
      ],
    });
  }

  /**
   * Creates a tween configuration for horizontal dash movement
   *
   * Integrates particle effects and sprite flipping for realistic
   * dash animation matching actual gameplay
   *
   * @param {number} targetX - Target X position to dash to
   * @param {boolean} flipX - Whether to flip sprite (true = face left)
   * @param {number} delay - Delay in ms before tween starts
   * @returns {Object} Phaser tween configuration object
   * @private
   */
  createDashTween(targetX, flipX, delay) {
    return {
      x: targetX,
      duration: 300, // Dash duration
      ease: "Cubic.out", // Deceleration curve
      delay: delay,
      onStart: () => {
        // Flip sprite to face movement direction
        this.titlePlayer.setFlipX(flipX);

        // Setup particle trail
        this.particleEffects.resetToDash();
        this.particleEffects.setDashOffset(flipX ? 40 : -40, 0);
        this.particleEffects.startDash();
      },
      onComplete: () => {
        // Stop particle trail when dash finishes
        this.particleEffects.stopDash();
      },
    };
  }

  /**
   * Creates a tween configuration for jump action
   *
   * Note: This tween doesn't actually move the player (duration: 1ms)
   * It's used as a timing mechanism to trigger the jump at the right
   * moment in the tween chain
   *
   * @param {number} delay - Delay in ms before jump triggers
   * @returns {Object} Phaser tween configuration object
   * @private
   */
  createJumpTween(delay) {
    return {
      y: 1500, // Dummy target (no actual movement)
      duration: 1, // Instant (used for timing only)
      delay: delay,
      onComplete: () => {
        // Check if player is grounded before jumping
        if (
          this.titlePlayer.body.blocked.down ||
          this.titlePlayer.body.touching.down
        ) {
          // Apply jump velocity
          this.titlePlayer.setVelocityY(-1400);
          this.particleEffects.playJumpEffect();

          // Start monitoring for landing to continue loop
          this.waitForLanding();
        }
      },
    };
  }

  /**
   * Monitors player for ground contact after jump
   * Uses recursive delayed calls to poll landing state
   *
   * Polling approach chosen over collision callback for compatibility
   * with chained tween system
   *
   * Once landed:
   * - Increments loop counter (for pattern alternation)
   * - Waits 5 seconds (pause for visual clarity)
   * - Starts next pattern cycle
   *
   * @private
   */
  waitForLanding() {
    const checkLanding = () => {
      // Check if player has touched ground
      if (
        this.titlePlayer.body.blocked.down ||
        this.titlePlayer.body.touching.down
      ) {
        // Player has landed - increment loop and continue
        this.titleLoopCount++;

        // Safety check: Only continue if scene is still active
        if (this.scene.scene.isActive()) {
          // 5 second pause before next pattern
          this.scene.time.delayedCall(5000, () => this.runPlayerLoop());
        }
      } else {
        // Still airborne - check again in 100ms
        this.scene.time.delayedCall(100, checkLanding);
      }
    };

    // Start checking after 100ms delay
    this.scene.time.delayedCall(100, checkLanding);
  }

  // ============================================================================
  // UPDATE & CLEANUP
  // ============================================================================

  /**
   * Updates demonstration player's animation frame
   * Called every frame by scene's update loop
   *
   * Animation logic:
   * - Frame 0: Grounded pose
   * - Frame 1: Airborne pose
   *
   * Mirrors the actual player controller's behavior for consistency
   */
  update() {
    if (this.titlePlayer && this.titlePlayer.body) {
      const grounded =
        this.titlePlayer.body.blocked.down ||
        this.titlePlayer.body.touching.down;

      // Update sprite frame based on grounded state
      this.titlePlayer.setFrame(grounded ? 0 : 1);
    }
  }

  /**
   * Cleans up all title screen resources
   * Called when transitioning away from title screen
   *
   * Cleanup order:
   * 1. Particle effects (null reference)
   * 2. Player sprite (destroy)
   * 3. Logo sprite (destroy)
   *
   * Other UI elements (buttons, text) are cleaned up by scene destruction
   */
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
