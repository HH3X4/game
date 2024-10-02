const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const healthElement = document.getElementById('health');
const levelElement = document.getElementById('level');

canvas.width = 800;
canvas.height = 600;

const POWER_UP_FREQUENCY = 0.01;
const SHOOT_COOLDOWN = 250; // milliseconds

const player = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    width: 40,
    height: 50,
    speed: 300,
    health: 100,
    color: '#4ecdc4',
    shield: false,
    lastShot: 0
};


const bullets = [];
const enemies = [];
const powerUps = [];
const particles = [];

let score = 0;
let level = 1;
let bossFight = false;

const enemyTypes = [
    { color: '#ff6b6b', health: 1, speed: 2, points: 10, size: 30, shape: 'triangle' },
    { color: '#feca57', health: 2, speed: 1.5, points: 20, size: 40, shape: 'square' },
    { color: '#48dbfb', health: 3, speed: 1, points: 30, size: 50, shape: 'pentagon' }
];


const boss = {
    x: canvas.width / 2,
    y: -100,
    width: 100,
    height: 100,
    health: 100,
    maxHealth: 100,
    speed: 1,
    points: 500,
    color: '#ff9ff3'
};

const powerUpTypes = [
    { type: 'health', color: '#10ac84', symbol: '+' },
    { type: 'speed', color: '#54a0ff', symbol: 'S' },
    { type: 'shield', color: '#5f27cd', symbol: 'O' }
];


const STAR_COUNT = 100;
const stars = [];

function createStarryBackground() {
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

function drawStarryBackground() {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateStarryBackground() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.closePath();
    ctx.fill();

    // Add details to the player ship
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x, player.y + player.height / 4);
    ctx.moveTo(player.x - player.width / 4, player.y + player.height / 4);
    ctx.lineTo(player.x + player.width / 4, player.y + player.height / 4);
    ctx.stroke();

    if (player.shield) {
        ctx.strokeStyle = '#5f27cd';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.width * 0.75, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawBullets() {
    ctx.fillStyle = '#f9ca24';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        if (enemy.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y - enemy.size / 2);
            ctx.lineTo(enemy.x - enemy.size / 2, enemy.y + enemy.size / 2);
            ctx.lineTo(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (enemy.shape === 'square') {
            ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
            ctx.strokeRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
        } else if (enemy.shape === 'pentagon') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(enemy.x + enemy.size / 2 * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2),
                           enemy.y + enemy.size / 2 * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2));
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    });

    if (bossFight) {
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x - boss.width / 2, boss.y - boss.height / 2, boss.width, boss.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(boss.x - boss.width / 2, boss.y - boss.height / 2, boss.width, boss.height);
        
        // Boss health bar
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(boss.x - boss.width / 2, boss.y - boss.height / 2 - 20, boss.width, 10);
        ctx.fillStyle = '#ee5253';
        ctx.fillRect(boss.x - boss.width / 2, boss.y - boss.height / 2 - 20, boss.width * (boss.health / boss.maxHealth), 10);
    }
}

function drawPowerUps() {
    powerUps.forEach(powerUp => {
        ctx.fillStyle = powerUp.color;
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerUp.symbol, powerUp.x, powerUp.y);
    });
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= 10;
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }
}

const MAX_ENEMIES = 10;
const MAX_PARTICLES = 100;

function updateEnemies() {
    if (!bossFight && enemies.length < MAX_ENEMIES && Math.random() < 0.02 + (level * 0.002)) {
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        enemies.push({
            ...enemyType,
            x: Math.random() * canvas.width,
            y: 0
        });
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        if (enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
            if (!player.shield) {
                player.health -= 5;
                updateHealthDisplay();
            }
        }
    }

    if (bossFight) {
        boss.y += boss.speed;
        if (boss.y > canvas.height) {
            bossFight = false;
            if (!player.shield) {
                player.health -= 20;
                updateHealthDisplay();
            }
        }
    }
}

