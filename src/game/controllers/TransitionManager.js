// src/game/controllers/TransitionManager.js

/**
 * TransitionManager
 *
 * Manages cinematic iris wipe transitions between game states:
 * - Iris close: Circular wipe from full screen to center point (scene exit)
 * - Iris open: Circular wipe from center point to full screen (scene enter)
 *
 * Uses inverted geometry masking to create the iconic iris effect
 * commonly seen in classic films and retro games. The effect provides
 * a smooth, professional transition that focuses attention on the center
 * before obscuring or revealing the full scene.
 *
 * Technical approach:
 * - Graphics layer with solid color fill
 * - Circular geometry mask (inverted) to create transparent iris
 * - Tween-animated radius for smooth open/close
 *
 * @class
 */
export class TransitionManager {
  /**
   * Creates a new TransitionManager instance
   *
   * @param {Phaser.Scene} scene - The game scene for graphics and animation
   */
  constructor(scene) {
    this.scene = scene;

    // Screen dimensions (1080x1920 portrait)
    this.width = 1080;
    this.height = 1920;

    // Calculate maximum radius needed to cover entire screen from center
    // Uses Pythagorean theorem: √(width² + height²) / 2
    // This ensures iris can fully cover/reveal screen corners
    this.maxRadius = Math.sqrt(
      this.width * this.width + this.height * this.height
    );

    // Create graphics object for drawing transition effect
    this.graphic = this.scene.add.graphics();
    this.graphic.setDepth(2000); // Above all game elements
  }

  // ============================================================================
  // IRIS CLOSE TRANSITION - SCENE EXIT
  // ============================================================================

  /**
   * Performs an iris close transition
   * Circular wipe from full screen to center point, obscuring the scene
   *
   * Visual effect:
   * - Starts with full screen visible (large iris)
   * - Iris shrinks toward center point
   * - Ends with solid color fill (iris radius = 0)
   *
   * Use cases:
   * - Transitioning from title screen to gameplay
   * - Ending a wave or level
   * - Game over sequence
   *
   * Timeline:
   * - 0-600ms: Iris closes (animated)
   * - 600-700ms: Brief pause (100ms delay)
   * - 700ms: Callback executes
   *
   * Note: Disables input during transition to prevent interaction issues
   *
   * @param {Function} onComplete - Callback executed after transition finishes
   */
  closeIris(onComplete) {
    // Disable user input during transition to prevent unwanted interactions
    this.scene.input.enabled = false;

    // Animation state object (tweened from maxRadius to 0)
    const transitionState = { radius: this.maxRadius };

    this.scene.tweens.add({
      targets: transitionState,
      radius: 0, // Shrink to nothing
      duration: 600, // 0.6 second transition
      ease: "Power2.easeIn", // Accelerate into center
      onUpdate: () => {
        // Redraw iris at current radius each frame
        this.drawIris(transitionState.radius);
      },
      onComplete: () => {
        // Brief pause before executing callback for visual smoothness
        this.scene.time.delayedCall(100, () => {
          if (onComplete) onComplete();
        });
      },
    });
  }

  // ============================================================================
  // IRIS OPEN TRANSITION - SCENE ENTER
  // ============================================================================

  /**
   * Performs an iris open transition
   * Circular wipe from center point to full screen, revealing the scene
   *
   * Visual effect:
   * - Starts with solid color fill (iris radius = 0)
   * - Iris expands from center point
   * - Ends with full screen visible (iris removed)
   *
   * Use cases:
   * - Starting gameplay after title screen
   * - Beginning a new wave
   * - Revealing new scenes
   *
   * Timeline:
   * - 0-100ms: Initial pause with solid fill
   * - 100-700ms: Iris opens (animated)
   * - 700ms+: Graphics cleared, callback executes
   *
   * Note: Initial 100ms delay provides a brief moment of solid color
   * before opening, creating a more dramatic reveal
   *
   * @param {Function} onComplete - Callback executed after transition finishes
   */
  openIris(onComplete) {
    // Animation state object (tweened from 0 to maxRadius)
    const transitionState = { radius: 0 };

    // Start with full screen covered
    this.graphic.clear();
    this.graphic.fillStyle(0x3d2963, 1); // Deep purple fill
    this.graphic.fillRect(0, 0, this.width, this.height);

    // Brief pause before opening (dramatic effect)
    this.scene.time.delayedCall(100, () => {
      this.scene.tweens.add({
        targets: transitionState,
        radius: this.maxRadius, // Expand to full coverage
        duration: 600, // 0.6 second transition
        ease: "Power2.easeOut", // Decelerate from center
        onUpdate: () => {
          // Redraw iris at current radius each frame
          this.drawIris(transitionState.radius);
        },
        onComplete: () => {
          // Clean up graphics and mask
          this.graphic.clear();
          this.graphic.clearMask();

          if (onComplete) onComplete();
        },
      });
    });
  }

  // ============================================================================
  // IRIS RENDERING
  // ============================================================================

  /**
   * Draws the iris effect at a specific radius
   * Uses inverted geometry masking technique
   *
   * Rendering approach:
   * 1. Fill entire screen with solid color (purple)
   * 2. Create circular geometry mask at center
   * 3. Invert mask alpha (makes circle area transparent)
   * 4. Apply mask to graphics (circle becomes "hole")
   *
   * Result: Solid color everywhere except circular transparent area
   *
   * The mask inversion is key - instead of masking out the circle,
   * we mask out everything EXCEPT the circle, creating the iris effect
   *
   * @param {number} radius - Current radius of the iris opening (in pixels)
   * @private
   */
  drawIris(radius) {
    // Clear previous frame
    this.graphic.clear();

    // Fill entire screen with solid purple
    this.graphic.fillStyle(0x3d2963, 1);
    this.graphic.fillRect(0, 0, this.width, this.height);

    // Draw transparent circle (this becomes the visible area)
    this.graphic.fillStyle(0x000000, 0); // Fully transparent
    this.graphic.fillCircle(this.width / 2, this.height / 2, radius);

    // Create geometry mask shape (circle at screen center)
    const shape = this.scene.make.graphics();
    shape.fillStyle(0xffffff); // Color doesn't matter for mask
    shape.fillCircle(this.width / 2, this.height / 2, radius);

    // Convert to geometry mask and invert
    const mask = shape.createGeometryMask();
    mask.setInvertAlpha(true); // CRITICAL: Inverts mask logic

    // Apply inverted mask to main graphics
    // Result: Everything EXCEPT the circle is filled with purple
    this.graphic.setMask(mask);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Cleans up transition resources
   * Called when scene is destroyed or manager is no longer needed
   *
   * Destroys graphics object to free memory and remove from display
   */
  destroy() {
    if (this.graphic) {
      this.graphic.destroy();
    }
  }
}
