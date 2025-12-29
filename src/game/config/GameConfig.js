// src/game/config/GameConfig.js

export const GAME_CONFIG = {
  PLAYER: {
    START_X: 255,
    START_Y: 1200,
    SCALE: 25,
    LEFT_X: 255,
    RIGHT_X: 820,
    MAX_LIVES: 2,
    HEART_START_X: 60,
    HEART_START_Y: 60,
    HEART_SPACING: 80,
    HEART_SCALE: 8,
  },

  GROUND: {
    X: 540,
    Y: 1634,
    WIDTH: 1080,
    HEIGHT: 10,
  },

  MOVEMENT: {
    JUMP_VELOCITY: -1200,
    FAST_DROP_VELOCITY: 3000,
    DASH_DURATION: 150,
  },

  PARTICLES: {
    DASH: {
      LIFESPAN: 200,
      FREQUENCY: 8,
      QUANTITY: 2,
      SCALE_START: 4,
      SCALE_END: 1,
      EMIT_ZONE: {
        X: -20,
        Y: -40,
        WIDTH: 10,
        HEIGHT: 80,
      },
    },
    JUMP: {
      DURATION: 200,
      ANGLE: 90,
      SCALE_START: 1,
      SCALE_END: 6,
      EMIT_ZONE: {
        X: -40,
        Y: 20,
        WIDTH: 80,
        HEIGHT: 5,
      },
    },
    FAST_DROP: {
      ANGLE: 90,
      SCALE_START: 1,
      SCALE_END: 10,
      EMIT_ZONE: {
        X: -40,
        Y: -100,
        WIDTH: 80,
        HEIGHT: 5,
      },
    },
  },

  INPUT: {
    SWIPE_THRESHOLD: 50,
  },
};
