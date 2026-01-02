//src/game/main.js

import { Boot } from "./scenes/Boot";
import { Game as MainGame } from "./scenes/Game";
import { AUTO, Scale, Game } from "phaser";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
  type: AUTO,
  width: 1080,
  height: 1920,
  parent: "game-container",
  backgroundColor: "#ff004d",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 2000 }, // Set a strong gravity for the 1920 height
      debug: false, // Set to true if you want to see the hitboxes
    },
  },
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [Boot, MainGame],
};

const StartGame = (parent) => {
  return new Game({ ...config, parent });
};

export default StartGame;
