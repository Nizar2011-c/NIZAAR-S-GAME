const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 1000;
const HEIGHT = 550;
const GROUND = 460;

const player = {
    x: 120,
    y: GROUND - 60,
    width: 45,
    height: 60,
    velocity: 0,
    health: 5
};

const gravity = 0.85;
const jumpForce = -17;
const playerSpeed = 9;

const keys = { left: false, right: false };

let obstacles = [];
let projectiles = [];
let bossProjectiles = [];

let score = 0;
let bestScore = Number(localStorage.getItem("jumpRunnerBest") || 0);

let speed = 14;
let gameOver = false;
let gameStarted = false;

let spawnTimer = 0;
let spawnDelay = 55;

let boss = null;
let bossActive = false;
let bossShootTimer = 0;
const bossAttackDelay = 55;
let nextBossScore = 2000;

const stars = [];
for (let i = 0; i < 80; i++) {
    stars.push({
        x: Math.random() * WIDTH,
        y: 20 + Math.random() * (GROUND - 70),
        size: 1 + Math.floor(Math.random() * 3)
    });
}

function resetGame() {
    player.x = 120;
    player.y = GROUND - player.height;
    player.velocity = 0;
    player.health = 5;

    obstacles = [];
    projectiles = [];
    bossProjectiles = [];

    score = 0;
    speed = 14;
    spawnTimer = 0;
    spawnDelay = 55;

    boss = null;
    bossActive = false;
    bossShootTimer = 0;
    nextBossScore = 2000;

    gameOver = false;
}

function startGame() {
    gameStarted = true;
    resetGame();
}

function restartGame() {
    resetGame();
}

function jump() {
    if (!gameStarted || gameOver) return;
    if (player.y >= GROUND - player.height - 1) {
        player.velocity = jumpForce;
    }
}

function shoot() {
    if (!gameStarted || gameOver) return;

    projectiles.push({
        x: player.x + player.width,
        y: player.y + 25,
        width: 22,
        height: 8,
        speed: 18,
        damage: 1
    });
}

function createObstacle() {
    const types = ["spike", "block", "tower", "double_spike"];
    const type = types[Math.floor(Math.random() * types.length)];

    let width, height;

    if (type === "spike") {
        width = randomInt(40, 65);
        height = randomInt(45, 75);
    } else if (type === "double_spike") {
        width = 75;
        height = randomInt(45, 70);
    } else if (type === "tower") {
        width = randomInt(35, 55);
        height = randomInt(90, 130);
    } else {
        width = randomInt(45, 70);
        height = randomInt(50, 90);
    }

    obstacles.push({
        x: WIDTH,
        y: GROUND - height,
        width,
        height,
        type
    });
}

function createBoss() {
    bossActive = true;
    bossShootTimer = 0;

    player.x = 100;
    obstacles = [];

    boss = {
        x: 730,
        y: 170,
        width: 170,
        height: 200,
        health: 40,
        maxHealth: 40,
        direction: 1,
        speed: 3
    };
}

function collision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function bossShoot() {
    if (!boss) return;

    const startX = boss.x;
    const startY = boss.y + boss.height / 2;

    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;

    let dx = targetX - startX;
    let dy = targetY - startY;

    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return;

    const error = random(-30, 30);
    dx += error;
    dy += error;

    distance = Math.sqrt(dx * dx + dy * dy);

    const projectileSpeed = 10;

    bossProjectiles.push({
        x: startX,
        y: startY,
        width: 20,
        height: 20,
        vx: (dx / distance) * projectileSpeed,
        vy: (dy / distance) * projectileSpeed
    });
}

function loseGame() {
    gameOver = true;

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("jumpRunnerBest", String(bestScore));
    }
}

