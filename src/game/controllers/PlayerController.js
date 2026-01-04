// src/game/controllers/PlayerController.js

import { GAME_CONFIG } from "../config/GameConfig";

/**
 * PlayerController
 *
 * Manages all player character behaviors and actions:
 * - Movement (jumping, dashing, fast dropping)
 * - Animation state management
 * - Particle effect coordination
 * - Ground detection
 * - Audio feedback integration
 *
 * Control scheme:
 * - Jump: Upward movement with configurable velocity
 * - Dash Left/Right: Quick horizontal lane switching with particle trails
 * - Fast Drop: Rapid descent to ground when airborne
 *
 * The controller integrates tightly with ParticleEffects for visual feedback
 * and AudioManager for sound effects, creating a polished player experience.
 *
 * @class
 */
export class PlayerController {
  /**
   * Creates a new PlayerController instance
   *
   * @param {Phaser.Scene} scene - The game scene for tween and timer management
   * @param {Phaser.Physics.Arcade.Sprite} player - The player sprite to control
   * @param {ParticleEffects} particleEffects - Effects manager for visual feedback
   */
  constructor(scene, player, particleEffects) {
    this.scene = scene;
    this.player = player;
    this.particleEffects = particleEffects;
  }

  // ============================================================================
  // UPDATE LOOP
  // ============================================================================

  /**
   * Updates player visual state based on physics
   * Called every frame by the game scene's update loop
   *
   * Animation frames:
   * - Frame 0: Grounded pose
   * - Frame 1: Airborne pose
   *
   * Safety: Includes null checks to prevent crashes if player is destroyed
   * during scene transitions or game over states
   */
  update() {
    // Safety check: ensure player and physics body exist
    if (!this.player || !this.player.body) return;

    // Determine if player is touching ground
    const isGrounded =
      this.player.body.blocked.down || this.player.body.touching.down;

    // Update sprite frame based on grounded state
    this.player.setFrame(isGrounded ? 0 : 1);
  }

  // ============================================================================
  // VERTICAL MOVEMENT - JUMP
  // ============================================================================

  /**
   * Makes the player jump with upward velocity
   *
   * Requirements:
   * - Player must be grounded (no double jumping)
   *
   * Effects:
   * - Applies upward velocity from config
   * - Triggers particle effect for visual feedback
   * - Plays jump sound effect
   *
   * Does nothing if player is already airborne
   */
  jump() {
    // Early exit if not grounded (prevents double jumping)
    if (!this.isGrounded()) return;

    // Play audio feedback
    if (this.scene.audioManager) {
      this.scene.audioManager.playJumpSound();
    }

    // Apply upward velocity (negative Y = up in Phaser)
    this.player.setVelocityY(GAME_CONFIG.MOVEMENT.JUMP_VELOCITY);

    // Trigger particle burst for visual feedback
    this.particleEffects.playJumpEffect();
  }

  // ============================================================================
  // HORIZONTAL MOVEMENT - DASHING
  // ============================================================================

  /**
   * Performs a smooth dash movement to a target X position
   * Core method used by dashLeft() and dashRight()
   *
   * Features:
   * - Smooth easing animation (Cubic.out)
   * - Automatic sprite flipping based on direction
   * - Particle trail that follows player
   * - Audio feedback
   * - Overwrites any existing dash tween
   *
   * @param {number} targetX - Target X coordinate to dash to
   * @param {boolean} flip - Whether to flip sprite horizontally (true = facing left)
   */
  dashTo(targetX, flip) {
    // Early exit if already at target position
    if (this.player.x === targetX) return;

    // Play audio feedback
    if (this.scene.audioManager) {
      this.scene.audioManager.playDashSound();
    }

    // Prepare particle effects for dash
    this.particleEffects.resetToDash();

    // Flip sprite to face movement direction
    this.player.setFlipX(flip);

    // Adjust particle offset based on flip direction
    // When flipped, offset is positive (trail behind left-facing player)
    // When not flipped, offset is negative (trail behind right-facing player)
    this.particleEffects.setDashOffset(flip ? 40 : -40, 0);
    this.particleEffects.startDash();

    // Smooth horizontal movement animation
    this.scene.tweens.add({
      targets: this.player,
      x: targetX,
      duration: GAME_CONFIG.MOVEMENT.DASH_DURATION,
      ease: "Cubic.out", // Deceleration curve for natural feel
      overwrite: true, // Cancel any existing dash
      onComplete: () => {
        // Stop particle trail when dash finishes
        this.particleEffects.stopDash();
      },
    });
  }

  /**
   * Dashes player to the left lane
   * Uses config-defined left lane X position
   * Flips sprite to face left (flip = true)
   */
  dashLeft() {
    this.dashTo(GAME_CONFIG.PLAYER.LEFT_X, true);
  }

  /**
   * Dashes player to the right lane
   * Uses config-defined right lane X position
   * Keeps sprite facing right (flip = false)
   */
  dashRight() {
    this.dashTo(GAME_CONFIG.PLAYER.RIGHT_X, false);
  }

  // ============================================================================
  // VERTICAL MOVEMENT - FAST DROP
  // ============================================================================

  /**
   * Initiates a rapid descent to the ground
   *
   * Requirements:
   * - Player must be airborne (no effect if grounded)
   *
   * Behavior:
   * - Cancels any active dash animations
   * - Zeros out horizontal velocity
   * - Applies high downward velocity
   * - Shows vertical particle trail
   * - Monitors for ground contact to stop effects
   *
   * Use case: Allows player to quickly return to ground after jumping
   * to regain movement control or dodge airborne obstacles
   */
  fastDrop() {
    // Early exit if already grounded
    if (this.isGrounded()) return;

    // Cancel any active dash tweens
    this.scene.tweens.killTweensOf(this.player);

    // Stop horizontal movement
    this.player.setVelocityX(0);

    // Apply strong downward velocity
    this.player.setVelocityY(GAME_CONFIG.MOVEMENT.FAST_DROP_VELOCITY);

    // Show vertical particle trail for visual feedback
    this.particleEffects.playFastDropEffect();

    // Start monitoring for ground contact
    this.startDropCheck();
  }

  /**
   * Monitors player for ground contact during fast drop
   * Runs a rapid check every 10ms for up to 500ms (50 repeats)
   *
   * Purpose:
   * - Detects when player lands during fast drop
   * - Stops particle effects when grounded
   * - Resets particle emitter to ready state
   *
   * Timer limit (500ms) prevents infinite checking if something goes wrong
   *
   * @private
   */
  startDropCheck() {
    this.scene.time.addEvent({
      delay: 10, // Check every 10ms for quick response
      repeat: 50, // Max 50 checks (500ms total)
      callback: () => {
        if (this.isGrounded()) {
          // Player has landed - stop effects
          this.particleEffects.stopDash();
          this.particleEffects.resetToDash();
        }
      },
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Checks if the player is currently grounded
   * Uses Phaser's physics body collision flags
   *
   * Returns true if:
   * - Body is blocked from below (standing on solid object), OR
   * - Body is touching something below (in contact with ground)
   *
   * @returns {boolean} True if player is on the ground, false if airborne
   */
  isGrounded() {
    return this.player.body.blocked.down || this.player.body.touching.down;
  }
}
