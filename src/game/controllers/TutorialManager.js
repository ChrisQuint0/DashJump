// src/game/controllers/TutorialManager.js

import { GAME_CONFIG } from "../config/GameConfig";

/**
 * TutorialManager
 *
 * Manages the interactive tutorial sequence that teaches players the core mechanics:
 * - Left spike dodge (teaches right dash)
 * - Right spike dodge (teaches left dash)
 * - Rolling ball obstacle (teaches jumping)
 *
 * Features:
 * - Time-frozen obstacles during instruction display
 * - Method interception for input detection
 * - Visual hand gesture animations
 * - Progressive difficulty (introduces one mechanic at a time)
 * - Smooth transitions between tutorial phases
 *
 * Tutorial flow:
 * 1. Spike falls and freezes at screen center
 * 2. Instruction text and swipe gesture animation appear
 * 3. Player performs action (dash/jump)
 * 4. Obstacle unfreezes and exits
 * 5. Next obstacle spawns after brief delay
 * 6. "You are Ready" message after completion
 * 7. Intro dialogue sequence begins
 *
 * @class
 */
export class TutorialManager {
  /**
   * Creates a new TutorialManager instance
   *
   * @param {Phaser.Scene} scene - The game scene for spawning and animation
   * @param {PlayerController} playerController - Controller for method interception
   * @param {InputHandler} inputHandler - Handler to enable/disable input during instructions
   */
  constructor(scene, playerController, inputHandler) {
    this.scene = scene;
    this.playerController = playerController;
    this.inputHandler = inputHandler;

    // Prevents tutorial from running multiple times
    this.isTutorialActive = false;

    // Consistent text styling for all tutorial instructions
    this.textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: "40px",
      fill: "#1d2b53", // Dark blue for readability
      align: "center",
      wordWrap: { width: 900 }, // Prevents text overflow
    };
  }

  // ============================================================================
  // VISUAL EFFECTS
  // ============================================================================

  /**
   * Creates a speed line particle trail for falling spikes
   * Provides visual feedback for spike velocity during tutorial
   *
   * Trail characteristics:
   * - Follows spike sprite
   * - Emits from rectangle zone above spike
   * - Downward angle (90 degrees)
   * - Additive blend mode for glow effect
   *
   * @param {Phaser.Physics.Arcade.Sprite} spike - The spike sprite to attach trail to
   * @returns {Phaser.GameObjects.Particles.ParticleEmitter} The particle emitter
   * @private
   */
  createSpikeTrail(spike) {
    const trail = this.scene.add.particles(0, 0, "speedLine", {
      follow: spike,
      speed: 0, // No initial velocity (follow only)
      angle: 90, // Downward direction
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Rectangle(-20, -100, 40, 10),
      },
      scale: { start: 6, end: 1 }, // Shrink over lifetime
      alpha: { start: 0.6, end: 0 }, // Fade out
      lifespan: 300,
      frequency: 20, // Emit every 20ms
      quantity: 1,
      blendMode: "ADD", // Additive blending for glow
      emitting: true,
    });
    trail.setDepth(spike.depth - 1); // Behind spike but visible
    return trail;
  }

  // ============================================================================
  // TUTORIAL SEQUENCE ORCHESTRATION
  // ============================================================================

  /**
   * Starts the complete tutorial sequence
   *
   * Sequence timeline:
   * 1. Left spike (teaches right dash)
   * 2. 800ms delay
   * 3. Right spike (teaches left dash)
   * 4. 800ms delay
   * 5. Rolling ball (teaches jump)
   * 6. "You are Ready" message
   * 7. Intro dialogue begins
   *
   * Also starts background music at the beginning for full game atmosphere
   *
   * @returns {Promise<void>} Async for potential future await usage
   */
  async startTutorial() {
    // Prevent multiple simultaneous tutorials
    if (this.isTutorialActive) return;
    this.isTutorialActive = true;

    // Start background music for immersive tutorial experience
    if (this.scene.audioManager) {
      this.scene.audioManager.startBackgroundMusic();
    }

    // ===== Phase 1: Left Spike (Right Dash) =====
    this.spawnFallingSpike(
      255, // Left lane X position
      "Swipe to the right (Or Press D) to avoid the falling spikes",
      "right",
      () => {
        // ===== Phase 2: Right Spike (Left Dash) =====
        this.scene.time.delayedCall(800, () => {
          this.spawnFallingSpike(
            820, // Right lane X position
            "Swipe to the left (Or Press A) this time",
            "left",
            () => {
              // ===== Phase 3: Rolling Ball (Jump) =====
              this.scene.time.delayedCall(800, () => {
                this.spawnRollingBall(() => {
                  // ===== Phase 4: Completion =====
                  this.showFinalText();
                  this.isTutorialActive = false;
                });
              });
            }
          );
        });
      }
    );
  }

  // ============================================================================
  // SPIKE TUTORIAL (DASH MECHANICS)
  // ============================================================================

  /**
   * Spawns a falling spike that freezes mid-screen for instruction
   *
   * Behavior:
   * 1. Spike falls from top with moderate gravity
   * 2. At y=800 (screen center), freezes in place
   * 3. Instruction UI appears with swipe gesture
   * 4. Waits for player to dash in correct direction
   * 5. Unfreezes and completes fall
   * 6. Crumbles on ground impact
   *
   * The freeze mechanism uses a polling loop checking y position
   * every frame (16ms) for precise timing
   *
   * @param {number} xPos - X coordinate to spawn spike at (lane position)
   * @param {string} instructionText - Text to display in tutorial UI
   * @param {string} direction - Expected dash direction ("left" or "right")
   * @param {Function} onComplete - Callback when spike tutorial phase completes
   * @private
   */
  spawnFallingSpike(xPos, instructionText, direction, onComplete) {
    // Disable input until instruction UI is ready
    this.inputHandler.enabled = false;

    // Create spike sprite
    const spike = this.scene.physics.add.sprite(xPos, -100, "spike");
    spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.setGravityY(1000); // Moderate fall speed
    spike.setDepth(5);
    spike.isPaused = false; // Custom flag for freeze state

    // Create particle trail
    const trail = this.createSpikeTrail(spike);

    // Monitor spike position for freeze trigger
    const freezeEvent = this.scene.time.addEvent({
      delay: 16, // Check every frame (~60fps)
      callback: () => {
        // Stop checking if spike was destroyed
        if (!spike.active) {
          freezeEvent.remove();
          return;
        }

        // Freeze spike at screen center (y=800)
        if (spike.y >= 800 && !spike.isPaused) {
          spike.isPaused = true;
          spike.body.setAllowGravity(false);
          spike.setVelocity(0);
          trail.stop();

          // Show instruction UI
          this.showTutorialUI(
            spike,
            trail,
            instructionText,
            direction,
            onComplete
          );
          freezeEvent.remove();
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  // ============================================================================
  // BALL TUTORIAL (JUMP MECHANICS)
  // ============================================================================

  /**
   * Spawns a rolling ball that freezes near the player for jump instruction
   *
   * Intelligence: Ball spawns from opposite side of player's current position
   * to create a head-on approach scenario
   *
   * Behavior:
   * 1. Ball rolls from screen edge with rotation animation
   * 2. When within 250px of player, freezes in place
   * 3. Jump instruction UI appears with upward gesture
   * 4. Waits for player to jump
   * 5. Ball resumes at higher speed toward player's position
   * 6. Exits screen and completes tutorial phase
   *
   * @param {Function} onComplete - Callback when ball tutorial phase completes
   * @private
   */
  spawnRollingBall(onComplete) {
    // Disable input until instruction UI is ready
    this.inputHandler.enabled = false;
    let hasTriggeredFreeze = false; // Prevents multiple freeze triggers

    // ===== Smart Spawn Logic =====
    // Determine which side to spawn from based on player position
    const playerX = this.playerController.player.x;
    const spawnRight = playerX < 540; // Player on left = spawn from right
    const spawnX = spawnRight ? 1200 : -120;
    const targetVelocity = spawnRight ? -600 : 600;

    // Create ball sprite
    const ball = this.scene.physics.add.sprite(
      spawnX,
      GAME_CONFIG.GROUND.Y - 50,
      "red"
    );
    ball.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    ball.setDepth(5);
    ball.setCircle(ball.width / 2); // Circular hitbox
    ball.setVelocityX(targetVelocity);
    ball.body.setAllowGravity(false);

    // Continuous rotation animation for realistic rolling
    const rollTween = this.scene.tweens.add({
      targets: ball,
      angle: spawnRight ? -360 : 360, // Rotate in direction of travel
      duration: 1000,
      repeat: -1, // Loop infinitely
    });

    // Monitor distance to player for freeze trigger
    const checkDistance = this.scene.time.addEvent({
      delay: 16, // Check every frame
      callback: () => {
        if (!ball.active || hasTriggeredFreeze) return;

        // Calculate distance to player
        const distance = Math.abs(ball.x - this.playerController.player.x);

        // Freeze when ball gets close (250px threshold)
        if (distance <= 250) {
          hasTriggeredFreeze = true;
          ball.setVelocityX(0);
          rollTween.pause();
          checkDistance.remove();

          // Show jump instruction UI
          this.showJumpUI(ball, rollTween, onComplete);
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Displays jump instruction UI and handles jump detection
   *
   * Uses method interception technique:
   * 1. Stores reference to original jump method
   * 2. Replaces jump method with custom wrapper
   * 3. Wrapper performs jump, then restores original method
   * 4. Wrapper continues tutorial sequence
   *
   * This approach allows detecting the specific action without
   * complex event systems
   *
   * @param {Phaser.Physics.Arcade.Sprite} ball - The frozen ball sprite
   * @param {Phaser.Tweens.Tween} rollTween - The rotation tween to resume
   * @param {Function} onComplete - Callback when ball exits screen
   * @private
   */
  showJumpUI(ball, rollTween, onComplete) {
    // Create instruction text
    const text = this.scene.add
      .text(540, 1000, "Jump to avoid that thing", this.textStyle)
      .setOrigin(0.5)
      .setDepth(100);

    // Create hand gesture sprite
    const hand = this.scene.add
      .image(540, 1300, "hand")
      .setScale(10)
      .setDepth(101);

    // Upward swipe gesture animation
    const handTween = this.scene.tweens.add({
      targets: hand,
      y: 1150, // Move upward
      duration: 1000,
      repeat: -1, // Loop continuously
      ease: "Power2",
    });

    // Enable input for jump detection
    this.inputHandler.enabled = true;

    // ===== Method Interception for Jump Detection =====
    const originalJump = this.playerController.jump.bind(this.playerController);

    this.playerController.jump = () => {
      // Execute actual jump
      originalJump();

      // Restore original method immediately (important!)
      this.playerController.jump = originalJump;

      // Clean up instruction UI
      text.destroy();
      handTween.stop();
      hand.destroy();

      // Resume ball movement
      rollTween.resume();

      // Calculate resume velocity based on ball position relative to player
      const playerX = this.playerController.player.x;
      const resumeVelocity = ball.x > playerX ? -1200 : 1200;
      ball.setVelocityX(resumeVelocity);

      // Monitor ball exit
      const exitCheck = this.scene.time.addEvent({
        delay: 100,
        callback: () => {
          if (!ball.active) {
            exitCheck.remove();
            return;
          }

          // Check if ball has exited screen bounds
          if (ball.x < -300 || ball.x > 1400) {
            ball.destroy();
            exitCheck.remove();
            if (onComplete) onComplete();
          }
        },
        callbackScope: this,
        loop: true,
      });
    };
  }

  // ============================================================================
  // TUTORIAL COMPLETION
  // ============================================================================

  /**
   * Displays "You are Ready" message and transitions to intro dialogue
   *
   * Animation sequence:
   * 1. Text scales in from 0 to 1.5x with bounce (500ms)
   * 2. Holds for 2 seconds
   * 3. Fades out over 1 second
   * 4. Triggers intro dialogue sequence
   *
   * Prevents duplicate calls using finalTextObj reference check
   *
   * @private
   */
  showFinalText() {
    // Prevent duplicate "You are Ready" messages
    if (this.finalTextObj) return;

    // Create completion message
    this.finalTextObj = this.scene.add
      .text(540, 960, "You are Ready", this.textStyle)
      .setOrigin(0.5)
      .setDepth(100)
      .setScale(0); // Start invisible

    // Scale in animation with bounce
    this.scene.tweens.add({
      targets: this.finalTextObj,
      scale: 1.5,
      duration: 500,
      ease: "Back.easeOut", // Bounce effect
      onComplete: () => {
        // Hold for 2 seconds before fading
        this.scene.time.delayedCall(2000, () => {
          if (!this.finalTextObj) return;

          // Fade out animation
          this.scene.tweens.add({
            targets: this.finalTextObj,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
              // Clean up
              this.finalTextObj.destroy();
              this.finalTextObj = null;

              // ===== TRANSITION TO INTRO DIALOGUE =====
              if (this.scene.startIntroSequence) {
                this.scene.startIntroSequence();
              }
            },
          });
        });
      },
    });
  }

  // ============================================================================
  // INSTRUCTION UI (SPIKE DASH TUTORIALS)
  // ============================================================================

  /**
   * Displays dash instruction UI and handles dash detection
   *
   * Uses method interception technique similar to jump detection:
   * - Intercepts either dashLeft or dashRight based on direction
   * - Executes original method then continues sequence
   * - Unfreezes spike after correct dash is performed
   *
   * Hand gesture animates horizontally to demonstrate swipe direction
   *
   * @param {Phaser.Physics.Arcade.Sprite} spike - The frozen spike sprite
   * @param {Phaser.GameObjects.Particles.ParticleEmitter} trail - Spike particle trail
   * @param {string} instructionText - Text to display
   * @param {string} direction - Expected direction ("left" or "right")
   * @param {Function} onComplete - Callback when spike exits and crumbles
   * @private
   */
  showTutorialUI(spike, trail, instructionText, direction, onComplete) {
    // Create instruction text
    const text = this.scene.add
      .text(540, 1000, instructionText, this.textStyle)
      .setOrigin(0.5)
      .setDepth(100);

    // Calculate hand gesture positions based on swipe direction
    const startX = direction === "right" ? 400 : 680;
    const endX = direction === "right" ? 680 : 400;

    // Create hand gesture sprite
    const hand = this.scene.add
      .image(startX, 1200, "hand")
      .setScale(10)
      .setDepth(101);

    // Horizontal swipe gesture animation
    const handTween = this.scene.tweens.add({
      targets: hand,
      x: endX,
      duration: 1200,
      repeat: -1, // Loop continuously
      ease: "Cubic.easeInOut",
    });

    // Enable input for dash detection
    this.inputHandler.enabled = true;

    // ===== Method Interception for Dash Detection =====
    const targetMethod = direction === "right" ? "dashRight" : "dashLeft";
    const originalMethod = this.playerController[targetMethod].bind(
      this.playerController
    );

    this.playerController[targetMethod] = () => {
      // Execute actual dash
      originalMethod();

      // Restore original method immediately
      this.playerController[targetMethod] = originalMethod;

      // Clean up instruction UI
      text.destroy();
      handTween.stop();
      hand.destroy();

      // ===== Unfreeze Spike =====
      trail.start(); // Resume particle trail
      spike.isPaused = false;
      spike.body.setAllowGravity(true);
      spike.setGravityY(4000); // Fast fall to ground

      // Handle ground collision
      const groundCollider = this.scene.physics.add.collider(
        spike,
        this.scene.ground,
        () => {
          this.scene.physics.world.removeCollider(groundCollider);
          this.spikeCrumble(spike, trail, onComplete);
        }
      );
    };
  }

  // ============================================================================
  // SPIKE DESTRUCTION ANIMATION
  // ============================================================================

  /**
   * Animates spike crumbling on ground impact
   *
   * Animation combines:
   * - Scale reduction (shrink to nothing)
   * - Alpha fade (fade out)
   * - Rotation (45 degree twist)
   *
   * Duration: 300ms for quick, satisfying destruction feedback
   *
   * @param {Phaser.Physics.Arcade.Sprite} spike - The spike to destroy
   * @param {Phaser.GameObjects.Particles.ParticleEmitter} trail - Trail to stop and destroy
   * @param {Function} onComplete - Callback when animation finishes
   * @private
   */
  spikeCrumble(spike, trail, onComplete) {
    // Stop particle trail
    trail.stop();

    // Crumble animation
    this.scene.tweens.add({
      targets: spike,
      scaleX: 0, // Shrink horizontally
      scaleY: 0, // Shrink vertically
      alpha: 0, // Fade out
      angle: 45, // Slight rotation for visual interest
      duration: 300,
      onComplete: () => {
        // Clean up
        spike.destroy();
        trail.destroy();

        // Continue to next tutorial phase
        if (onComplete) onComplete();
      },
    });
  }
}
