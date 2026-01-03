// src/game/scenes/Boot.js

import { Scene } from "phaser";

export class Boot extends Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // Set background color to match transition (0x3d2963)
    this.cameras.main.setBackgroundColor(0x3d2963);

    // Create loading bar background
    const width = 1080;
    const height = 1920;
    const barWidth = 600;
    const barHeight = 50;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    // Add loading text
    const loadingText = this.add
      .text(width / 2, barY - 100, "HOLD ON...IT'S LOADING", {
        fontFamily: '"Press Start 2P"',
        fontSize: "48px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    // Create progress bar background (darker shade for contrast)
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x2d1953, 1);
    progressBox.fillRect(barX, barY, barWidth, barHeight);

    // Create progress bar fill
    const progressBar = this.add.graphics();

    // Percentage text (moved down to avoid cutoff)
    const percentText = this.add
      .text(width / 2, barY + 30, "0%", {
        fontFamily: '"Press Start 2P"',
        fontSize: "32px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    // Asset loading text (shows current file being loaded)
    const assetText = this.add
      .text(width / 2, barY + 100, "", {
        fontFamily: '"Press Start 2P"',
        fontSize: "20px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    // Update progress bar as assets load
    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xff004d, 1);
      progressBar.fillRect(
        barX + 5,
        barY + 5,
        (barWidth - 10) * value,
        barHeight - 10
      );

      percentText.setText(Math.floor(value * 100) + "%");
    });

    // Update asset text to show which file is loading
    this.load.on("fileprogress", (file) => {
      assetText.setText("Loading: " + file.key);
    });

    // Handle load errors
    this.load.on("loaderror", (file) => {
      console.error("Error loading file:", file.key, file.src);
    });

    // Clean up when loading is complete
    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      percentText.destroy();
      assetText.destroy();
      loadingText.destroy();

      // Debug: Check if audio files loaded
      console.log("Audio files loaded:");
      console.log("- click:", this.cache.audio.exists("click"));
      console.log("- wave:", this.cache.audio.exists("wave"));
    });

    // Load the font first
    this.loadFont();

    // Load all game assets
    this.load.setPath("assets");
    this.load.image("background", "bg.png");
    this.load.image("cloud", "cloud.png");
    this.load.image("spike", "spike.png");
    this.load.image("hand", "hand.png");
    this.load.image("red", "red.png");
    this.load.image("logo", "dashJumpLogo.png");
    this.load.spritesheet("player", "blu.png", {
      frameWidth: 9,
      frameHeight: 7,
      endFrame: 1,
    });
    this.load.image("geri", "geri.png");
    this.load.image("bubble", "bubble.png");
    this.load.image("shootingBoss", "shootingBoss.png");
    this.load.image("heart", "heart.png");
    this.load.image("emptyHeart", "heartEmpty.png");
    this.load.image("weave", "weave.png");
    this.load.image("puppyOne", "puppyOne.png");
    this.load.image("puppyTwo", "puppyTwo.png");
    this.load.image("puppyThree", "puppyThree.png");

    // Load audio files
    this.load.audio("click", "audio/click.mp3");
    this.load.audio("wave", "audio/wave.mp3");
  }

  loadFont() {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  create() {
    // Small delay to ensure font is loaded
    this.time.delayedCall(500, () => {
      // Transition to Game scene
      this.scene.start("Game");
    });
  }
}