function updatePowerUps() {
    if (Math.random() < POWER_UP_FREQUENCY) {
        const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        powerUps.push({
            ...powerUpType,
            x: Math.random() * canvas.width,
            y: 0,
            speed: 1
        });
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].y += powerUps[i].speed;
        if (powerUps[i].y > canvas.height) {
            powerUps.splice(i, 1);
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].alpha -= 0.02;
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

function checkCollisions() {
    const playerHitbox = {
        x: player.x - player.width / 2,
        y: player.y - player.height / 2,
        width: player.width,
        height: player.height
    };

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemyHitbox = {
            x: enemies[i].x - enemies[i].size / 2,
            y: enemies[i].y - enemies[i].size / 2,
            width: enemies[i].size,
            height: enemies[i].size
        };

        if (intersects(playerHitbox, enemyHitbox) && !player.shield) {
            player.health -= 10;
            updateHealthDisplay();
            createExplosion(enemies[i].x, enemies[i].y, enemies[i].color);
            enemies.splice(i, 1);
            continue;
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            if (pointInRect(bullets[j].x, bullets[j].y, enemyHitbox)) {
                const points = enemies[i].points;
                createExplosion(enemies[i].x, enemies[i].y, enemies[i].color);
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                updateScore(points);
                break;
            }
        }
    }

    if (bossFight) {
        const bossHitbox = {
            x: boss.x - boss.width / 2,
            y: boss.y - boss.height / 2,
            width: boss.width,
            height: boss.height
        };

        if (intersects(playerHitbox, bossHitbox) && !player.shield) {
            player.health -= 20;
            updateHealthDisplay();
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            if (pointInRect(bullets[i].x, bullets[i].y, bossHitbox)) {
                createExplosion(bullets[i].x, bullets[i].y, boss.color);
                bullets.splice(i, 1);
                boss.health -= 1;
                if (boss.health <= 0) {
                    bossFight = false;
                    updateScore(boss.points);
                }
                break;
            }
        }
    }

    powerUps.forEach((powerUp, index) => {
        if (intersects(playerHitbox, { x: powerUp.x - 15, y: powerUp.y - 15, width: 30, height: 30 })) {
            applyPowerUp(powerUp);
            powerUps.splice(index, 1);
        }
    });
}

function intersects(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}


function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
}

function applyPowerUp(powerUp) {
    if (powerUp.type === 'health') {
        player.health = Math.min(player.health + 20, 100);
    } else if (powerUp.type === 'speed') {
        player.speed += 2;
        setTimeout(() => {
            player.speed = Math.max(player.speed - 2, 5);
        }, 5000);
    } else if (powerUp.type === 'shield') {
        player.shield = true;
        setTimeout(() => {
            player.shield = false;
        }, 10000);
    }
    updateHealthDisplay();
}

function createExplosion(x, y, color) {
    const particlesToCreate = Math.min(20, MAX_PARTICLES - particles.length);
    for (let i = 0; i < particlesToCreate; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            size: Math.random() * 3 + 1,
            color: color,
            alpha: 1
        });
    }
}

function updateScore(points) {
    score += points;
    scoreElement.textContent = score;
    if (score >= level * 1000 && !bossFight) {
        level++;
        levelElement.textContent = level;
        if (level % 5 === 0) {
            startBossFight();
        }
    }
}

function startBossFight() {
    bossFight = true;
    boss.health = boss.maxHealth = 100 + (level * 10);
    boss.y = -100;
}

function updateHealthDisplay() {
    healthElement.textContent = player.health;
}

let lastTime = 0;
const fixedTimeStep = 1000 / 60; // 60 FPS
let accumulator = 0;

let gameState = 'title';

function gameLoop(currentTime) {
    if (lastTime === 0) {
        lastTime = currentTime;
    }
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (gameState === 'title') {
        showTitleScreen();
    } else if (gameState === 'playing') {
        accumulator += deltaTime;

        while (accumulator >= fixedTimeStep) {
            updateGame(fixedTimeStep);
            accumulator -= fixedTimeStep;
        }

        render();

        if (player.health <= 0) {
            gameState = 'gameOver';
        }
    } else if (gameState === 'gameOver') {
        gameOver();
    }

    requestAnimationFrame(gameLoop);
}

function updateGame(deltaTime) {
    if (keys.ArrowLeft && player.x > player.width / 2) player.x -= player.speed * (deltaTime / 1000);
    if (keys.ArrowRight && player.x < canvas.width - player.width / 2) player.x += player.speed * (deltaTime / 1000);
    if (keys.Space && bullets.length < 5 && Date.now() - player.lastShot > SHOOT_COOLDOWN) {
        bullets.push({
            x: player.x,
            y: player.y - player.height / 2
        });
        player.lastShot = Date.now();
    }

    updateBullets();
    updateEnemies();
    updatePowerUps();
    updateParticles();
    checkCollisions();
}

function render() {
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStarryBackground();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawPowerUps();
    drawParticles();
    drawUI();
}

function drawUI() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.textAlign = 'center';
    ctx.fillText(`Level: ${level}`, canvas.width / 2, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`Health: ${player.health}`, canvas.width - 10, 30);
}

function showTitleScreen() {
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStarryBackground();
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Space Shooter', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px Arial';
    ctx.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2 + 50);
}

function gameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 50);
}

const keys = {};

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'title') {
            gameState = 'playing';
            createStarryBackground();
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('keydown', e => {
    if (e.code === 'KeyR' && gameState === 'gameOver') {
        location.reload();
    }
});

updateHealthDisplay();
levelElement.textContent = level;
requestAnimationFrame(gameLoop);
