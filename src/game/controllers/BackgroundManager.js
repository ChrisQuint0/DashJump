// src/game/controllers/BackgroundManager.js

export class BackgroundManager {
  constructor(scene) {
    this.scene = scene;
  }

  setup() {
    this.createBackground();
    this.createClouds();
    this.scene.cameras.main.setRoundPixels(true);
  }

  createBackground() {
    this.scene.add.image(540, 960, "background");
  }

  createClouds() {
    const numClouds = 6;
    const cloudSpeed = 30000;
    const skyTop = 494;
    const skyBottom = 1500;
    const skyHeightRange = skyBottom - skyTop;

    for (let i = 0; i < numClouds; i++) {
      const baseY = skyTop + (skyHeightRange / numClouds) * i;
      const y = baseY + Phaser.Math.Between(-50, 50);
      const initialX = Phaser.Math.Between(0, 1080);
      const scale = Phaser.Math.FloatBetween(8, 12);

      const cloud = this.scene.add.image(initialX, y, "cloud");
      cloud.setScale(scale);
      cloud.setAlpha(0.7);
      cloud.setDepth(1);

      const targetX = 1280 + cloud.width * scale;
      const remainingDistance = targetX - initialX;
      const totalDistance = targetX + 200 + cloud.width * scale;
      const initialDuration = cloudSpeed * (remainingDistance / totalDistance);

      this.scene.tweens.add({
        targets: cloud,
        x: targetX,
        duration: initialDuration,
        onComplete: () =>
          this.startCloudLoop(cloud, cloudSpeed, skyTop, skyBottom),
      });
    }
  }

  startCloudLoop(cloud, speed, skyTop, skyBottom) {
    const scale = Phaser.Math.FloatBetween(8, 12);
    cloud.setScale(scale);
    cloud.x = -200 - cloud.width * scale;
    cloud.y = Phaser.Math.Between(skyTop, skyBottom);

    this.scene.tweens.add({
      targets: cloud,
      x: 1280 + cloud.width * scale,
      duration: speed,
      repeat: -1,
      onRepeat: () => {
        const newScale = Phaser.Math.FloatBetween(8, 12);
        cloud.setScale(newScale);
        cloud.x = -200 - cloud.width * newScale;
        cloud.y = Phaser.Math.Between(skyTop, skyBottom);
      },
    });
  }
}