function update() {
    if (!gameStarted || gameOver) return;

    // Gravité
    player.velocity += gravity;
    player.y += player.velocity;

    if (player.y >= GROUND - player.height) {
        player.y = GROUND - player.height;
        player.velocity = 0;
    }

    if (bossActive) {
        // Déplacement du joueur
        if (keys.left) player.x -= playerSpeed;
        if (keys.right) player.x += playerSpeed;

        player.x = Math.max(20, Math.min(player.x, WIDTH - player.width - 20));

        // Mouvement du boss
        boss.y += boss.direction * boss.speed;
        if (boss.y <= 60) boss.direction = 1;
        if (boss.y >= 240) boss.direction = -1;

        // Tir du boss
        bossShootTimer++;
        if (bossShootTimer >= bossAttackDelay) {
            bossShoot();
            bossShootTimer = 0;
        }

        // Projectiles boss
        bossProjectiles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
        });

        bossProjectiles = bossProjectiles.filter(
            p => p.x > -100 && p.x < WIDTH + 100 && p.y > -100 && p.y < HEIGHT + 100
        );

        // Collision boss -> joueur
        for (const projectile of [...bossProjectiles]) {
            if (collision(player, projectile)) {
                player.health--;
                bossProjectiles = bossProjectiles.filter(p => p !== projectile);

                if (player.health <= 0) {
                    loseGame();
                    return;
                }
            }
        }

        if (collision(player, boss)) {
            player.health--;
            player.x -= 60;

            if (player.health <= 0) {
                loseGame();
                return;
            }
        }

        // Tirs joueur -> boss
        for (const projectile of [...projectiles]) {
            if (collision(projectile, boss)) {
                boss.health -= projectile.damage;
                projectiles = projectiles.filter(p => p !== projectile);

                if (boss.health <= 0) {
                    score += 1000;
                    boss = null;
                    bossActive = false;
                    bossProjectiles = [];
                    speed += 3;
                    player.x = 100;
                    nextBossScore = Math.ceil(score / 2000) * 2000;
                    break;
                }
            }
        }
    } else {
        // Runner : création des obstacles
        spawnTimer++;

        if (spawnTimer >= spawnDelay) {
            createObstacle();
            spawnTimer = 0;
            spawnDelay = randomInt(38, 65);
        }

        obstacles.forEach(o => o.x -= speed);
        obstacles = obstacles.filter(o => o.x + o.width > 0);

        // Collision obstacles
        for (const obstacle of obstacles) {
            if (collision(player, obstacle)) {
                player.health--;
                obstacle.x = -300;

                if (player.health <= 0) {
                    loseGame();
                    return;
                }
            }
        }

        // Apparition du boss
        if (score >= nextBossScore) {
            createBoss();
        }

        // Difficulté
        if (score > 0 && score % 300 === 0) {
            speed = Math.min(24, speed + 1);
            if (spawnDelay > 32) spawnDelay -= 2;
        }
    }

    // Projectiles joueur
    projectiles.forEach(p => p.x += p.speed);
    projectiles = projectiles.filter(p => p.x < WIDTH);

    score++;
}

function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Fond
    ctx.fillStyle = bossActive ? "#250d18" : "#071426";
    ctx.fillRect(0, 0, WIDTH, GROUND);

    // Étoiles
    stars.forEach(star => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Lune
    ctx.beginPath();
    ctx.arc(800, 85, 40, 0, Math.PI * 2);
    ctx.fillStyle = "#f4f1c9";
    ctx.fill();

    // Sol
    ctx.fillStyle = "#202938";
    ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);

    ctx.fillStyle = "#66758c";
    ctx.fillRect(0, GROUND, WIDTH, 9);

    drawPlayer();
    drawObstacles();
    drawProjectiles();

    if (bossActive && boss) drawBoss();

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "bold 23px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Score : ${Math.floor(score / 10)}`, 20, 43);

    ctx.fillStyle = "#b9c5d6";
    ctx.font = "16px Arial";
    ctx.fillText(`Record : ${Math.floor(bestScore / 10)}`, 20, 70);

    ctx.fillStyle = "#ff3b4f";
    ctx.font = "bold 21px Arial";
    ctx.textAlign = "right";
    ctx.fillText("♥ ".repeat(Math.max(0, player.health)), WIDTH - 20, 43);

    if (bossActive) {
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.fillText("Q / ← Reculer     D / → Avancer     ESPACE Sauter     F Tirer", WIDTH / 2, HEIGHT - 25);
    }

    if (!gameStarted) {
        drawStartScreen();
    }

    if (gameOver) {
        drawGameOver();
    }
}

function drawStartScreen() {
    ctx.fillStyle = "#101827";
    ctx.fillRect(180, 120, 640, 240);

    ctx.strokeStyle = "#3584ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(180, 120, 640, 240);

    ctx.textAlign = "center";

    ctx.fillStyle = "white";
    ctx.font = "bold 55px Arial";
    ctx.fillText("JUMP RUNNER", WIDTH / 2, 180);

    ctx.fillStyle = "#6ee7ff";
    ctx.font = "21px Arial";
    ctx.fillText("ESPACE : commencer / sauter", WIDTH / 2, 235);
    ctx.fillText("F : tirer", WIDTH / 2, 270);

    ctx.fillStyle = "#9ca3af";
    ctx.font = "17px Arial";
    ctx.fillText("Des boss apparaissent pendant la course...", WIDTH / 2, 315);
}

