// src/game/controllers/TutorialManager.js

import { GAME_CONFIG } from "../config/GameConfig";

export class TutorialManager {
  constructor(scene, playerController, inputHandler) {
    this.scene = scene;
    this.playerController = playerController;
    this.inputHandler = inputHandler;
    this.isTutorialActive = false;

    // 1. Constant Text Style
    this.textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: "40px",
      fill: "#1d2b53",
      align: "center",
      wordWrap: { width: 900 },
    };
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
              // Part 3: Red Rolling Ball
              this.scene.time.delayedCall(800, () => {
                this.spawnRollingBall(() => {
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

  spawnFallingSpike(xPos, instructionText, direction, onComplete) {
    this.inputHandler.enabled = false;

    const spike = this.scene.physics.add.sprite(xPos, -100, "spike");
    spike.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    spike.setGravityY(1000);
    spike.setDepth(5);
    spike.isPaused = false;

    const trail = this.createSpikeTrail(spike);

    const freezeEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        if (!spike.active) {
          freezeEvent.remove();
          return;
        }

        if (spike.y >= 800 && !spike.isPaused) {
          spike.isPaused = true;
          spike.body.setAllowGravity(false);
          spike.setVelocity(0);
          trail.stop();

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

  spawnRollingBall(onComplete) {
    this.inputHandler.enabled = false;
    let hasTriggeredFreeze = false;

    // Side logic
    const playerX = this.playerController.player.x;
    const spawnRight = playerX < 540;
    const spawnX = spawnRight ? 1200 : -120;
    const targetVelocity = spawnRight ? -600 : 600;

    const ball = this.scene.physics.add.sprite(
      spawnX,
      GAME_CONFIG.GROUND.Y - 50,
      "red"
    );
    ball.setScale(GAME_CONFIG.PLAYER.SCALE - 10);
    ball.setDepth(5);
    ball.setCircle(ball.width / 2);
    ball.setVelocityX(targetVelocity);
    ball.body.setAllowGravity(false);

    // Roll animation
    const rollTween = this.scene.tweens.add({
      targets: ball,
      angle: spawnRight ? -360 : 360,
      duration: 1000,
      repeat: -1,
    });

    const checkDistance = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        if (!ball.active || hasTriggeredFreeze) return;

        const distance = Math.abs(ball.x - this.playerController.player.x);
        if (distance <= 250) {
          hasTriggeredFreeze = true;
          ball.setVelocityX(0);
          rollTween.pause();
          checkDistance.remove();
          this.showJumpUI(ball, rollTween, onComplete);
        }
      },
      callbackScope: this,
      loop: true,
    });
  }

  showJumpUI(ball, rollTween, onComplete) {
    const text = this.scene.add
      .text(540, 1000, "Jump to avoid that thing", this.textStyle)
      .setOrigin(0.5)
      .setDepth(100);

    const hand = this.scene.add
      .image(540, 1300, "hand")
      .setScale(10)
      .setDepth(101);

    const handTween = this.scene.tweens.add({
      targets: hand,
      y: 1150,
      duration: 1000,
      repeat: -1,
      ease: "Power2",
    });

    this.inputHandler.enabled = true;

    const originalJump = this.playerController.jump.bind(this.playerController);
    this.playerController.jump = () => {
      originalJump();
      this.playerController.jump = originalJump; // Restore immediately

      text.destroy();
      handTween.stop();
      hand.destroy();
      rollTween.resume();

      const playerX = this.playerController.player.x;
      const resumeVelocity = ball.x > playerX ? -1200 : 1200;
      ball.setVelocityX(resumeVelocity);

      // Out of screen check
      const exitCheck = this.scene.time.addEvent({
        delay: 100,
        callback: () => {
          if (!ball.active) {
            exitCheck.remove();
            return;
          }
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

  showFinalText() {
    if (this.finalTextObj) return;

    this.finalTextObj = this.scene.add
      .text(540, 960, "You are Ready", this.textStyle)
      .setOrigin(0.5)
      .setDepth(100)
      .setScale(0);

    this.scene.tweens.add({
      targets: this.finalTextObj,
      scale: 1.5,
      duration: 500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.time.delayedCall(2000, () => {
          if (!this.finalTextObj) return;
          this.scene.tweens.add({
            targets: this.finalTextObj,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
              this.finalTextObj.destroy();
              this.finalTextObj = null;

              // --- TRIGGER DIALOGUE HERE ---
              if (this.scene.startIntroSequence) {
                this.scene.startIntroSequence();
              }
            },
          });
        });
      },
    });
  }

  showTutorialUI(spike, trail, instructionText, direction, onComplete) {
    const text = this.scene.add
      .text(540, 1000, instructionText, this.textStyle)
      .setOrigin(0.5)
      .setDepth(100);

    const startX = direction === "right" ? 400 : 680;
    const endX = direction === "right" ? 680 : 400;

    const hand = this.scene.add
      .image(startX, 1200, "hand")
      .setScale(10)
      .setDepth(101);

    const handTween = this.scene.tweens.add({
      targets: hand,
      x: endX,
      duration: 1200,
      repeat: -1,
      ease: "Cubic.easeInOut",
    });

    this.inputHandler.enabled = true;

    const targetMethod = direction === "right" ? "dashRight" : "dashLeft";
    const originalMethod = this.playerController[targetMethod].bind(
      this.playerController
    );

    this.playerController[targetMethod] = () => {
      originalMethod();
      this.playerController[targetMethod] = originalMethod;

      text.destroy();
      handTween.stop();
      hand.destroy();

      trail.start();
      spike.isPaused = false;
      spike.body.setAllowGravity(true);
      spike.setGravityY(4000);

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

  // 2. Constant Crumble Animation
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
