// src/game/controllers/AudioManager.js

export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.bgMusic = null;
    this.isMusicPlaying = false;
    this.audioUnlocked = false;
  }

  // Unlock audio context on first user interaction
  unlockAudio() {
    if (this.audioUnlocked) return;

    // Resume the audio context
    if (
      this.scene.sound.context &&
      this.scene.sound.context.state === "suspended"
    ) {
      this.scene.sound.context.resume().then(() => {
        this.audioUnlocked = true;
      });
    } else {
      this.audioUnlocked = true;
    }
  }

  playClickSound() {
    // Unlock audio first
    this.unlockAudio();

    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("click")) {
      console.warn("Click sound not loaded in cache");
      return;
    }

    // Play immediately (no delay needed)
    try {
      this.scene.sound.play("click", { volume: 0.5 });
    } catch (error) {
      console.error("Error playing click sound:", error);
    }
  }

  playDashSound() {
    // Unlock audio first
    this.unlockAudio();

    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("dash")) {
      console.warn("Dash sound not loaded in cache");
      return;
    }

    // Play immediately
    try {
      this.scene.sound.play("dash", { volume: 0.4 });
    } catch (error) {
      console.error("Error playing dash sound:", error);
    }
  }

  playJumpSound() {
    // Unlock audio first
    this.unlockAudio();

    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("jump")) {
      console.warn("Jump sound not loaded in cache");
      return;
    }

    // Play immediately
    try {
      this.scene.sound.play("jump", { volume: 0.4 });
    } catch (error) {
      console.error("Error playing jump sound:", error);
    }
  }

  playSpikeSound() {
    // Unlock audio first
    this.unlockAudio();

    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("spike")) {
      console.warn("Spike sound not loaded in cache");
      return;
    }

    // Play immediately
    try {
      this.scene.sound.play("spike", { volume: 0.5 });
    } catch (error) {
      console.error("Error playing spike sound:", error);
    }
  }

  playRollSound() {
    // Unlock audio first
    this.unlockAudio();

    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("roll")) {
      console.warn("Roll sound not loaded in cache");
      return;
    }

    // Play immediately
    try {
      this.scene.sound.play("roll", { volume: 0.4 });
    } catch (error) {
      console.error("Error playing roll sound:", error);
    }
  }

  playPlasmaSound() {
    // Unlock audio first
    this.unlockAudio();

    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("plasma")) {
      console.warn("Plasma sound not loaded in cache");
      return;
    }

    // Play immediately
    try {
      this.scene.sound.play("plasma", { volume: 0.3 });
    } catch (error) {
      console.error("Error playing plasma sound:", error);
    }
  }

  transitionToBossMusic() {
    // Fade out current background music
    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.scene.tweens.add({
        targets: this.bgMusic,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          this.bgMusic.stop();
          this.bgMusic.destroy();
          this.bgMusic = null;

          // Start boss music
          this.startBossMusic();
        },
      });
    } else {
      // If no music playing, just start boss music
      this.startBossMusic();
    }
  }

  startBossMusic() {
    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("boss")) {
      console.warn("Boss music not loaded in cache");
      return;
    }

    try {
      this.bgMusic = this.scene.sound.add("boss", {
        volume: 0,
        loop: true,
      });

      this.bgMusic.play();
      this.isMusicPlaying = true;

      // Fade in boss music
      this.scene.tweens.add({
        targets: this.bgMusic,
        volume: 0.3,
        duration: 1000,
      });
    } catch (error) {
      console.error("Error starting boss music:", error);
    }
  }

  transitionToWaveMusic() {
    // Fade out boss music
    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.scene.tweens.add({
        targets: this.bgMusic,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          this.bgMusic.stop();
          this.bgMusic.destroy();
          this.bgMusic = null;

          // Start wave music again
          this.startBackgroundMusic();
        },
      });
    } else {
      // If no music playing, just start wave music
      this.startBackgroundMusic();
    }
  }

  startBackgroundMusic() {
    // Unlock audio first
    this.unlockAudio();

    // ALWAYS stop existing music first to prevent overlaps
    if (this.bgMusic) {
      this.bgMusic.stop();
      this.bgMusic.destroy();
      this.bgMusic = null;
      this.isMusicPlaying = false;
    }

    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("wave")) {
      console.warn("Wave music not loaded in cache");
      return;
    }

    // Small delay to ensure audio context is ready
    this.scene.time.delayedCall(50, () => {
      try {
        // Start new music with 30% volume
        this.bgMusic = this.scene.sound.add("wave", {
          volume: 0.3,
          loop: true,
        });

        this.bgMusic.play();
        this.isMusicPlaying = true;
      } catch (error) {
        console.error("Error starting background music:", error);
      }
    });
  }

  startEndingMusic() {
    // Unlock audio first
    this.unlockAudio();

    // Stop any existing music first
    if (this.bgMusic) {
      this.bgMusic.stop();
      this.bgMusic.destroy();
      this.bgMusic = null;
      this.isMusicPlaying = false;
    }

    // Check if the sound exists in the cache
    if (!this.scene.cache.audio.exists("end")) {
      console.warn("Ending music not loaded in cache");
      return;
    }

    // Small delay to ensure audio context is ready
    this.scene.time.delayedCall(50, () => {
      try {
        // Start ending music with 30% volume
        this.bgMusic = this.scene.sound.add("end", {
          volume: 0.3,
          loop: true,
        });

        this.bgMusic.play();
        this.isMusicPlaying = true;
      } catch (error) {
        console.error("Error starting ending music:", error);
      }
    });
  }

  stopBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.stop();
      this.bgMusic.destroy();
      this.bgMusic = null;
    }
    this.isMusicPlaying = false;
  }

  pauseBackgroundMusic() {
    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.pause();
    }
  }

  resumeBackgroundMusic() {
    if (this.bgMusic && this.bgMusic.isPaused) {
      this.bgMusic.resume();
    }
  }

  setMusicVolume(volume) {
    if (this.bgMusic) {
      this.bgMusic.setVolume(volume);
    }
  }

  destroy() {
    this.stopBackgroundMusic();
  }
}
