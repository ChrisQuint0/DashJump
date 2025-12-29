// src/game/controllers/DialogueManager.js

export class DialogueManager {
  constructor(scene) {
    this.scene = scene;
    this.dialogueIndex = 0;
    this.isTyping = false;
    this.fullText = "";

    this.lines = [
      "Hi! Christopher here.",
      "This red guy here is supposed to be the villain of this mini game.",
      "And he's supposed to say some villainous dialogue.",
      "I was ready to write his lines.",
      "Had Microsoft Word open and everything.",
      "But I've just been staring at this blinking cursor.",
      "And I can't think of anything to write.",
      "So...",
      "Just imagine he's saying something really evil and menacing.",
      "Anyways, your health will be restored after every level.",
    ];

    this.textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: "26px",
      fill: "#000000",
      align: "left",
      wordWrap: { width: 690 },
      lineSpacing: 10,
    };
  }

  showIntroduction(onComplete) {
    this.onComplete = onComplete;

    // 1. Create Avatar (Starting off-screen left)
    this.avatar = this.scene.add.image(-200, 500, "geri").setDepth(150);

    // 2. Create Bubble (Invisible initially)
    this.bubble = this.scene.add
      .image(650, 500, "bubble")
      .setDepth(149)
      .setAlpha(0);

    // 3. Create Text objects
    this.dialogueText = this.scene.add
      .text(340, 440, "", this.textStyle)
      .setDepth(151);
    this.promptText = this.scene.add
      .text(540, 1000, "TAP TO CONTINUE", {
        fontFamily: '"Press Start 2P"',
        fontSize: "32px",
        fill: "##1d2b53",
      })
      .setOrigin(0.5)
      .setDepth(151)
      .setAlpha(0);

    // Slide In Animation
    this.scene.tweens.add({
      targets: this.avatar,
      x: 150,
      duration: 800,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.bubble,
          alpha: 1,
          duration: 300,
          onComplete: () => {
            this.setupInput();
            this.showNextLine();
          },
        });
      },
    });
  }

  showNextLine() {
    if (this.dialogueIndex >= this.lines.length) {
      this.finishDialogue();
      return;
    }

    this.fullText = this.lines[this.dialogueIndex];
    this.dialogueText.setText("");
    this.isTyping = true;
    this.promptText.setAlpha(0);

    let charIndex = 0;
    this.scene.time.addEvent({
      delay: 30, // Fast typewriter
      repeat: this.fullText.length - 1,
      callback: () => {
        this.dialogueText.setText(this.fullText.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex === this.fullText.length) {
          this.isTyping = false;
          this.showPrompt();
        }
      },
    });

    this.dialogueIndex++;
  }

  showPrompt() {
    this.scene.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  setupInput() {
    this.scene.input.on("pointerdown", this.handleTap, this);
  }

  handleTap() {
    if (this.isTyping) {
      // Skip typewriter
      this.isTyping = false;
      this.scene.time.removeAllEvents(); // Stop the typewriter event
      this.dialogueText.setText(this.fullText);
      this.showPrompt();
    } else {
      this.showNextLine();
    }
  }

  finishDialogue() {
    this.scene.input.off("pointerdown", this.handleTap, this);

    // Fade out everything
    this.scene.tweens.add({
      targets: [this.avatar, this.bubble, this.dialogueText, this.promptText],
      alpha: 0,
      y: "+=50",
      duration: 500,
      onComplete: () => {
        this.avatar.destroy();
        this.bubble.destroy();
        this.dialogueText.destroy();
        this.promptText.destroy();
        if (this.onComplete) this.onComplete();
      },
    });
  }
}