function drawGameOver() {
    ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
    ctx.fillRect(200, 130, 600, 250);

    ctx.strokeStyle = "#ff3b4f";
    ctx.lineWidth = 4;
    ctx.strokeRect(200, 130, 600, 250);

    ctx.textAlign = "center";

    ctx.fillStyle = "#ff3b4f";
    ctx.font = "bold 50px Arial";
    ctx.fillText("GAME OVER", WIDTH / 2, 195);

    ctx.fillStyle = "white";
    ctx.font = "bold 27px Arial";
    ctx.fillText(`Score : ${Math.floor(score / 10)}`, WIDTH / 2, 250);

    ctx.fillStyle = "#ffd43b";
    ctx.font = "21px Arial";
    ctx.fillText(`Record : ${Math.floor(bestScore / 10)}`, WIDTH / 2, 290);

    ctx.fillStyle = "#aab4c3";
    ctx.font = "19px Arial";
    ctx.fillText("ESPACE pour recommencer", WIDTH / 2, 335);
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;

    ctx.fillStyle = "#246bce";
    ctx.strokeStyle = "#8ec5ff";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, 45, 60);
    ctx.strokeRect(x, y, 45, 60);

    ctx.fillStyle = "#172b4d";
    ctx.strokeStyle = "#63b3ff";
    ctx.fillRect(x + 4, y - 7, 34, 22);
    ctx.strokeRect(x + 4, y - 7, 34, 22);

    ctx.fillStyle = "#61e8ff";
    ctx.fillRect(x + 22, y, 15, 8);

    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(x + 35, y + 23, 25, 9);

    ctx.fillStyle = "#00e5ff";
    ctx.beginPath();
    ctx.arc(x + 58, y + 28, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawObstacles() {
    obstacles.forEach(o => {
        const x = o.x;
        const y = o.y;
        const w = o.width;

        if (o.type === "spike") {
            ctx.beginPath();
            ctx.moveTo(x, GROUND);
            ctx.lineTo(x + w / 2, y);
            ctx.lineTo(x + w, GROUND);
            ctx.closePath();

            ctx.fillStyle = "#ff334f";
            ctx.strokeStyle = "#ff9aaa";
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
        } else if (o.type === "double_spike") {
            ctx.beginPath();
            ctx.moveTo(x, GROUND);
            ctx.lineTo(x + w / 4, y);
            ctx.lineTo(x + w / 2, GROUND);
            ctx.lineTo(x + 3 * w / 4, y);
            ctx.lineTo(x + w, GROUND);
            ctx.closePath();

            ctx.fillStyle = "#ff334f";
            ctx.strokeStyle = "#ff9aaa";
            ctx.fill();
            ctx.stroke();
        } else if (o.type === "tower") {
            ctx.fillStyle = "#7138d4";
            ctx.strokeStyle = "#bd8cff";
            ctx.lineWidth = 3;
            ctx.fillRect(x, y, w, GROUND - y);
            ctx.strokeRect(x, y, w, GROUND - y);

            ctx.fillStyle = "#ffd43b";
            for (let wy = y + 15; wy < GROUND - 10; wy += 25) {
                ctx.fillRect(x + 8, wy, Math.max(5, w - 16), 10);
            }
        } else {
            ctx.fillStyle = "#ff7600";
            ctx.strokeStyle = "#ffd166";
            ctx.lineWidth = 3;
            ctx.fillRect(x, y, w, GROUND - y);
            ctx.strokeRect(x, y, w, GROUND - y);

            ctx.fillStyle = "#ffe66d";
            ctx.fillRect(x + 5, y + 10, w - 10, 7);
        }
    });
}

function drawProjectiles() {
    projectiles.forEach(p => {
        ctx.fillStyle = "#00e5ff";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeRect(p.x, p.y, p.width, p.height);

        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - 10, p.y + 4);
        ctx.lineTo(p.x, p.y + 4);
        ctx.stroke();
    });

    bossProjectiles.forEach(p => {
        ctx.fillStyle = "#ff2525";
        ctx.strokeStyle = "#ffb3b3";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x + 10, p.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#ff5555";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x + 10, p.y + 10);
        ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
        ctx.stroke();
    });
}

