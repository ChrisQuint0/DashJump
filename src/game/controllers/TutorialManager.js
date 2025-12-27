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
    // Reuse the 'speedLine' texture created in Game.js/ParticleEffects.js
    const trail = this.scene.add.particles(0, 0, "speedLine", {
      follow: spike,
      speed: 0,
      angle: 90, // Vertical orientation
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
    this.isTutorialActive = true;

    // 1. Disable player movement (Keyboard and Touch)
    this.inputHandler.enabled = false;

    // 2. Summon falling spike at x: 255
    const spike = this.scene.physics.add.sprite(255, -100, "spike");
    spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.setGravityY(1000); // Give it some weight
    spike.setDepth(5);

    // Create the visual trail
    const trail = this.createSpikeTrail(spike);

    // 3. Freeze halfway (Target Y around 800)
    this.scene.time.addEvent({
      delay: 10,
      repeat: -1,
      callback: () => {
        if (spike.y >= 800 && !spike.isPaused) {
          spike.isPaused = true;
          spike.body.setAllowGravity(false);
          spike.setVelocity(0);

          // Pause the trail emission while frozen
          trail.stop();

          this.showTutorialUI(spike, trail);
        }
      },
      callbackScope: this,
    });
  }

  showTutorialUI(spike, trail) {
    // 4. Display Text (Pixel Style via CDN font)
    const style = {
      fontFamily: '"Press Start 2P"',
      fontSize: "40px",
      fill: "#1d2b53",
      align: "center",
      wordWrap: { width: 800 },
    };

    const text = this.scene.add
      .text(540, 1000, "Swipe to the right to avoid the falling spikes", style)
      .setOrigin(0.5)
      .setDepth(10);

    // 5. Display hand gesturing to swipe right
    const hand = this.scene.add
      .image(400, 1200, "hand")
      .setScale(10)
      .setDepth(11);

    // Animate the hand (Left to Right)
    this.scene.tweens.add({
      targets: hand,
      x: 680,
      duration: 2000,
      repeat: -1,
      yoyo: false,
      ease: "Power2",
    });

    // 6. Enable the player movement
    this.inputHandler.enabled = true;

    // 7. Wait for Player Swipe Right
    // We override the dashRight to trigger the next step
    const originalDashRight = this.playerController.dashRight.bind(
      this.playerController
    );

    this.playerController.dashRight = () => {
      originalDashRight();

      // Cleanup UI
      text.destroy();
      hand.destroy();

      // Resume trail as it falls again
      trail.start();

      // 8. Spikes crumble as they fall
      spike.body.setAllowGravity(true);
      spike.setGravityY(3000); // Faster fall

      // Detection for ground hit
      this.scene.physics.add.collider(spike, this.scene.ground, () => {
        this.spikeCrumble(spike, trail);
      });

      // Restore original function
      this.playerController.dashRight = originalDashRight;
    };
  }

  spikeCrumble(spike, trail) {
    // Stop trail immediately on impact
    trail.stop();

    // Visual "crumble" using scale and alpha
    this.scene.tweens.add({
      targets: spike,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      angle: 45,
      duration: 300,
      onComplete: () => {
        spike.destroy();
        trail.destroy(); // Clean up particles
        this.isTutorialActive = false;
      },
    });
  }
}
