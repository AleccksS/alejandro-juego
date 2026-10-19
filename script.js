const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('scoreDisplay');

const CW = 400, CH = 500;
canvas.width = CW; canvas.height = CH;

// ---- ESTADO DEL JUEGO ----
let player = { x: 180, y: 450, w: 30, h: 16 };
let enemies = [];
let bullets = [];
let score = 0;
let gameOver = false;
let winFlag = false;

// Jefe final: aparece cuando todos los enemigos normales son derrotados.
let boss = null;
let bossBullets = [];
let bossSpawned = false;
const BOSS_MAX_HP = 20;

let leftPressed = false;
let rightPressed = false;
let moveX = 0;

const ENEMY_ROWS = 4;
const ENEMY_COLS = 6;
const ENEMY_W = 26;
const ENEMY_H = 20;
const ENEMY_SPACING = 12;
let enemyDirection = 1;
let enemySpeed = 0.8;
let enemyMoveCounter = 0;
const ENEMY_MOVE_FRAMES = 12;

let shootCooldown = 0;
const SHOOT_DELAY = 14;

// ---- INICIALIZAR ENEMIGOS ----
function initEnemies() {
    enemies = [];
    const startX = 30;
    const startY = 40;
    for (let row = 0; row < ENEMY_ROWS; row++) {
        for (let col = 0; col < ENEMY_COLS; col++) {
            enemies.push({
                x: startX + col * (ENEMY_W + ENEMY_SPACING),
                y: startY + row * (ENEMY_H + ENEMY_SPACING),
                w: ENEMY_W,
                h: ENEMY_H,
                alive: true,
                color: row === 0 ? '#f2b84b' : (row === 1 ? '#d96c4a' : '#6bb0d9')
            });
        }
    }
    enemyDirection = 1;
    enemySpeed = 0.8;
    enemyMoveCounter = 0;
}

// ---- REINICIAR ----
function resetGame() {
    player.x = 180;
    bullets = [];
    score = 0;
    gameOver = false;
    winFlag = false;
    boss = null;
    bossBullets = [];
    bossSpawned = false;
    leftPressed = false;
    rightPressed = false;
    moveX = 0;
    shootCooldown = 0;
    initEnemies();
    updateScore();
}

// ---- DISPARAR ----
function shootBullet() {
    if (gameOver || winFlag) return;
    bullets.push({
        x: player.x + player.w/2 - 3,
        y: player.y - 8,
        w: 6,
        h: 14,
        speed: 5
    });
}

// ---- JEFE FINAL ----
function spawnBoss() {
    bossSpawned = true;
    bossBullets = [];
    boss = {
        x: 115, y: 48, w: 170, h: 62,
        hp: BOSS_MAX_HP,
        direction: 1,
        speed: 1.8,
        shootCooldown: 55,
        hitFlash: 0
    };
}

function updateBoss() {
    if (!boss) return;

    // El jefe se mueve de lado a lado.
    boss.x += boss.direction * boss.speed;
    if (boss.x <= 8 || boss.x + boss.w >= CW - 8) {
        boss.direction *= -1;
    }

    // El jefe dispara hacia el jugador.
    boss.shootCooldown--;
    if (boss.shootCooldown <= 0) {
        bossBullets.push({
            x: boss.x + boss.w / 2 - 4,
            y: boss.y + boss.h,
            w: 8, h: 12, speed: 3.2
        });
        boss.shootCooldown = 58;
    }

    // Mover proyectiles del jefe y comprobar si alcanzan al jugador.
    for (let i = bossBullets.length - 1; i >= 0; i--) {
        const b = bossBullets[i];
        b.y += b.speed;
        if (rectCollide(player, b)) {
            gameOver = true;
            return;
        }
        if (b.y > CH) bossBullets.splice(i, 1);
    }

    // Los disparos del jugador dañan al jefe.
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (rectCollide(b, boss)) {
            bullets.splice(i, 1);
            boss.hp--;
            boss.hitFlash = 5;
            score += 10;
            updateScore();
            if (boss.hp <= 0) {
                boss = null;
                bossBullets = [];
                winFlag = true;
                return;
            }
        }
    }

    if (boss && boss.hitFlash > 0) boss.hitFlash--;
}

// ---- ACTUALIZAR PUNTUACIÓN ----
function updateScore() {
    scoreSpan.textContent = score;
}

