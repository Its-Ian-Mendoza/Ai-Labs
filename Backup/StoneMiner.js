const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: true,
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
    height: 500,
  },
};

let player;
let playerAxe;
let stones = [];
let targetStone = null;
let isMining = false;
let stoneCounter = 0;
let stonesMinedSinceLastStorage = 0;
let counterText;
let storageLocation = { x: 750, y: 150 };
let storage;
let goingToStorage = false;
let currentTask = "miningStones";
const STORAGE_BUFFER = 50;

let restHouse;
let stamina = 100;
const maxStamina = 100;
const staminaRecoveryRate = 5;
let isResting = false;
const lowStaminaThreshold = 20;
const staminaDecreasePerMine = 10;

function preload() {
  this.load.image(
    "background",
    "assets/Cute_Fantasy_Free/Tiles/FarmLand_Tile.png"
  );
  this.load.spritesheet(
    "player",
    "assets/Cute_Fantasy_Free/Player/Player.png",
    { frameWidth: 32, frameHeight: 32 }
  );
  this.load.spritesheet(
    "playerAxe",
    "assets/Cute_Fantasy_Free/Player/player_actions.png",
    { frameWidth: 32, frameHeight: 32 }
  );
  this.load.image(
    "stone",
    "assets/Cute_Fantasy_Free/Outdoor decoration/Stone.png"
  );
  this.load.image(
    "Storage",
    "assets/Cute_Fantasy_Free/Outdoor decoration/Chest.png"
  );
  this.load.image("restHouse", "assets/PineTreeAssetPack/House_v1.png");
}

function create() {
  this.background = this.add.tileSprite(400, 300, 1600, 1600, "background");
  this.background.setScale(0.5);

  restHouse = this.add.image(400, 300, "restHouse"); // No 'const'

  player = this.physics.add.sprite(400, 300, "player");
  player.setDisplaySize(64, 64);
  player.setCollideWorldBounds(true);
  player.stamina = 100;
  staminaText = this.add.text(20, 50, "Stamina: 100", {
    fontSize: "18px",
    fill: "#fff",
  });

  playerAxe = this.physics.add.sprite(400, 300, "playerAxe");
  playerAxe.visible = false;
  playerAxe.setDisplaySize(64, 64);

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
  this.anims.create({
    key: "mine",
    frames: this.anims.generateFrameNumbers("playerAxe", { start: 0, end: 5 }),
    frameRate: 5,
    repeat: 0,
  });

  this.storageText = this.add.text(600, 15, "Stored: ", {
    fontSize: "32px",
    fill: "#fff",
  });
  counterText = this.add.text(16, 18, `Stones Mined: ${null}`, {
    fontSize: "18px",
    fill: "#fff",
  });

  storage = {
    stones: 0,
    addStone() {
      this.stones++;
      this.updateStorageText();
    },
    updateStorageText() {
      if (this.scene && this.scene.storageText) {
        this.scene.storageText.setText("Stored: " + this.stones + " Stones");
      }
    },
    scene: this,
  };
  storage.scene = this;

  this.staticGroup = this.physics.add.staticGroup();
  this.storageSprite = this.staticGroup.create(
    storageLocation.x,
    storageLocation.y,
    "Storage"
  );
  this.storageSprite.setDisplaySize(34, 34);

  this.stoneGroup = this.physics.add.group({ immovable: true });

  for (let i = 0; i < 10; i++) {
    spawnStone(this);
  }

  this.time.addEvent({
    delay: 10000,
    callback: () => spawnStone(this),
    loop: true,
  });

  this.physics.add.collider(
    player,
    this.stoneGroup,
    stopPlayerMovement,
    null,
    this
  );
  this.physics.add.collider(
    player,
    this.staticGroup,
    (player, storageSprite) => {
      if (goingToStorage) {
        player.setVelocity(0, 0);
        player.anims.stop();
        storeStones.call(this);
      }
    }
  );

  findClosestStone.call(this);
}

function stopPlayerMovement(player, targetObject) {
  player.setVelocity(0, 0);
  player.anims.stop();
}

