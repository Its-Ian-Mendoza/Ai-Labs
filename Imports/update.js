export default function update() {
  const cursors = this.input.keyboard.createCursorKeys();

  // Ensure the player exists before applying movement logic
  if (this.player) {
    this.player.setVelocity(0); // Reset velocity before applying new one

    // Simple player movement logic
    if (cursors.left.isDown) {
      this.player.setVelocityX(-160); // Move left
      this.player.anims.play("walk-left", true); // Play left walk animation
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(160); // Move right
      this.player.anims.play("walk-right", true); // Play right walk animation
    }

    if (cursors.up.isDown) {
      this.player.setVelocityY(-160); // Move up
      this.player.anims.play("walk-up", true); // Play up walk animation
    } else if (cursors.down.isDown) {
      this.player.setVelocityY(160); // Move down
      this.player.anims.play("walk-down", true); // Play down walk animation
    }

    // Stop animations if no movement keys are pressed
    if (
      cursors.left.isUp &&
      cursors.right.isUp &&
      cursors.up.isUp &&
      cursors.down.isUp
    ) {
      this.player.anims.stop(); // Stop current animation
    }
  } else {
    console.error("Player not defined");
  }
}
