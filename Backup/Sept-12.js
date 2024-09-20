const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    // Set world bounds here
    worldBounds: {
        x: 0,
        y: 0,
        width: 800,
        height: 500
    }
};


let player;
let playerAxe;
let stones = [];
let gold = [];
let targetgold = null;
let targetStone = null;
let isMining = false;
let goldCounter = 0;
let goldMinedSinceLastStorage = 0;
let stoneCounter = 0;
let stonesMinedSinceLastStorage = 0;
let counterText;
let storageLocation = { x: 750, y: 150 };
let storage;
let goingToStorage = false;
let currentTask = 'miningStones'; // or 'miningGold'
const STORAGE_BUFFER = 50;




let restHouse;
let stamina = 100;
const maxStamina = 100;
const staminaRecoveryRate = 5;
let isResting = false;
const lowStaminaThreshold = 20; 
const staminaDecreasePerMine = 10;



function preload() {
    this.load.image('background', 'assets/Cute_Fantasy_Free/Tiles/FarmLand_Tile.png');
    this.load.spritesheet('player', 'assets/Cute_Fantasy_Free/Player/Player.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('playerAxe', 'assets/Cute_Fantasy_Free/Player/player_actions.png', { frameWidth: 32, frameHeight: 32 });
    this.load.image('stone', 'assets/Cute_Fantasy_Free/Outdoor decoration/Stone.png');
    this.load.image('gold', 'assets/Cute_Fantasy_Free/Outdoor decoration/Gold.png');
    this.load.image('Storage', 'assets/Cute_Fantasy_Free/Outdoor decoration/Chest.png');
    this.load.image('restHouse', 'assets/PineTreeAssetPack/House_v1.png');
}

function create() {
    // Set up the background and rest house
    this.background = this.add.tileSprite(400, 300, 1600, 1600, 'background');
    this.background.setScale(0.5);
    const restHouse = this.add.image(400, 300, 'restHouse');

    // Create player and set up player properties
    player = this.physics.add.sprite(400, 300, 'player');
    player.setDisplaySize(64, 64);
    player.setCollideWorldBounds(true);
    player.stamina = 100; // Initialize stamina
    staminaText = this.add.text(20, 50, 'Stamina: 100', { fontSize: '18px', fill: '#fff' });

    // Create axe for mining animation
    playerAxe = this.physics.add.sprite(400, 300, 'playerAxe');
    playerAxe.visible = false;
    playerAxe.setDisplaySize(64, 64);

    // Create animation states for the player
    this.anims.create({
        key: 'walk-down',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'walk-left',
        frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'walk-right',
        frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'walk-up',
        frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'mine',
        frames: this.anims.generateFrameNumbers('playerAxe', { start: 0, end: 5 }),
        frameRate: 5,
        repeat: 0
    });

    // Text for storage and mining counters
    this.storageText = this.add.text(600, 15, 'Stored: ', { fontSize: '32px', fill: '#fff' });
    counterText = this.add.text(16, 18, `Golds Mined: ${null}, Stones Mined: ${null}`, { fontSize: '18px', fill: '#fff' });

    // Create storage
    storage = {
        gold: 0,
        stones: 0,
        addGold() {
            this.gold++;
            this.updateStorageText();
        },
        addStone() {
            this.stones++;
            this.updateStorageText();
        },
        updateStorageText() {
            if (this.scene && this.scene.storageText) {
                this.scene.storageText.setText('Stored: ' + this.gold + ' Gold, ' + this.stones + ' Stones');
            }
        },
        scene: this
    };
    storage.scene = this;

    // Create static group for storage
    this.staticGroup = this.physics.add.staticGroup();
    this.storageSprite = this.staticGroup.create(storageLocation.x, storageLocation.y, 'Storage');
    this.storageSprite.setDisplaySize(34, 34);

    // Create groups for stones and gold
    this.stoneGroup = this.physics.add.group({ immovable: true });
    this.goldGroup = this.physics.add.group({ immovable: true });

    // Spawn stones and gold
    for (let i = 0; i < 10; i++) {
        spawnStone(this);
        spawnGold(this);
    }

    // Periodically spawn more stones and gold
    this.time.addEvent({
        delay: 10000,
        callback: () => spawnStone(this),
        loop: true
    });
    this.time.addEvent({
        delay: 10000,
        callback: () => spawnGold(this),
        loop: true
    });

    // Add collision detection between player and stones, gold, and storage
    this.physics.add.collider(player, this.stoneGroup, stopPlayerMovement, null, this);  // Stop when colliding with stones
    this.physics.add.collider(player, this.goldGroup, stopPlayerMovement, null, this);   // Stop when colliding with gold
    this.physics.add.collider(player, this.staticGroup, (player, storageSprite) => {
        if (goingToStorage) {
            player.setVelocity(0, 0); // Stop player movement
            player.anims.stop();      // Stop animation
            storeStones.call(this);   // Store the stones
        }
    });

    findClosestStone.call(this);
    findClosestGold.call(this);
}

function stopPlayerMovement(player, targetObject) {
    // Stop player movement on collision
    player.setVelocity(0, 0);
    player.anims.stop(); // Stop the player's walking animation
}

function update() {
    // Ensure arrays are initialized
    stones = stones || [];
    gold = gold || [];

    checkStamina.call(this);

    if (goingToStorage) return;

    if (currentTask === 'miningStones') {
        if (stonesMinedSinceLastStorage >= 5) {
            console.log('Going to storage to store stones');
            goToStorage.call(this);
        } else {
            if (!targetStone || isMining) {
                findClosestStone.call(this);
            }

            if (targetStone) {
                const distanceToStone = Phaser.Math.Distance.Between(player.x, player.y, targetStone.x, targetStone.y);
                if (distanceToStone > 50) {
                    moveTowardsStone(targetStone);
                } else {
                    mineStone.call(this, targetStone);
                }
            }
        }
    } else if (currentTask === 'miningGold') {
        if (goldMinedSinceLastStorage >= 5) {
            console.log('Going to storage to store gold');
            goToStorage.call(this);
        } else {
            if (!targetgold || isMining) {
                findClosestGold.call(this);
            }

            if (targetgold) {
                const distanceToGold = Phaser.Math.Distance.Between(player.x, player.y, targetgold.x, targetgold.y);
                if (distanceToGold > 50) {
                    moveTowardsGolD(targetgold);
                } else {
                    mineGold.call(this, targetgold);
                }
            }
        }
    }

}

function moveTowardsStone(stone) {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, stone.x, stone.y);
    player.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);

    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
        player.anims.play(Math.cos(angle) > 0 ? 'walk-right' : 'walk-left', true);
    } else {
        player.anims.play(Math.sin(angle) > 0 ? 'walk-down' : 'walk-up', true);
    }
}