function update() {
  stones = stones || [];

  checkStamina.call(this);

  if (goingToStorage) return;

  if (currentTask === "miningStones") {
    if (stonesMinedSinceLastStorage >= 3) {
      goToStorage.call(this);
    } else {
      if (!targetStone || isMining) {
        findClosestStone.call(this);
      }

      if (targetStone) {
        const distanceToStone = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          targetStone.x,
          targetStone.y
        );
        if (distanceToStone > 50) {
          moveTowardsStone(targetStone);
        } else {
          mineStone.call(this, targetStone);
        }
      }
    }
  }
}

function moveTowardsStone(stone) {
  const angle = Phaser.Math.Angle.Between(player.x, player.y, stone.x, stone.y);
  player.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);

  if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
    player.anims.play(Math.cos(angle) > 0 ? "walk-right" : "walk-left", true);
  } else {
    player.anims.play(Math.sin(angle) > 0 ? "walk-down" : "walk-up", true);
  }
}

const MAX_STONES = 10; // Define the maximum number of stones that can be spawned

function spawnStone(scene) {
  const minDistanceFromPlayer = 100;
  const minDistanceFromStorage = 100;
  const minDistanceFromOtherStones = 50;

  let stone;
  let validPosition = false;
  let attempts = 0;

  while (!validPosition && attempts < 100) {
    const randomX = Phaser.Math.Between(0, config.width);
    const randomY = Phaser.Math.Between(0, config.height);

    const distanceFromPlayer = Phaser.Math.Distance.Between(
      randomX,
      randomY,
      player.x,
      player.y
    );
    const distanceFromStorage = Phaser.Math.Distance.Between(
      randomX,
      randomY,
      storageLocation.x,
      storageLocation.y
    );

    if (
      distanceFromPlayer >= minDistanceFromPlayer &&
      distanceFromStorage >= minDistanceFromStorage
    ) {
      let tooClose = false;

      stones.forEach((existingStone) => {
        const distanceFromExistingStone = Phaser.Math.Distance.Between(
          randomX,
          randomY,
          existingStone.x,
          existingStone.y
        );
        if (distanceFromExistingStone < minDistanceFromOtherStones) {
          tooClose = true;
        }
      });

      if (!tooClose) {
        validPosition = true;
        stone = scene.add.image(randomX, randomY, "stone");
        stone.hits = 0; // Initialize hits counter
        stone.setDisplaySize(30, 30);

        // Create hit bar graphic
        stone.hitBar = scene.add.graphics();
        stone.hitBar.setPosition(randomX - 15, randomY - 35); // Position above the stone
        stone.hitBar.fillStyle(0x00ff00, 1); // Green color
        stone.hitBar.fillRect(0, 0, 30, 5); // Full hit bar

        stones.push(stone);
      }
    }

    attempts++;
  }

  if (!validPosition) {
    console.warn(
      "Could not find a valid position for the stone after multiple attempts."
    );
  }
}

function findClosestStone() {
  if (!stones || stones.length === 0) {
    console.warn("No stones available to mine.");
    return;
  }

  let minDistance = Number.MAX_SAFE_INTEGER;
  targetStone = null;

  stones.forEach((stone) => {
    const distance = Phaser.Math.Distance.Between(
      player.x,
      player.y,
      stone.x,
      stone.y
    );
    if (distance < minDistance) {
      minDistance = distance;
      targetStone = stone;
    }
  });

  if (!targetStone) {
    console.warn("Could not find a valid target stone.");
  }
}

function stopMining() {
  // Stop mining animation or logic
  player.isMining = false; // Set a flag to indicate mining should stop

  // Optionally, stop any mining-related animations
  player.anims.stop();

  // Move to the rest house
  moveToRestHouse.call(this);
}

