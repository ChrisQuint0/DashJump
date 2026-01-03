// src/game/controllers/PlayerController.js

import { GAME_CONFIG } from "../config/GameConfig";

export class PlayerController {
  constructor(scene, player, particleEffects) {
    this.scene = scene;
    this.player = player;
    this.particleEffects = particleEffects;
  }

  update() {
    // Safety check: ensure player and body exist before accessing properties
    if (!this.player || !this.player.body) return;

    const isGrounded =
      this.player.body.blocked.down || this.player.body.touching.down;
    this.player.setFrame(isGrounded ? 0 : 1);
  }

  jump() {
    if (!this.isGrounded()) return;

    // Play jump sound
    if (this.scene.audioManager) {
      this.scene.audioManager.playJumpSound();
    }

    this.player.setVelocityY(GAME_CONFIG.MOVEMENT.JUMP_VELOCITY);
    this.particleEffects.playJumpEffect();
  }

  dashTo(targetX, flip) {
    if (this.player.x === targetX) return;

    // Play dash sound
    if (this.scene.audioManager) {
      this.scene.audioManager.playDashSound();
    }

    this.particleEffects.resetToDash();
    this.player.setFlipX(flip);
    this.particleEffects.setDashOffset(flip ? 40 : -40, 0);
    this.particleEffects.startDash();

    this.scene.tweens.add({
      targets: this.player,
      x: targetX,
      duration: GAME_CONFIG.MOVEMENT.DASH_DURATION,
      ease: "Cubic.out",
      overwrite: true,
      onComplete: () => {
        this.particleEffects.stopDash();
      },
    });
  }

  dashLeft() {
    this.dashTo(GAME_CONFIG.PLAYER.LEFT_X, true);
  }

  dashRight() {
    this.dashTo(GAME_CONFIG.PLAYER.RIGHT_X, false);
  }

  fastDrop() {
    if (this.isGrounded()) return;

    this.scene.tweens.killTweensOf(this.player);
    this.player.setVelocityX(0);
    this.player.setVelocityY(GAME_CONFIG.MOVEMENT.FAST_DROP_VELOCITY);

    this.particleEffects.playFastDropEffect();
    this.startDropCheck();
  }

  startDropCheck() {
    this.scene.time.addEvent({
      delay: 10,
      repeat: 50,
      callback: () => {
        if (this.isGrounded()) {
          this.particleEffects.stopDash();
          this.particleEffects.resetToDash();
        }
      },
    });
  }

  isGrounded() {
    return this.player.body.blocked.down || this.player.body.touching.down;
  }
}
