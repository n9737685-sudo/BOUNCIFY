const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const coinsText = document.getElementById("coins");
const livesText = document.getElementById("lives");
const scoreText = document.getElementById("score");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const winScreen = document.getElementById("winScreen");

const WIDTH = 800;
const HEIGHT = 600;

let running = false;
let cameraY = 0;
let coins = 0;
let score = 0;
let lives = 3;
let level = 1;
let highScore = Number(localStorage.getItem("bouncifyHighScore")) || 0;

let keys = {};
let platforms = [];
let collectibles = [];
let particles = [];

let abilities = {
    double: false,
    high: false,
    magnet: false
};

const player = {
    x: 385,
    y: 510,
    width: 30,
    height: 38,
    vx: 0,
    vy: 0,
    speed: 5,
    jumpPower: -13,
    grounded: false,
    jumpsLeft: 1
};

const gravity = 0.35;

// Create platforms and coins
function createWorld() {
    platforms = [
        { x: 325, y: 560, w: 150, h: 18, type: "normal" }
    ];

    collectibles = [];

    let lastX = 325;
    let lastY = 460;

    for (let i = 0; i < 35; i++) {
        let x = Math.max(20, Math.min(650,
            lastX + (Math.random() - 0.5) * 250));

        let y = lastY - (75 + Math.random() * 35);

        let type = i % 7 === 4 ? "moving" :
                   i % 6 === 3 ? "spring" :
                   i % 5 === 2 ? "break" : "normal";

        platforms.push({
            x, y,
            w: 110,
            h: 16,
            type,
            originalX: x,
            direction: 1,
            broken: false
        });

        collectibles.push({
            x: x + 50,
            y: y - 35,
            collected: false
        });

        lastX = x;
        lastY = y;
    }

    // Goal at the top
    platforms.push({
        x: 300,
        y: lastY - 130,
        w: 200,
        h: 22,
        type: "goal"
    });
}

// Reset the player after falling
function resetPlayer() {
    player.x = 385;
    player.y = 510;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.jumpsLeft = abilities.double ? 2 : 1;
    cameraY = 0;
}

// Start or restart a level
function startGame() {
    coins = 0;
    score = 0;
    lives = 3;
    level = 1;

    abilities.double = false;
    abilities.high = false;
    abilities.magnet = false;

    resetPlayer();
    createWorld();

    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    winScreen.classList.add("hidden");

    running = true;
    updateStats();
    requestAnimationFrame(gameLoop);
}

// Update the HUD
function updateStats() {
    coinsText.textContent = coins;
    livesText.textContent = lives;
    scoreText.textContent = score;
}

// Keyboard controls
window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) {
        e.preventDefault();
    }

    keys[e.key.toLowerCase()] = true;

    if (
        [" ", "arrowup", "w"].includes(e.key.toLowerCase()) &&
        running && !keys.jumpPressed
    ) {
        jump();
        keys.jumpPressed = true;
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;

    if ([" ", "arrowup", "w"].includes(e.key.toLowerCase())) {
        keys.jumpPressed = false;
    }
});

// Jumping mechanics
function jump() {
    if (player.grounded) {
        player.vy = abilities.high ? -18 : -13;
        player.grounded = false;
        player.jumpsLeft = abilities.double ? 1 : 0;
        return;
    }

    if (abilities.double && player.jumpsLeft > 0) {
        player.vy = -13;
        player.jumpsLeft--;
        createParticles(
            player.x + player.width / 2,
            player.y + player.height,
            "#ffffff"
        );
    }
}

// Buy special abilities
function buyAbility(type, price) {
    if (!running) {
        document.getElementById("shopMessage").textContent =
            "Start the game before buying abilities!";
        return;
    }

    if (abilities[type]) {
        document.getElementById("shopMessage").textContent =
            "You already own this ability!";
        return;
    }

    if (coins < price) {
        document.getElementById("shopMessage").textContent =
            "Not enough coins! Keep collecting!";
        return;
    }

    coins -= price;
    abilities[type] = true;

    if (type === "double") {
        player.jumpsLeft = 1;
    }

    document.getElementById("shopMessage").textContent =
        "Power-up unlocked! ✨";

    updateStats();
}

document.getElementById("doubleBtn").onclick =
    () => buyAbility("double", 20);

document.getElementById("highBtn").onclick =
    () => buyAbility("high", 15);

document.getElementById("magnetBtn").onclick =
    () => buyAbility("magnet", 25);

// Create particle effects
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 25,
            color
        });
    }
}

