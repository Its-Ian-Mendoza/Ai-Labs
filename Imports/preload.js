export default function preload() {
  // Loading the background and house images
  this.load.image("background", "assets/Adventuretyme/StoneMap.png");
  this.load.image("Bahay", "assets/Adventuretyme/house.png");
  this.load.image(
    "stone",
    "assets/Cute_Fantasy_Free/Outdoor decoration/Stone.png"
  );

  // Load the player sprite sheet
  this.load.spritesheet(
    "player",
    "assets/Cute_Fantasy_Free/Player/Player.png",
    { frameWidth: 32, frameHeight: 32 }
  );
}
