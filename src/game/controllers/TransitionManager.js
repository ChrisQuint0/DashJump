// src/game/controllers/TransitionManager.js

export class TransitionManager {
  constructor(scene) {
    this.scene = scene;
    this.width = 1080;
    this.height = 1920;
    this.maxRadius = Math.sqrt(
      this.width * this.width + this.height * this.height
    );

    this.graphic = this.scene.add.graphics();
    this.graphic.setDepth(2000);
  }

  closeIris(onComplete) {
    // Disable input during transition
    this.scene.input.enabled = false;

    const transitionState = { radius: this.maxRadius };

    this.scene.tweens.add({
      targets: transitionState,
      radius: 0,
      duration: 600,
      ease: "Power2.easeIn",
      onUpdate: () => {
        this.drawIris(transitionState.radius);
      },
      onComplete: () => {
        this.scene.time.delayedCall(100, () => {
          if (onComplete) onComplete();
        });
      },
    });
  }

  openIris(onComplete) {
    const transitionState = { radius: 0 };

    // Start with full screen
    this.graphic.clear();
    this.graphic.fillStyle(0x3d2963, 1);
    this.graphic.fillRect(0, 0, this.width, this.height);

    this.scene.time.delayedCall(100, () => {
      this.scene.tweens.add({
        targets: transitionState,
        radius: this.maxRadius,
        duration: 600,
        ease: "Power2.easeOut",
        onUpdate: () => {
          this.drawIris(transitionState.radius);
        },
        onComplete: () => {
          this.graphic.clear();
          this.graphic.clearMask();
          if (onComplete) onComplete();
        },
      });
    });
  }

  drawIris(radius) {
    this.graphic.clear();
    this.graphic.fillStyle(0x3d2963, 1);
    this.graphic.fillRect(0, 0, this.width, this.height);

    this.graphic.fillStyle(0x000000, 0);
    this.graphic.fillCircle(this.width / 2, this.height / 2, radius);

    const shape = this.scene.make.graphics();
    shape.fillStyle(0xffffff);
    shape.fillCircle(this.width / 2, this.height / 2, radius);

    const mask = shape.createGeometryMask();
    mask.setInvertAlpha(true);
    this.graphic.setMask(mask);
  }

  destroy() {
    if (this.graphic) {
      this.graphic.destroy();
    }
  }
}