function mineStone(stone) {
  if (isMining || player.stamina <= 10) return; // Prevent simultaneous mining or if not enough stamina
  isMining = true;
  player.setVelocity(0, 0);
  player.visible = false;
  playerAxe.setPosition(player.x, player.y);
  playerAxe.visible = true;
  playerAxe.anims.play("mine");

  // Reduce player's stamina by 5
  player.stamina -= 5;
  player.stamina = Math.max(0, player.stamina); // Ensure stamina doesn't go below 0

  staminaText.setText("Stamina: " + player.stamina); // Update stamina display

  // Check if player needs to rest or go to camp
  if (player.stamina <= 10) {
    console.log("Stamina too low! Moving to rest house.");
    moveToRestHouse.call(this); // Trigger rest logic
    return; // Exit the function
  }

  this.time.delayedCall(500, () => {
    stone.hits += 1; // Increment hit counter
    const hitBarWidth = 30;
    const hitsRequired = 2;
    const remainingHits = hitsRequired - stone.hits;
    const hitBarPercent = (remainingHits / hitsRequired) * hitBarWidth;

    // Clear the previous hit bar and redraw
    stone.hitBar.clear();
    stone.hitBar.fillStyle(0x00ff00, 1); // Green color
    stone.hitBar.fillRect(0, 0, hitBarPercent, 5); // Update hit bar width

    if (stone.hits >= 2) {
      // Stone is fully mined
      stone.destroy();
      stone.hitBar.destroy(); // Destroy the hit bar graphic
      stones.splice(stones.indexOf(stone), 1);
      stonesMinedSinceLastStorage++;
      stoneCounter++;
      counterText.setText(`Stones Mined: ${stoneCounter}`); // Update the counter text
      console.log(`Stone mined. Total Stones Mined: ${stoneCounter}`);
    } else {
      console.log(`Stone hit ${stone.hits} times.`);
    }

    playerAxe.visible = false;
    player.visible = true;

    this.time.delayedCall(5000, () => {
      isMining = false;
      if (stones.length > 0 && !goingToStorage) {
        findClosestStone.call(this);
      }
    });
  });
}

function goToStorage() {
  goingToStorage = true;
  const angle = Phaser.Math.Angle.Between(
    player.x,
    player.y,
    storageLocation.x,
    storageLocation.y
  );
  player.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);

  if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
    player.anims.play(Math.cos(angle) > 0 ? "walk-right" : "walk-left", true);
  } else {
    player.anims.play(Math.sin(angle) > 0 ? "walk-down" : "walk-up", true);
  }
}

function storeStones() {
  if (!storage) {
    console.error("Storage object is not defined");
    return;
  }

  storage.addStone(); // Increment stored stones
  stonesMinedSinceLastStorage = 0; // Reset mined counter
  console.log("Stored stones in storage");

  this.time.delayedCall(2000, () => {
    goingToStorage = false; // Allow mining again
    currentTask = "miningStones";
    findClosestStone.call(this); // Resume mining
    console.log("Resumed mining stones");
  });
}

function checkStamina() {
  // Only move to rest house if stamina is 0
  if (player.stamina <= 10 && !isResting) {
    moveToRestHouse.call(this); // Move the player to the RestHouse
  }
}

function moveToRestHouse() {
  const restHouseX = 400; // Coordinates of the rest house
  const restHouseY = 300;
  const playerSpeed = 100;
  const STORAGE_BUFFER = 10;

  if (!player) {
    console.error("Player is not defined.");
    return;
  }

  const distance = Phaser.Math.Distance.Between(
    player.x,
    player.y,
    restHouseX,
    restHouseY
  );

  if (distance > STORAGE_BUFFER) {
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      restHouseX,
      restHouseY
    );
    player.setVelocity(
      Math.cos(angle) * playerSpeed,
      Math.sin(angle) * playerSpeed
    );

    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
      player.anims.play(Math.cos(angle) > 0 ? "walk-right" : "walk-left", true);
    } else {
      player.anims.play(Math.sin(angle) > 0 ? "walk-down" : "walk-up", true);
    }
  } else {
    // Stop player at rest house
    player.setVelocity(0, 0);
    player.anims.stop();
    isResting = true;
    console.log("Reached rest house and started resting.");

    // Start stamina recovery
    this.time.addEvent({
      delay: 1000,
      callback: recoverStamina,
      callbackScope: this,
      loop: true,
    });
  }
}

function recoverStamina() {
  if (isResting && player.stamina < maxStamina) {
    player.stamina += staminaRecoveryRate; // Increase stamina
    player.stamina = Math.min(player.stamina, maxStamina); // Cap at maxStamina
    staminaText.setText("Stamina: " + player.stamina); // Update the UI

    if (player.stamina >= maxStamina) {
      isResting = false;
      console.log("Stamina fully recovered. Proceeding to storage.");

      // Store stones after resting
      storeStones.call(this, storage); // Ensure `storage` is correctly passed

      // Find the closest stone again
      findClosestStone.call(this);
    }
  }
}

const game = new Phaser.Game(config);