// ---- COLISIONES ----
function rectCollide(r1, r2) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x ||
        r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
}

// ---- LÓGICA DEL JUEGO ----
function update() {
    if (gameOver || winFlag) return;

    // Movimiento del jugador
    const SPEED = 5;
    if (moveX !== 0) {
        player.x += moveX * SPEED;
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > CW) player.x = CW - player.w;
    }

    // Disparo automático
    shootCooldown--;
    if (shootCooldown <= 0) {
        shootBullet();
        shootCooldown = SHOOT_DELAY;
    }

    // Mover balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y -= b.speed;
        if (b.y + b.h < 0) {
            bullets.splice(i, 1);
        }
    }

    // Verificar si hay enemigos vivos
    let anyAlive = false;
    for (const e of enemies) {
        if (e.alive) { anyAlive = true; break; }
    }
    if (!anyAlive && !bossSpawned) {
        spawnBoss();
    }

    // Si el jefe está activo, actualizamos su comportamiento y sus colisiones.
    if (boss) {
        updateBoss();
        return;
    }

    // Movimiento de enemigos
    enemyMoveCounter++;
    if (enemyMoveCounter >= ENEMY_MOVE_FRAMES) {
        enemyMoveCounter = 0;
        let minX = 999, maxX = -999;
        for (const e of enemies) {
            if (!e.alive) continue;
            if (e.x < minX) minX = e.x;
            if (e.x + e.w > maxX) maxX = e.x + e.w;
        }
        if (maxX > CW - 10) {
            enemyDirection = -1;
            for (const e of enemies) {
                if (e.alive) e.y += 6;
            }
        } else if (minX < 10) {
            enemyDirection = 1;
            for (const e of enemies) {
                if (e.alive) e.y += 6;
            }
        }
        for (const e of enemies) {
            if (e.alive) e.x += enemyDirection * enemySpeed;
        }
    }

    // Colisiones balas vs enemigos
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        let bulletUsed = false;
        for (const e of enemies) {
            if (!e.alive) continue;
            if (rectCollide(b, e)) {
                e.alive = false;
                bulletUsed = true;
                score += 10;
                updateScore();
                break;
            }
        }
        if (bulletUsed) {
            bullets.splice(i, 1);
        }
    }

    // Colisiones enemigos vs jugador
    for (const e of enemies) {
        if (!e.alive) continue;
        if (rectCollide(player, e)) {
            gameOver = true;
            return;
        }
        if (e.y + e.h > player.y + 10) {
            gameOver = true;
            return;
        }
    }
}

