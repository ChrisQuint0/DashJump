// src/game/effects/ParticleEffects.js

import { GAME_CONFIG } from "../config/GameConfig";

export class ParticleEffects {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.createEmitter();
  }

  static createSpeedLineTexture(scene) {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 20, 1);
    scene.textures.addCanvas("speedLine", canvas);
  }

  createEmitter() {
    const cfg = GAME_CONFIG.PARTICLES.DASH;

    this.emitter = this.scene.add.particles(0, 0, "speedLine", {
      follow: this.player,
      followOffset: { x: 0, y: 0 },
      speed: 0,
      angle: 0,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Rectangle(
          cfg.EMIT_ZONE.X,
          cfg.EMIT_ZONE.Y,
          cfg.EMIT_ZONE.WIDTH,
          cfg.EMIT_ZONE.HEIGHT
        ),
      },
      scale: { start: cfg.SCALE_START, end: cfg.SCALE_END },
      alpha: { start: 1, end: 0 },
      lifespan: cfg.LIFESPAN,
      frequency: cfg.FREQUENCY,
      quantity: cfg.QUANTITY,
      blendMode: "ADD",
      tint: 0xffffff,
      emitting: false,
    });

    this.emitter.setDepth(1);
  }

  playJumpEffect() {
    const cfg = GAME_CONFIG.PARTICLES.JUMP;

    this.emitter.setAngle(cfg.ANGLE);
    this.emitter.setEmitZone({
      type: "random",
      source: new Phaser.Geom.Rectangle(
        cfg.EMIT_ZONE.X,
        cfg.EMIT_ZONE.Y,
        cfg.EMIT_ZONE.WIDTH,
        cfg.EMIT_ZONE.HEIGHT
      ),
    });
    this.emitter.setParticleScale(cfg.SCALE_START, cfg.SCALE_END);
    this.emitter.followOffset.set(0, 0);
    this.emitter.start();

    this.scene.time.delayedCall(cfg.DURATION, () => {
      this.emitter.stop();
      this.resetToDash();
    });
  }

  playFastDropEffect() {
    const cfg = GAME_CONFIG.PARTICLES.FAST_DROP;

    this.emitter.setAngle(cfg.ANGLE);
    this.emitter.setEmitZone({
      type: "random",
      source: new Phaser.Geom.Rectangle(
        cfg.EMIT_ZONE.X,
        cfg.EMIT_ZONE.Y,
        cfg.EMIT_ZONE.WIDTH,
        cfg.EMIT_ZONE.HEIGHT
      ),
    });
    this.emitter.setParticleScale(cfg.SCALE_START, cfg.SCALE_END);
    this.emitter.followOffset.set(0, 0);
    this.emitter.start();
  }

  resetToDash() {
    const cfg = GAME_CONFIG.PARTICLES.DASH;

    this.emitter.setAngle(0);
    this.emitter.setEmitZone({
      type: "random",
      source: new Phaser.Geom.Rectangle(
        cfg.EMIT_ZONE.X,
        cfg.EMIT_ZONE.Y,
        cfg.EMIT_ZONE.WIDTH,
        cfg.EMIT_ZONE.HEIGHT
      ),
    });
    this.emitter.setParticleScale(cfg.SCALE_START, cfg.SCALE_END);
  }

  setDashOffset(x, y) {
    this.emitter.followOffset.set(x, y);
  }

  startDash() {
    this.emitter.start();
  }

  stopDash() {
    this.emitter.stop();
  }

  reduceParticleQuality() {
    // Reduce particle emission to improve performance
    if (this.emitter) {
      this.emitter.frequency = 20; // Increase from 10
      this.emitter.quantity = 1; // Reduce from 2
    }
  }

  restoreParticleQuality() {
    // Restore normal particle emission
    if (this.emitter) {
      this.emitter.frequency = 10;
      this.emitter.quantity = 2;
    }
  }
}