function moveTowardsGolD(Gold) {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, Gold.x, Gold.y);
    player.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);

    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
        player.anims.play(Math.cos(angle) > 0 ? 'walk-right' : 'walk-left', true);
    } else {
        player.anims.play(Math.sin(angle) > 0 ? 'walk-down' : 'walk-up', true);
    }
}

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

        const distanceFromPlayer = Phaser.Math.Distance.Between(randomX, randomY, player.x, player.y);
        const distanceFromStorage = Phaser.Math.Distance.Between(randomX, randomY, storageLocation.x, storageLocation.y);

        if (distanceFromPlayer >= minDistanceFromPlayer && distanceFromStorage >= minDistanceFromStorage) {
            let tooClose = false;

            stones.forEach(existingStone => {
                const distanceFromExistingStone = Phaser.Math.Distance.Between(randomX, randomY, existingStone.x, existingStone.y);
                if (distanceFromExistingStone < minDistanceFromOtherStones) {
                    tooClose = true;
                }
            });

            if (!tooClose) {
                validPosition = true;
                stone = scene.add.image(randomX, randomY, 'stone');
                stone.setDisplaySize(30, 30);
                stones.push(stone);
            }
        }

        attempts++;
    }

    if (!validPosition) {
        console.warn('Could not find a valid position for the stone after multiple attempts.');
    }
}

function spawnGold(scene) {
    const minDistanceFromPlayer = 100;
    const minDistanceFromStorage = 100;
    const minDistanceFromOtherGold = 50;

    let goldItem;
    let validPosition = false;
    let attempts = 0;

    while (!validPosition && attempts < 100) {
        const randomX = Phaser.Math.Between(0, config.width);
        const randomY = Phaser.Math.Between(0, config.height);

        const distanceFromPlayer = Phaser.Math.Distance.Between(randomX, randomY, player.x, player.y);
        const distanceFromStorage = Phaser.Math.Distance.Between(randomX, randomY, storageLocation.x, storageLocation.y);

        if (distanceFromPlayer >= minDistanceFromPlayer && distanceFromStorage >= minDistanceFromStorage) {
            let tooClose = false;

            gold.forEach(existingGold => {
                const distanceFromExistingGold = Phaser.Math.Distance.Between(randomX, randomY, existingGold.x, existingGold.y);
                if (distanceFromExistingGold < minDistanceFromOtherGold) {
                    tooClose = true;
                }
            });

            if (!tooClose) {
                validPosition = true;
                goldItem = scene.add.image(randomX, randomY, 'gold');
                goldItem.setDisplaySize(30, 30);
                gold.push(goldItem);
            }
        }

        attempts++;
    }

    if (!validPosition) {
        console.warn('Could not find a valid position for the gold after multiple attempts.');
    }
}