// ---- DIBUJAR ----
function draw() {
    ctx.clearRect(0, 0, CW, CH);

    // Fondo estrellado
    ctx.fillStyle = '#0b111f';
    ctx.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 70; i++) {
        if (i % 2 === 0) continue;
        ctx.fillStyle = `rgba(255,255,240,${0.5+Math.random()*0.5})`;
        ctx.beginPath();
        ctx.arc((i*23)%CW, (i*13)%CH, 1.2, 0, Math.PI*2);
        ctx.fill();
    }

    // Jugador
    ctx.shadowColor = '#7bb3ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#b1dcff';
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.w, player.h, 6);
    ctx.fill();
    ctx.fillStyle = '#76b8ff';
    ctx.beginPath();
    ctx.roundRect(player.x+8, player.y-6, 14, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#5f9eff';
    ctx.fillRect(player.x-4, player.y+4, 4, 8);
    ctx.fillRect(player.x+player.w, player.y+4, 4, 8);
    ctx.shadowBlur = 0;

    // Balas
    ctx.fillStyle = '#f2ff80';
    ctx.shadowColor = '#f0ff60';
    ctx.shadowBlur = 16;
    for (const b of bullets) {
        ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.shadowBlur = 0;

    // Enemigos
    for (const e of enemies) {
        if (!e.alive) continue;
        ctx.fillStyle = e.color;
        ctx.shadowColor = '#b0d0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(e.x, e.y, e.w, e.h, 6);
        ctx.fill();
        ctx.fillStyle = '#fcf9ea';
        ctx.shadowBlur = 4;
        ctx.fillRect(e.x+4, e.y+3, 6, 6);
        ctx.fillRect(e.x+e.w-10, e.y+3, 6, 6);
        ctx.fillStyle = '#121212';
        ctx.fillRect(e.x+6, e.y+5, 3, 3);
        ctx.fillRect(e.x+e.w-8, e.y+5, 3, 3);
    }
    ctx.shadowBlur = 0;

    // Jefe final y barra de vida.
    if (boss) {
        ctx.save();
        ctx.shadowColor = boss.hitFlash > 0 ? '#ffffff' : '#ff2f8e';
        ctx.shadowBlur = boss.hitFlash > 0 ? 24 : 18;
        ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : '#a72cff';
        ctx.beginPath();
        ctx.roundRect(boss.x, boss.y, boss.w, boss.h, 14);
        ctx.fill();

        // Ojos y detalles del jefe.
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffe9ff';
        ctx.fillRect(boss.x + 28, boss.y + 18, 28, 18);
        ctx.fillRect(boss.x + boss.w - 56, boss.y + 18, 28, 18);
        ctx.fillStyle = '#1b1028';
        ctx.fillRect(boss.x + 37, boss.y + 23, 10, 10);
        ctx.fillRect(boss.x + boss.w - 47, boss.y + 23, 10, 10);
        ctx.fillStyle = '#ff5a8a';
        ctx.fillRect(boss.x + boss.w / 2 - 15, boss.y + 43, 30, 7);
        ctx.restore();

        // Barra de vida.
        ctx.fillStyle = '#301b35';
        ctx.fillRect(75, 16, 250, 12);
        ctx.fillStyle = '#ff477e';
        ctx.fillRect(75, 16, 250 * Math.max(0, boss.hp) / BOSS_MAX_HP, 12);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(75, 16, 250, 12);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('JEFE FINAL', CW / 2, 40);

        ctx.fillStyle = '#ff6868';
        ctx.shadowColor = '#ff2f5e';
        ctx.shadowBlur = 12;
        for (const b of bossBullets) {
            ctx.fillRect(b.x, b.y, b.w, b.h);
        }
        ctx.shadowBlur = 0;
    }

    // Mensajes
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (gameOver) {
        ctx.fillStyle = '#ffb0a0';
        ctx.shadowColor = '#ff4f4f';
        ctx.shadowBlur = 24;
        ctx.fillText('💀 GAME OVER', CW/2, CH/2 - 20);
        ctx.shadowBlur = 0;
    } else if (winFlag) {
        ctx.fillStyle = '#f5e56b';
        ctx.shadowColor = '#ffd966';
        ctx.shadowBlur = 30;
        ctx.fillText('🏆 ¡JEFE DERROTADO!', CW/2, CH/2 - 20);
        ctx.shadowBlur = 0;
    }

    ctx.font = '12px monospace';
    ctx.fillStyle = '#617e9e';
    ctx.fillText('←  →', CW-60, CH-16);
}

// Helper para rectángulos redondeados
CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (r > w/2) r = w/2;
    if (r > h/2) r = h/2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
};

// ---- LOOP PRINCIPAL ----
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ---- CONTROLES TECLADO ----
function handleKeyDown(e) {
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'Left') {
        leftPressed = true;
        moveX = -1;
        e.preventDefault();
    } else if (key === 'ArrowRight' || key === 'Right') {
        rightPressed = true;
        moveX = 1;
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'Left') {
        leftPressed = false;
        if (rightPressed) moveX = 1;
        else moveX = 0;
        e.preventDefault();
    } else if (key === 'ArrowRight' || key === 'Right') {
        rightPressed = false;
        if (leftPressed) moveX = -1;
        else moveX = 0;
        e.preventDefault();
    }
}

// ---- CONTROLES MÓVIL ----
function handleTouchStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const canvasX = (touch.clientX - rect.left) * (CW / rect.width);
    if (canvasX < player.x + player.w/2) {
        moveX = -1;
        leftPressed = true;
        rightPressed = false;
    } else {
        moveX = 1;
        rightPressed = true;
        leftPressed = false;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const canvasX = (touch.clientX - rect.left) * (CW / rect.width);
    if (canvasX < player.x + player.w/2) {
        moveX = -1;
        leftPressed = true;
        rightPressed = false;
    } else {
        moveX = 1;
        rightPressed = true;
        leftPressed = false;
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    moveX = 0;
    leftPressed = false;
    rightPressed = false;
}

// ---- EVENTOS ----
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.getElementById('resetBtn').addEventListener('click', resetGame);

// ---- INICIO ----
initEnemies();
updateScore();
gameLoop();