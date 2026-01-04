// src/game/controllers/InputHandler.js

import { GAME_CONFIG } from "../config/GameConfig";

/**
 * InputHandler
 *
 * Manages all player input across multiple control schemes:
 * - Keyboard controls (WASD)
 * - Touch/swipe controls (mobile support)
 * - Input enable/disable for cutscenes and menus
 *
 * Features directional swipe detection with configurable sensitivity
 * and unified input handling that maps to player actions regardless
 * of input method.
 *
 * Control mapping:
 * - W / Swipe Up: Jump
 * - S / Swipe Down: Fast Drop
 * - A / Swipe Left: Dash Left
 * - D / Swipe Right: Dash Right
 *
 * @class
 */
export class InputHandler {
  /**
   * Creates a new InputHandler instance
   *
   * @param {Phaser.Scene} scene - The game scene for input registration
   * @param {PlayerController} playerController - Controller to send player actions to
   */
  constructor(scene, playerController) {
    this.scene = scene;
    this.playerController = playerController;

    // Touch/swipe tracking state
    this.swipeStartX = 0;
    this.swipeStartY = 0;

    // Global input toggle (disabled during cutscenes/menus)
    this.enabled = true;

    // Initialize both control schemes
    this.setupKeyboard();
    this.setupTouch();
  }

  // ============================================================================
  // KEYBOARD CONTROLS
  // ============================================================================

  /**
   * Sets up keyboard input listeners for WASD controls
   *
   * Key mappings:
   * - W: Jump (upward movement)
   * - A: Dash left (lane switch)
   * - S: Fast drop (quick descent)
   * - D: Dash right (lane switch)
   *
   * All inputs respect the enabled flag for scene control
   *
   * @private
   */
  setupKeyboard() {
    // Register WASD keys for detection
    this.keys = this.scene.input.keyboard.addKeys("W,A,S,D");

    // Jump (W key)
    this.scene.input.keyboard.on("keydown-W", () => {
      if (this.enabled) this.playerController.jump();
    });

    // Fast drop (S key)
    this.scene.input.keyboard.on("keydown-S", () => {
      if (this.enabled) this.playerController.fastDrop();
    });

    // Dash left (A key)
    this.scene.input.keyboard.on("keydown-A", () => {
      if (this.enabled) this.playerController.dashLeft();
    });

    // Dash right (D key)
    this.scene.input.keyboard.on("keydown-D", () => {
      if (this.enabled) this.playerController.dashRight();
    });
  }

  // ============================================================================
  // TOUCH/SWIPE CONTROLS
  // ============================================================================

  /**
   * Sets up touch input listeners for swipe gesture detection
   *
   * Touch flow:
   * 1. pointerdown: Records starting position
   * 2. pointerup: Calculates swipe direction and distance
   * 3. Triggers appropriate player action based on gesture
   *
   * @private
   */
  setupTouch() {
    // Record touch start position
    this.scene.input.on("pointerdown", (pointer) => {
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
    });

    // Process swipe when touch ends
    this.scene.input.on("pointerup", (pointer) => {
      this.handleSwipe(pointer);
    });
  }

  /**
   * Analyzes swipe gesture and triggers corresponding player action
   *
   * Swipe detection logic:
   * 1. Calculate X and Y distance from start to end point
   * 2. Compare against threshold to filter out taps/small movements
   * 3. Determine if swipe is primarily vertical or horizontal
   * 4. Trigger action based on direction
   *
   * Vertical priority: If movement is more vertical than horizontal,
   * vertical action is triggered even if horizontal distance is significant.
   *
   * @param {Phaser.Input.Pointer} pointer - The pointer that was released
   * @private
   */
  handleSwipe(pointer) {
    // Respect global input enable flag
    if (!this.enabled) return;

    // Calculate swipe distance in both axes
    const swipeDistanceX = pointer.x - this.swipeStartX;
    const swipeDistanceY = pointer.y - this.swipeStartY;
    const threshold = GAME_CONFIG.INPUT.SWIPE_THRESHOLD;

    // Get absolute distances for comparison
    const absX = Math.abs(swipeDistanceX);
    const absY = Math.abs(swipeDistanceY);

    // ===== Vertical Swipes (Up/Down) =====
    // Prioritize vertical movement if Y distance exceeds X distance
    if (absY > absX) {
      if (swipeDistanceY > threshold) {
        // Swipe down: Fast drop
        this.playerController.fastDrop();
      } else if (swipeDistanceY < -threshold) {
        // Swipe up: Jump
        this.playerController.jump();
      }
      // If within threshold, treat as tap (no action)
    }
    // ===== Horizontal Swipes (Left/Right) =====
    // Only process if X distance is significant
    else if (absX > threshold) {
      if (swipeDistanceX > 0) {
        // Swipe right: Dash right
        this.playerController.dashRight();
      } else {
        // Swipe left: Dash left
        this.playerController.dashLeft();
      }
    }
    // If both distances are below threshold, no action (tap ignored)
  }
}
