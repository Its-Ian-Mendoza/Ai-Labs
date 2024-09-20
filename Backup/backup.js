const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
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
let goldMindeSinceLastStorage = 0;
let stoneCounter = 0;
let stonesMinedSinceLastStorage = 0;
let counterText;
let storageLocation = { x: 750, y: 150 };
let storage;
let goingToStorage = false;
let currentTask = 'miningStones'; // or 'miningGold'
const STORAGE_BUFFER = 50;


function preload() {
    this.load.image('background', 'assets/Cute_Fantasy_Free/Tiles/FarmLand_Tile.png');
    this.load.spritesheet('player', 'assets/Cute_Fantasy_Free/Player/Player.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('playerAxe', 'assets/Cute_Fantasy_Free/Player/player_actions.png', { frameWidth: 32, frameHeight: 32 });
    this.load.image('stone', 'assets/Cute_Fantasy_Free/Outdoor decoration/Stone.png');
    this.load.image('gold', 'assets/Cute_Fantasy_Free/Outdoor decoration/Gold.png');
    this.load.image('Storage', 'assets/Cute_Fantasy_Free/Outdoor decoration/Chest.png');
}
function create() {
    this.background = this.add.tileSprite(400, 300, 1600, 1600, 'background');
    this.background.setScale(0.5)
    player = this.physics.add.sprite(400, 300, 'player');
    player.setDisplaySize(64, 64);
    player.setCollideWorldBounds(true);


    playerAxe = this.physics.add.sprite(400, 300, 'playerAxe');
    playerAxe.visible = false;
    playerAxe.setDisplaySize(64, 64);

    for (let i = 0; i < 10; i++){
        spawnGold(this);
    }

    this.time.addEvent({
        delay:10000,
        callback: () => spawnGold(this),
        loop: true
    });
    for (let i = 0; i < 10; i++) {
        spawnStone(this);
    }

    this.time.addEvent({
        delay: 10000,
        callback: () => spawnStone(this),
        loop: true
    });

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

    this.storageText= this.add.text(600, 18, 'Stored: 0', {fontSize: '32px', fill: '#fff'});

    // Initialize counterText
    counterText = this.add.text(16, 18, `Golds Mined: ${null}, Stones Mined: ${null}`, { fontSize: '18px', fill: '#fff' });
    
     // Initialize storage object with an `addGold` method
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
            } else {
                console.error('Storage text is not available.');
            }
        },
        scene: this
    };
    

    storage.scene = this;

    this.staticGroup = this.physics.add.staticGroup();

    // Add the storage sprite to the static group
    this.storageSprite = this.staticGroup.create(storageLocation.x, storageLocation.y, 'Storage');
    this.storageSprite = this.add.sprite(storageLocation.x, storageLocation.y, 'Storage');
    this.storageSprite.setDisplaySize(34, 34);

    findClosestGold.call(this);
    this.physics.add.collider(player, this.staticGroup, (player, storageSprite) => {
        if (goingToStorage) {
            player.setVelocity(0, 0); // Stop player movement
            player.anims.stop(); // Stop animation if necessary
            storeGolds.call(this); // Store the Gold
        }
    });
    findClosestStone.call(this);

     // Add collision detection between player and storage
     this.physics.add.collider(player, this.staticGroup, (player, storageSprite) => {
        if (goingToStorage) {
            player.setVelocity(0, 0); // Stop player movement
            player.anims.stop(); // Stop animation if necessary
            storeStones.call(this); // Store the stones
        }
    });

}
function update() {
    // Ensure arrays are initialized
    stones = stones || [];
    gold = gold || [];

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
        if (goldMindeSinceLastStorage >= 5) {
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
                stone.setDisplaySize(50, 50);
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
                goldItem.setDisplaySize(50, 50);
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
    if (isMining) return; // Prevent simultaneous mining
    isMining = true;
    player.setVelocity(0, 0);
    player.visible = false;
    playerAxe.setPosition(player.x, player.y);
    playerAxe.visible = true;
    playerAxe.anims.play('mine');

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
    if (isMining) return; // Prevent simultaneous mining
    isMining = true;
    player.setVelocity(0, 0);
    player.visible = false;
    playerAxe.setPosition(player.x, player.y);
    playerAxe.visible = true;
    playerAxe.anims.play('mine');

    this.time.delayedCall(500, () => {
        goldItem.destroy();
        gold.splice(gold.indexOf(goldItem), 1); // Remove gold item from array
        goldMindeSinceLastStorage++;
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
    goldMindeSinceLastStorage = 0; // Reset the gold counter
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



const game = new Phaser.Game(config);
