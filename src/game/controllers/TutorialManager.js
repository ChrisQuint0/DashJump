// src/game/controllers/TutorialManager.js

import { GAME_CONFIG } from "../config/GameConfig";

export class TutorialManager {
  constructor(scene, playerController, inputHandler) {
    this.scene = scene;
    this.playerController = playerController;
    this.inputHandler = inputHandler;
    this.isTutorialActive = false;
  }

  createSpikeTrail(spike) {
    const trail = this.scene.add.particles(0, 0, "speedLine", {
      follow: spike,
      speed: 0,
      angle: 90,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Rectangle(-20, -100, 40, 10),
      },
      scale: { start: 6, end: 1 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 300,
      frequency: 20,
      quantity: 1,
      blendMode: "ADD",
      emitting: true,
    });
    trail.setDepth(spike.depth - 1);
    return trail;
  }

  async startTutorial() {
    if (this.isTutorialActive) return;
    this.isTutorialActive = true;

    // Part 1: Left Spike
    this.spawnFallingSpike(
      255,
      "Swipe to the right (Or Press D) to avoid the falling spikes",
      "right",
      () => {
        // Part 2: Right Spike
        this.scene.time.delayedCall(800, () => {
          this.spawnFallingSpike(
            820,
            "Swipe to the left (Or Press A) this time",
            "left",
            () => {
              this.isTutorialActive = false;
              console.log("Tutorial Complete");
            }
          );
        });
      }
    );
  }

  spawnFallingSpike(xPos, instructionText, direction, onComplete) {
    // 1. Disable player movement
    this.inputHandler.enabled = false;

    // 2. Summon spike
    const spike = this.scene.physics.add.sprite(xPos, -100, "spike");
    spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.setGravityY(1000);
    spike.setDepth(5);
    spike.isPaused = false;

    const trail = this.createSpikeTrail(spike);

    // 3. Freeze halfway detection
    const freezeEvent = this.scene.time.addEvent({
      delay: 16, // roughly 60fps check
      callback: () => {
        if (!spike.active) {
          freezeEvent.remove();
          return;
        }

        if (spike.y >= 800 && !spike.isPaused) {
          spike.isPaused = true;
          // Stop physics immediately
          spike.body.setAllowGravity(false);
          spike.setVelocity(0);
          trail.stop();

          // Show UI
          this.showTutorialUI(
            spike,
            trail,
            instructionText,
            direction,
            onComplete
          );

          // CRITICAL: Kill this loop immediately to prevent duplicate UI
          freezeEvent.remove();
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  showTutorialUI(spike, trail, instructionText, direction, onComplete) {
    // 4. Display Text
    const style = {
      fontFamily: '"Press Start 2P"',
      fontSize: "40px",
      fill: "#1d2b53",
      align: "center",
      wordWrap: { width: 900 },
    };

    const text = this.scene.add
      .text(540, 1000, instructionText, style)
      .setOrigin(0.5)
      .setDepth(100);

    // 5. Display hand gesturing
    const startX = direction === "right" ? 400 : 680;
    const endX = direction === "right" ? 680 : 400;

    const hand = this.scene.add
      .image(startX, 1200, "hand")
      .setScale(10)
      .setDepth(101);

    if (direction === "left") hand.setFlipX(true);

    const handTween = this.scene.tweens.add({
      targets: hand,
      x: endX,
      duration: 1200,
      repeat: -1,
      ease: "Cubic.easeInOut",
    });

    // 6. Enable movement
    this.inputHandler.enabled = true;

    // 7. Wait for Swipe/Action
    const targetMethod = direction === "right" ? "dashRight" : "dashLeft";
    const originalMethod = this.playerController[targetMethod].bind(
      this.playerController
    );

    // Override the specific dash method for the tutorial step
    this.playerController[targetMethod] = () => {
      // Execute move
      originalMethod();

      // Restore original function immediately to prevent double-triggering
      this.playerController[targetMethod] = originalMethod;

      // Cleanup UI elements
      text.destroy();
      handTween.stop();
      hand.destroy();

      // Resume spike
      trail.start();
      spike.isPaused = false;
      spike.body.setAllowGravity(true);
      spike.setGravityY(4000); // Faster drop for impact feel

      // 8. Ground impact logic
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

  spikeCrumble(spike, trail, onComplete) {
    trail.stop();
    this.scene.tweens.add({
      targets: spike,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      angle: 45,
      duration: 300,
      onComplete: () => {
        spike.destroy();
        trail.destroy();
        if (onComplete) onComplete();
      },
    });
  }
}
