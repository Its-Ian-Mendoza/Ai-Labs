import preload from "./Imports/preload.js";
import update from "./Imports/update.js";
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
  worldBounds: {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  },
};

function create() {
  // Center and add background
  this.background = this.add.image(
    config.width / 2,
    config.height / 2,
    "background"
  );
  const backgroundScale = 1.1;
  this.background.setScale(backgroundScale);

  const boundaryScale = backgroundScale;
  const boundaryOffsetX = 14;
  const boundaryOffsetY = -20;

  this.boundaries = this.physics.add.staticGroup(); // Static group for boundaries

  // Collision map logic
  const collisionMap = [];
  for (let i = 0; i < collision.length; i += 60) {
    collisionMap.push(collision.slice(i, 60 + i));
  }

  // Create physical boundaries
  collisionMap.forEach((row, i) => {
    row.forEach((symbol, j) => {
      if (symbol === 1025) {
        const boundaryX = j * 13 + boundaryOffsetX;
        const boundaryY = i * 13 + boundaryOffsetY;
        const boundary = this.physics.add.staticSprite(boundaryX, boundaryY);
        boundary.setSize(12 * boundaryScale, 12 * boundaryScale); // Set boundary size
        boundary.setDisplaySize(12 * boundaryScale, 12 * boundaryScale); // Match display size
        this.boundaries.add(boundary); // Add to the static group
      }
    });
  });

  // Create a group for stones
  this.stones = this.physics.add.group({
    immovable: true, // Stones don't move
  });

  // Spawner location
  const StoneMap = [];
  for (let i = 0; i < StoneSpawner.length; i += 60) {
    StoneMap.push(StoneSpawner.slice(i, 60 + i));
  }

  const cellSize = 12 * boundaryScale; // Adjust cell size based on your grid

  const validPositions = []; // Store valid spawn positions

  // Collect all valid positions where `symbol === 1025`
  StoneMap.forEach((row, i) => {
    row.forEach((symbol, j) => {
      if (symbol === 1025) {
        const baseX = j * 13 + boundaryOffsetX; // Calculate base X position
        const baseY = i * 13 + boundaryOffsetY; // Calculate base Y position
        validPositions.push({ baseX, baseY }); // Store the valid base positions
      }
    });
  });

  // Helper function to generate a random position within the valid grid cell
  function getRandomPositionInCell(baseX, baseY, cellSize) {
    const randomX = Phaser.Math.Between(0, cellSize);
    const randomY = Phaser.Math.Between(0, cellSize);
    return {
      x: baseX + randomX,
      y: baseY + randomY,
    };
  }

  // Shuffle array helper function
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Shuffle the valid positions array to randomize the order
  const shuffledPositions = shuffle(validPositions);

  // Spawn up to 20 stones at random positions
  const stonesToSpawn = Math.min(20, shuffledPositions.length); // Limit to 20 stones or less if fewer valid positions

  for (let i = 0; i < stonesToSpawn; i++) {
    const { baseX, baseY } = shuffledPositions[i]; // Get the randomized base position

    // Get a random position within the grid cell
    const { x: randomX, y: randomY } = getRandomPositionInCell(
      baseX,
      baseY,
      cellSize
    );

    // Spawn the stone at the randomized position
    const stone = this.stones.create(randomX, randomY, "stone"); // Replace 'stoneTexture' with your stone sprite key

    // Set the size and display properties of the stone
    stone.setSize(cellSize, cellSize);
    stone.setDisplaySize(cellSize, cellSize); // Scale to match size
  }

  // Adding the house image at coordinates (255, 150)
  this.Bahay = this.add.image(255, 150, "Bahay");
  this.Bahay.setScale(0.2);

  // Player section: Add player sprite with physics
  this.player = this.physics.add.sprite(255, 175, "player");
  this.player.setDisplaySize(34, 34);
  this.player.setCollideWorldBounds(true); // Prevent player from leaving the game world
  this.player.setSize(16, 20);
  //this.player(8, 5);

  // Animation for walking
  this.anims.create({
    key: "walk-down",
    frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });
  this.anims.create({
    key: "walk-left",
    frames: this.anims.generateFrameNumbers("player", { start: 4, end: 7 }),
    frameRate: 10,
    repeat: -1,
  });
  this.anims.create({
    key: "walk-right",
    frames: this.anims.generateFrameNumbers("player", { start: 8, end: 11 }),
    frameRate: 10,
    repeat: -1,
  });
  this.anims.create({
    key: "walk-up",
    frames: this.anims.generateFrameNumbers("player", { start: 12, end: 15 }),
    frameRate: 10,
    repeat: -1,
  });

  // Enable collision detection between player and boundaries
  this.physics.add.collider(this.player, this.boundaries);
}

// Creating the Phaser game instance
const game = new Phaser.Game(config);
