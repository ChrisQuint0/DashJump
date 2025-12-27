// src/game/controllers/InputHandler.js

import { GAME_CONFIG } from "../config/GameConfig";

export class InputHandler {
  constructor(scene, playerController) {
    this.scene = scene;
    this.playerController = playerController;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.enabled = true;

    this.setupKeyboard();
    this.setupTouch();
  }

  setupKeyboard() {
    this.keys = this.scene.input.keyboard.addKeys("W,A,S,D");

    this.scene.input.keyboard.on("keydown-W", () => {
      if (this.enabled) this.playerController.jump();
    });
    this.scene.input.keyboard.on("keydown-S", () => {
      if (this.enabled) this.playerController.fastDrop();
    });
    this.scene.input.keyboard.on("keydown-A", () => {
      if (this.enabled) this.playerController.dashLeft();
    });
    this.scene.input.keyboard.on("keydown-D", () => {
      if (this.enabled) this.playerController.dashRight();
    });
  }

  setupTouch() {
    this.scene.input.on("pointerdown", (pointer) => {
      this.swipeStartX = pointer.x;
      this.swipeStartY = pointer.y;
    });

    this.scene.input.on("pointerup", (pointer) => {
      this.handleSwipe(pointer);
    });
  }

  handleSwipe(pointer) {
    if (!this.enabled) return;

    const swipeDistanceX = pointer.x - this.swipeStartX;
    const swipeDistanceY = pointer.y - this.swipeStartY;
    const threshold = GAME_CONFIG.INPUT.SWIPE_THRESHOLD;

    const absX = Math.abs(swipeDistanceX);
    const absY = Math.abs(swipeDistanceY);

    // Vertical swipes
    if (absY > absX) {
      if (swipeDistanceY > threshold) {
        this.playerController.fastDrop();
      } else if (swipeDistanceY < -threshold) {
        this.playerController.jump();
      }
    }
    // Horizontal swipes
    else if (absX > threshold) {
      if (swipeDistanceX > 0) {
        this.playerController.dashRight();
      } else {
        this.playerController.dashLeft();
      }
    }
  }
}