function drawBoss() {
    const x = boss.x;
    const y = boss.y;

    // Ombre
    ctx.fillStyle = "#120b0b";
    ctx.beginPath();
    ctx.ellipse(x + 85, y + 192, 95, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jambes
    ctx.fillStyle = "#3a2418";
    ctx.fillRect(x + 35, y + 125, 40, 70);
    ctx.fillRect(x + 95, y + 125, 40, 70);

    // Pieds
    ctx.fillStyle = "#2b1911";
    ctx.beginPath();
    ctx.ellipse(x + 50, y + 190, 30, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 120, y + 190, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torse
    ctx.fillStyle = "#4a2b1b";
    ctx.beginPath();
    ctx.ellipse(x + 85, y + 100, 65, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ventre
    ctx.fillStyle = "#58331f";
    ctx.beginPath();
    ctx.ellipse(x + 85, y + 115, 40, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pectoraux
    ctx.fillStyle = "#674027";
    ctx.beginPath();
    ctx.ellipse(x + 60, y + 82, 25, 17, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 110, y + 82, 25, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bras
    ctx.fillStyle = "#3b2418";
    ctx.beginPath();
    ctx.ellipse(x + 5, y + 85, 40, 40, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 20, y + 140, 35, 40, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 165, y + 85, 40, 40, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 190, y + 140, 35, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Poings
    ctx.fillStyle = "#29170f";
    ctx.beginPath();
    ctx.ellipse(x - 25, y + 170, 35, 25, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 190, y + 170, 35, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tête
    ctx.fillStyle = "#4a2b1b";
    ctx.beginPath();
    ctx.ellipse(x + 85, y + 30, 45, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Oreilles
    ctx.fillStyle = "#3a2116";
    ctx.beginPath();
    ctx.ellipse(x + 38, y + 22, 14, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 132, y + 22, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Museau
    ctx.fillStyle = "#70452c";
    ctx.beginPath();
    ctx.ellipse(x + 85, y + 45, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nez
    ctx.fillStyle = "#24140d";
    ctx.beginPath();
    ctx.ellipse(x + 85, y + 39, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Yeux
    ctx.fillStyle = "#ffd000";
    ctx.beginPath();
    ctx.arc(x + 62, y + 22, 8, 0, Math.PI * 2);
    ctx.arc(x + 108, y + 22, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x + 64, y + 23, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 110, y + 23, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Bouche + dents
    ctx.fillStyle = "#180b07";
    ctx.fillRect(x + 58, y + 47, 54, 21);

    ctx.fillStyle = "white";
    for (let toothX = x + 63; toothX < x + 110; toothX += 12) {
        ctx.beginPath();
        ctx.moveTo(toothX, y + 48);
        ctx.lineTo(toothX + 6, y + 48);
        ctx.lineTo(toothX + 3, y + 58);
        ctx.closePath();
        ctx.fill();
    }

    // Barre de vie
    const barWidth = 380;

    ctx.fillStyle = "#280808";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.fillRect(WIDTH / 2 - barWidth / 2, 15, barWidth, 27);
    ctx.strokeRect(WIDTH / 2 - barWidth / 2, 15, barWidth, 27);

    const healthWidth = barWidth * boss.health / boss.maxHealth;
    ctx.fillStyle = "#ef233c";
    ctx.fillRect(WIDTH / 2 - barWidth / 2, 15, healthWidth, 27);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff5555";
    ctx.font = "bold 23px Arial";
    ctx.fillText("GORILLE BOSS", WIDTH / 2, 65);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Clavier
window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if ([" ", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
    }

    if (key === " ") {
        if (!gameStarted) startGame();
        else if (gameOver) restartGame();
        else jump();
    }

    if (key === "arrowleft" || key === "q") keys.left = true;
    if (key === "arrowright" || key === "d") keys.right = true;
    if (key === "f") shoot();
});

window.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();

    if (key === "arrowleft" || key === "q") keys.left = false;
    if (key === "arrowright" || key === "d") keys.right = false;
});

// Boutons mobiles
const mobileJump = document.getElementById("mobileJump");
const mobileLeft = document.getElementById("mobileLeft");
const mobileRight = document.getElementById("mobileRight");
const mobileFire = document.getElementById("mobileFire");

mobileJump.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (!gameStarted) startGame();
    else if (gameOver) restartGame();
    else jump();
});

mobileFire.addEventListener("pointerdown", e => {
    e.preventDefault();
    shoot();
});

function holdButton(button, direction) {
    button.addEventListener("pointerdown", e => {
        e.preventDefault();
        keys[direction] = true;
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
        button.addEventListener(type, () => {
            keys[direction] = false;
        });
    });
}

holdButton(mobileLeft, "left");
holdButton(mobileRight, "right");

function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 24, WIDTH);
    canvas.style.width = `${maxWidth}px`;
    canvas.style.height = `${maxWidth * HEIGHT / WIDTH}px`;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

draw();
gameLoop();