function findClosestStone() {
    let minDistance = Number.MAX_SAFE_INTEGER;
    targetStone = null;

    stones.forEach(stone => {
        const distance = Phaser.Math.Distance.Between(player.x, player.y, stone.x, stone.y);
        if (distance < minDistance) {
            minDistance = distance;
            targetStone = stone;
        }
    });
}

function findClosestGold() {
    let minDistance = Number.MAX_SAFE_INTEGER;
    targetgold = null;

    gold.forEach(gold => {
        const distance = Phaser.Math.Distance.Between(player.x, player.y, gold.x, gold.y);
        if (distance < minDistance) {
            minDistance = distance;
            targetgold = gold;
        }
    });
}

function mineStone(stone) {
    if (isMining || player.stamina < 5) return; // Prevent simultaneous mining or if not enough stamina
    isMining = true;
    player.setVelocity(0, 0);
    player.visible = false;
    playerAxe.setPosition(player.x, player.y);
    playerAxe.visible = true;
    playerAxe.anims.play('mine');

    // Reduce player's stamina by 5
    player.stamina -= 5;
    player.stamina = Math.max(0, player.stamina - 5); // Ensure stamina doesn't go below 0

    staminaText.setText('Stamina: ' + (player.stamina || 0));
    console.log(`Stamina left: ${player.stamina}`);

    // Check if player needs to rest or go to camp
    if (player.stamina <= 0) {
        console.log("Player needs to rest!");
        moveToRestHouse(); // Trigger rest logic (optional function)
    }

    this.time.delayedCall(500, () => {
        stone.destroy();
        stones.splice(stones.indexOf(stone), 1);
        stonesMinedSinceLastStorage++;
        stoneCounter++;
        counterText.setText(`Golds Mined: ${goldCounter}, Stones Mined: ${stoneCounter}`); // Update the counter text
        console.log(`Gold Counter: ${goldCounter}, Stone Counter: ${stoneCounter}`);

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

function mineGold(goldItem) {
    if (isMining || player.stamina < 5) return; // Prevent simultaneous mining or if not enough stamina
    isMining = true;
    player.setVelocity(0, 0);
    player.visible = false;
    playerAxe.setPosition(player.x, player.y);
    playerAxe.visible = true;
    playerAxe.anims.play('mine');

    // Reduce player's stamina by 5
    player.stamina -= 5;
    player.stamina = Math.max(0, player.stamina - 5); // Ensure stamina doesn't go below 0

    staminaText.setText('Stamina: ' + (player.stamina || 0));
    console.log(`Stamina left: ${player.stamina}`);

    // Check if player needs to rest or go to camp
    if (player.stamina <= 0) {
        console.log("Player needs to rest!");
        moveToRestHouse(); // Trigger rest logic (optional function)
    }

    this.time.delayedCall(500, () => {
        goldItem.destroy();
        gold.splice(gold.indexOf(goldItem), 1); // Remove gold item from array
        goldMinedSinceLastStorage++;
        goldCounter++;
        counterText.setText(`Golds Mined: ${goldCounter}, Stones Mined: ${stoneCounter}`); // Update the counter text
        console.log(`Gold Counter: ${goldCounter}, Stone Counter: ${stoneCounter}`);
        
        playerAxe.visible = false;
        player.visible = true;

        this.time.delayedCall(5000, () => {
            isMining = false;
            if (gold.length > 0 && !goingToStorage) {
                findClosestGold.call(this);
            }
        });
    });
}

function goToStorage() {
    goingToStorage = true; // Prevent other actions while going to storage
    const distance = Phaser.Math.Distance.Between(player.x, player.y, storageLocation.x, storageLocation.y);
    console.log(`Distance to storage: ${distance}`); // Debug output

    if (distance > STORAGE_BUFFER) {
        const angle = Phaser.Math.Angle.Between(player.x, player.y, storageLocation.x, storageLocation.y);
        player.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);

        // Play walking animation while moving to storage
        if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
            player.anims.play(Math.cos(angle) > 0 ? 'walk-right' : 'walk-left', true);
        } else {
            player.anims.play(Math.sin(angle) > 0 ? 'walk-down' : 'walk-up', true);
        }
    } else {
        // Stop player at storage
        player.setVelocity(0, 0);
        player.anims.stop(); // Stop any animation

        storeGolds.call(this);
        storeStones.call(this); // Store the stones
        console.log('Reached storage and stored stones.'); // Debug output
    }

    console.log(`Player position: (${player.x}, ${player.y})`);
    console.log(`Storage position: (${storageLocation.x}, ${storageLocation.y})`);
    console.log(`STORAGE_BUFFER: ${STORAGE_BUFFER}`);
}

function storeStones() {
    if (!storage) {
        console.error('Storage object is not defined');
        return;
    }

    if (typeof storage.addStone !== 'function') {
        console.error('addStone method is not defined in storage');
        return;
    }

    storage.addStone(); // Store the stones in storage
    stonesMinedSinceLastStorage = 0; // Reset the stones counter
    //counterText.setText(`Golds Mined: ${storage.gold}, Stones Mined: ${storage.stones}`); // Update the counter text
    stoneCounter = 0;
    console.log('Stored stones in storage');

    this.time.delayedCall(2000, () => {
        goingToStorage = false; // Resume mining
        currentTask = 'miningGold'; // Switch task to mining gold
        findClosestGold.call(this); // Find the next closest gold
        console.log('Resumed mining gold and found closest gold');
    });
}

function storeGolds() {
    if (!storage) {
        console.error('Storage object is not defined');
        return;
    }

    if (typeof storage.addGold !== 'function') {
        console.error('addGold method is not defined in storage');
        return;
    }

    storage.addGold(); // Store the gold in storage
    goldMinedSinceLastStorage = 0; // Reset the gold counter
    goldCounter = 0; // Reset gold counter for next mining session
    //counterText.setText(`Golds Mined: ${goldCounter}, Stones Mined: ${stoneCounter}`); // Update the counter text
    console.log('Stored gold in storage');

    this.time.delayedCall(2000, () => {
        goingToStorage = false; // Resume mining
        currentTask = 'miningStones'; // Switch task to mining stones
        findClosestStone.call(this); // Find the next closest stone
        console.log('Resumed mining stones and found closest stone');
    });
}

function handleStoneCollision(player, stone) {
    player.setVelocity(0, 0); // Stop player movement
    player.anims.stop(); // Stop animation if necessary
    console.log('Collision with stone');

    // Example: Start mining logic
    if (currentTask === 'miningStones') {
        // Handle logic for mining the stone
        mineStone.call(this, stone);
    }

    // Optional: Remove or hide the stone after collision
    stone.setAlpha(0); // Hide the stone (or use stone.destroy() to remove it)
}

function handleGoldCollision(player, gold) {
    player.setVelocity(0, 0); // Stop player movement
    player.anims.stop(); // Stop animation if necessary
    console.log('Collision with gold');

    // Example: Start mining logic
    if (currentTask === 'miningGold') {
        // Handle logic for mining the gold
        mineGold.call(this, gold);
    }

    // Optional: Remove or hide the gold after collision
    gold.setAlpha(0); // Hide the gold (or use gold.destroy() to remove it)
}

function updateStaminaDisplay() {
    player.stamina = Math.max(0, player.stamina - 5); // Ensure stamina doesn't go below 0
    staminaText.setText('Stamina: ' + (player.stamina || 0));
}

function recoverStamina() {
    if (isResting && player.stamina < maxStamina) {
        player.stamina += staminaRecoveryRate;
        player.stamina = Math.min(player.stamina, maxStamina); // Cap at maxStamina
        staminaText.setText('Stamina: ' + player.stamina);

        if (player.stamina >= maxStamina) {
            isResting = false;
            console.log('Stamina fully recovered.');
        };
        
    }
}

function moveToRestHouse() {
    const restHouseX = 400; 
    const restHouseY = 300; 
    const playerSpeed = 100; 
    const STORAGE_BUFFER = 10; 

    if (!player) {
        console.error('Player is not defined.');
        return;
    }

    const distance = Phaser.Math.Distance.Between(player.x, player.y, restHouseX, restHouseY);

    if (distance > STORAGE_BUFFER) {
        const angle = Phaser.Math.Angle.Between(player.x, player.y, restHouseX, restHouseY);
        player.setVelocity(Math.cos(angle) * playerSpeed, Math.sin(angle) * playerSpeed);

        if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
            player.anims.play(Math.cos(angle) > 0 ? 'walk-right' : 'walk-left', true);
        } else {
            player.anims.play(Math.sin(angle) > 0 ? 'walk-down' : 'walk-up', true);
        }
    } else {
        player.setVelocity(0, 0);
        player.anims.stop();
        isResting = true;
        console.log('Reached rest house and started resting.');

        // Start stamina recovery
        const recoveryEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                recoverStamina(); // recover stamina logic
                if (player.stamina >= 100) {
                    console.log('Stamina fully recovered. Proceed to store gold.');
                    isResting = false;

                    // Store gold after resting
                    storeGolds().then(() => {
                        console.log('Gold stored successfully. Returning to mining.');
                        startMiningLoop(); // Start mining again
                    });
                }
            },
            callbackScope: this,
            loop: true
        });
    }
}

function checkStamina() {
    if (player.stamina <= lowStaminaThreshold && !isResting) {
        moveToRestHouse.call(this); // Move the player to the RestHouse
    }
 }

const game = new Phaser.Game(config);
