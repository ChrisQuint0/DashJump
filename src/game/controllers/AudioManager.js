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
        console.log("Audio context resumed successfully");
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
      console.log("Click sound played");
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
      console.log("Dash sound played");
    } catch (error) {
      console.error("Error playing dash sound:", error);
    }
  }

  startBackgroundMusic() {
    // Unlock audio first
    this.unlockAudio();

    // Don't start if already playing
    if (this.isMusicPlaying && this.bgMusic && this.bgMusic.isPlaying) {
      return;
    }

    // Stop existing music if any
    this.stopBackgroundMusic();

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
          volume: 0.3, // Changed to 30%
          loop: true,
        });

        this.bgMusic.play();
        this.isMusicPlaying = true;
        console.log("Background music started at 50% volume");
      } catch (error) {
        console.error("Error starting background music:", error);
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