// Update player physics
function update() {
    if (keys.arrowleft || keys.a) {
        player.vx = -player.speed;
    } else if (keys.arrowright || keys.d) {
        player.vx = player.speed;
    } else {
        player.vx *= 0.8;
    }

    player.x += player.vx;
    player.vy += gravity;
    player.y += player.vy;

    // Screen boundaries
    player.x = Math.max(0, Math.min(
        WIDTH - player.width, player.x
    ));

    player.grounded = false;

    // Platform movement
    platforms.forEach(p => {
        if (p.type === "moving") {
            p.x += p.direction * 1.5;

            if (p.x > p.originalX + 65 || p.x < p.originalX - 65) {
                p.direction *= -1;
            }
        }

        // Landing collision
        if (
            !p.broken &&
            player.vy > 0 &&
            player.x + player.width > p.x &&
            player.x < p.x + p.w &&
            player.y + player.height >= p.y &&
            player.y + player.height - player.vy <= p.y
        ) {
            player.y = p.y - player.height;
            player.vy = 0;
            player.grounded = true;
            player.jumpsLeft = abilities.double ? 1 : 0;

            if (p.type === "spring") {
                player.vy = -20;
                player.grounded = false;
                createParticles(player.x + 15, player.y + 38, "#ffe66d");
            }

            if (p.type === "break") {
                p.broken = true;
            }

            if (p.type === "goal") {
                completeLevel();
            }
        }
    });

    // Camera follows the player upwards
    if (player.y - cameraY < 240) {
        cameraY = player.y - 240;
    }

    // Coin collection and magnet ability
    collectibles.forEach(c => {
        if (c.collected) return;

        let dx = player.x + 15 - c.x;
        let dy = player.y + 19 - c.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (abilities.magnet && distance < 150) {
            c.x += dx * 0.08;
            c.y += dy * 0.08;
        }

        if (distance < 27) {
            c.collected = true;
            coins++;
            score += 10;
            createParticles(c.x, c.y, "#ffd700");
            updateStats();
        }
    });

    // Update particles
    particles = particles.filter(p => p.life > 0);

    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });

    // Falling costs one life
    if (player.y - cameraY > HEIGHT + 50) {
        lives--;
        updateStats();

        if (lives <= 0) {
            endGame();
        } else {
            resetPlayer();
        }
    }
}

// Draw the fantasy sky background
function drawBackground() {
    let gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

    gradient.addColorStop(0, "#65c9f5");
    gradient.addColorStop(1, "#d4f5ff");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Clouds
    for (let i = 0; i < 12; i++) {
        let x = (i * 173) % WIDTH;
        let y = ((i * 127 - cameraY * 0.25) % 750 + 750) % 750;

        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.arc(x + 25, y - 10, 35, 0, Math.PI * 2);
        ctx.arc(x + 52, y, 27, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw platforms
function drawPlatforms() {
    platforms.forEach(p => {
        if (p.broken) return;

        let screenY = p.y - cameraY;

        if (screenY < -40 || screenY > HEIGHT + 40) return;

        if (p.type === "goal") {
            ctx.fillStyle = "#ffe66d";
        } else if (p.type === "spring") {
            ctx.fillStyle = "#f47bd8";
        } else if (p.type === "moving") {
            ctx.fillStyle = "#a77cff";
        } else if (p.type === "break") {
            ctx.fillStyle = "#d49b62";
        } else {
            ctx.fillStyle = "#4caf74";
        }

        ctx.fillRect(p.x, screenY, p.w, p.h);

        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(p.x, screenY, p.w, 5);
    });
}

// Draw coins
function drawCoins() {
    collectibles.forEach(c => {
        if (c.collected) return;

        let y = c.y - cameraY;

        if (y < -30 || y > HEIGHT + 30) return;

        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.arc(c.x, y, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#fff2a3";
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

// Draw the player
function drawPlayer() {
    let y = player.y - cameraY;

    // Body
    ctx.fillStyle = "#8254e8";
    ctx.fillRect(player.x, y, player.width, player.height);

    // Face
    ctx.fillStyle = "white";
    ctx.fillRect(player.x + 6, y + 9, 6, 7);
    ctx.fillRect(player.x + 19, y + 9, 6, 7);

    ctx.fillStyle = "#222";
    ctx.fillRect(player.x + 8, y + 11, 3, 3);
    ctx.fillRect(player.x + 21, y + 11, 3, 3);

    // Smile
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + 15, y + 20, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
}

// Draw particles
function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 25;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y - cameraY, 5, 5);
    });

    ctx.globalAlpha = 1;
}

// Display height
function drawHeight() {
    let height = Math.max(0, Math.floor(-cameraY / 10));

    ctx.fillStyle = "#243b65";
    ctx.font = "bold 20px Arial";
    ctx.fillText("HEIGHT: " + height + "m", 20, 35);
}

// Render everything
function draw() {
    drawBackground();
    drawPlatforms();
    drawCoins();
    drawParticles();
    drawPlayer();
    drawHeight();
}

// Game loop
function gameLoop() {
    if (!running) return;

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

// End game
function endGame() {
    running = false;
    gameOverScreen.classList.remove("hidden");

    highScore = Math.max(highScore, score);
    localStorage.setItem("bouncifyHighScore", highScore);
}

// Complete level
function completeLevel() {
    if (!running) return;

    running = false;
    winScreen.classList.remove("hidden");
    document.querySelector("#winScreen p").textContent =
        "You collected " + coins + " coins! Score: " + score;
}

// Buttons
document.getElementById("playButton").onclick = startGame;
document.getElementById("restartButton").onclick = startGame;

document.getElementById("nextButton").onclick = () => {
    level++;
    startGame();
};

// Initial screen
drawBackground();
drawPlatforms();
drawCoins();
drawPlayer();