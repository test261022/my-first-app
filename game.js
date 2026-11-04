(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const overlay = document.querySelector("#overlay");
  const title = document.querySelector("#overlay-title");
  const message = document.querySelector("#overlay-message");
  const startButton = document.querySelector("#start-button");
  const livesDisplay = document.querySelector("#lives");
  const gemsDisplay = document.querySelector("#gems");
  const scoreDisplay = document.querySelector("#score");
  const progressDisplay = document.querySelector("#progress");
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const WORLD_WIDTH = 2600;
  const FLOOR_Y = 465;
  const GRAVITY = 1500;
  const GEM_SCORE = 100;
  const ENEMY_SCORE = 200;
  const CLEAR_BONUS = 500;
  const keys = new Set();
  const platforms = [
    { x: 0, y: FLOOR_Y, w: 670, h: 100 },
    { x: 760, y: FLOOR_Y, w: 555, h: 100 },
    { x: 1410, y: FLOOR_Y, w: 520, h: 100 },
    { x: 2020, y: FLOOR_Y, w: 580, h: 100 },
    { x: 260, y: 365, w: 150, h: 18 },
    { x: 510, y: 305, w: 130, h: 18 },
    { x: 840, y: 355, w: 150, h: 18 },
    { x: 1080, y: 295, w: 140, h: 18 },
    { x: 1490, y: 355, w: 145, h: 18 },
    { x: 1740, y: 300, w: 140, h: 18 },
    { x: 2110, y: 355, w: 145, h: 18 },
    { x: 2350, y: 295, w: 140, h: 18 }
  ];
  const gemSpots = [
    [320, 330], [565, 270], [900, 320], [1145, 260], [1550, 320],
    [1790, 265], [2160, 320], [2400, 260], [705, 420], [1335, 420], [1950, 420]
  ];
  const enemySpots = [
    { x: 450, min: 420, max: 610 }, { x: 955, min: 790, max: 1240 },
    { x: 1655, min: 1450, max: 1880 }, { x: 2220, min: 2070, max: 2500 }
  ];

  let player;
  let gems;
  let enemies;
  let fireballs;
  let cameraX = 0;
  let score = 0;
  let gemsCollected = 0;
  let lives = 3;
  let gameState = "ready";
  let lastTime = 0;
  let attackTime = 0;
  let invulnerableTime = 0;
  let animationTime = 0;

  function resetGame() {
    player = { x: 70, y: FLOOR_Y - 42, w: 28, h: 42, vx: 0, vy: 0, grounded: true, facing: 1 };
    gems = gemSpots.map(([x, y]) => ({ x, y, collected: false, phase: Math.random() * 6 }));
    enemies = enemySpots.map((enemy) => ({ ...enemy, x: enemy.x, y: FLOOR_Y - 31, w: 34, h: 31, vx: 35, alive: true }));
    fireballs = [];
    cameraX = 0;
    score = 0;
    gemsCollected = 0;
    lives = 3;
    attackTime = 0;
    invulnerableTime = 0;
    updateHud();
  }

  function updateHud() {
    livesDisplay.textContent = `${"♥ ".repeat(lives).trim()}${lives < 3 ? ` ${"♡ ".repeat(3 - lives).trim()}` : ""}`;
    gemsDisplay.textContent = String(gemsCollected);
    scoreDisplay.textContent = String(score);
    progressDisplay.textContent = String(Math.min(100, Math.floor((player.x / (WORLD_WIDTH - 100)) * 100)));
  }

  function showOverlay(heading, text, buttonText) {
    title.textContent = heading;
    message.textContent = text;
    startButton.innerHTML = `${buttonText} <span aria-hidden="true">→</span>`;
    overlay.classList.remove("hidden");
  }

  function startGame() {
    if (gameState === "ready" || gameState === "won" || gameState === "lost") resetGame();
    gameState = "playing";
    overlay.classList.add("hidden");
    lastTime = performance.now();
  }

  function endGame(won) {
    gameState = won ? "won" : "lost";
    const earnedClearBonus = won && lives === 3;
    if (won && earnedClearBonus) score += CLEAR_BONUS;
    updateHud();
    const result = won
      ? `スコア ${score} 点！宝石 ${gemsCollected} 個${earnedClearBonus ? "。ノーダメージボーナス +500点！" : "。おめでとう！"}`
      : `スコア ${score} 点。あきらめないで。もう一度、谷を冒険しよう。`;
    showOverlay(won ? "冒険クリア！" : "もう一度チャレンジ", result, won ? "もう一度遊ぶ" : "リトライ");
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function attack() {
    if (gameState !== "playing" || attackTime > 0) return;
    attackTime = 0.22;
    const direction = player.facing;
    fireballs.push({
      x: direction > 0 ? player.x + player.w + 8 : player.x - 8,
      y: player.y + player.h * 0.55,
      r: 9,
      vx: direction * 360,
      vy: -180,
      life: 4
    });
  }

  function hurt() {
    if (invulnerableTime > 0) return;
    lives--;
    invulnerableTime = 1.4;
    player.vy = -430;
    player.vx = -player.facing * 190;
    if (lives <= 0) endGame(false);
    updateHud();
  }

  function update(dt) {
    animationTime += dt;
    if (gameState !== "playing") return;
    attackTime = Math.max(0, attackTime - dt);
    invulnerableTime = Math.max(0, invulnerableTime - dt);

    for (let i = fireballs.length - 1; i >= 0; i--) {
      const fireball = fireballs[i];
      const previousY = fireball.y;
      fireball.x += fireball.vx * dt;
      fireball.vy += 850 * dt;
      fireball.y += fireball.vy * dt;
      fireball.life -= dt;

      for (const platform of platforms) {
        const crossedTop = previousY + fireball.r <= platform.y && fireball.y + fireball.r >= platform.y;
        const horizontalOverlap = fireball.x + fireball.r > platform.x && fireball.x - fireball.r < platform.x + platform.w;
        if (fireball.vy > 0 && crossedTop && horizontalOverlap) {
          fireball.y = platform.y - fireball.r;
          fireball.vy = -300;
        }
      }

      const fireballHitbox = {
        x: fireball.x - fireball.r,
        y: fireball.y - fireball.r,
        w: fireball.r * 2,
        h: fireball.r * 2
      };
      const hitEnemy = enemies.find((enemy) => enemy.alive && overlaps(fireballHitbox, enemy));
      if (hitEnemy) {
        hitEnemy.alive = false;
        score += ENEMY_SCORE;
        fireballs.splice(i, 1);
        continue;
      }

      if (fireball.life <= 0 || fireball.x < 0 || fireball.x > WORLD_WIDTH || fireball.y > HEIGHT + fireball.r) {
        fireballs.splice(i, 1);
      }
    }

    const left = keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("left");
    const right = keys.has("ArrowRight") || keys.has("KeyD") || keys.has("right");
    const jump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW") || keys.has("jump");
    const speed = 260;
    player.vx = (right ? speed : 0) - (left ? speed : 0);
    if (player.vx) player.facing = Math.sign(player.vx);
    if (jump && player.grounded) {
      player.vy = -570;
      player.grounded = false;
    }

    const previousBottom = player.y + player.h;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x + player.vx * dt));
    player.vy = Math.min(900, player.vy + GRAVITY * dt);
    player.y += player.vy * dt;
    player.grounded = false;

    for (const platform of platforms) {
      const crossedTop = previousBottom <= platform.y + 8 && player.y + player.h >= platform.y;
      const horizontalOverlap = player.x + player.w > platform.x && player.x < platform.x + platform.w;
      if (player.vy >= 0 && crossedTop && horizontalOverlap) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.grounded = true;
      }
    }

    for (const gem of gems) {
      if (!gem.collected && overlaps(player, { x: gem.x - 12, y: gem.y - 12, w: 24, h: 24 })) {
        gem.collected = true;
        gemsCollected++;
        score += GEM_SCORE;
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.vx * dt;
      if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) enemy.vx *= -1;
      if (!overlaps(player, enemy)) continue;
      if (player.vy > 80 && previousBottom <= enemy.y + 12) {
        enemy.alive = false;
        score += ENEMY_SCORE;
        player.vy = -390;
        player.grounded = false;
      } else {
        hurt();
      }
    }

    if (player.y > HEIGHT + 100) {
      lives--;
      updateHud();
      if (lives <= 0) {
        endGame(false);
        return;
      }
      player.x = Math.max(35, cameraX + 45);
      player.y = FLOOR_Y - player.h;
      player.vy = 0;
      player.grounded = true;
      invulnerableTime = 1.4;
    }

    if (player.x >= WORLD_WIDTH - 105) {
      endGame(true);
      return;
    }
    cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * 0.36));
    updateHud();
  }

  function rectPath(x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.closePath();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#10152b");
    sky.addColorStop(0.58, "#25365c");
    sky.addColorStop(1, "#67466f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 48; i++) {
      const x = ((i * 197 + 49 - cameraX * 0.12) % (WIDTH + 30) + WIDTH + 30) % (WIDTH + 30);
      const y = (i * 83 + 22) % 250;
      ctx.globalAlpha = 0.35 + Math.sin(animationTime * 2 + i) * 0.2;
      ctx.fillStyle = i % 5 === 0 ? "#69f0dc" : "#fff3c7";
      if (i % 7 === 0) {
        ctx.fillRect(x - 2, y, 5, 1);
        ctx.fillRect(x, y - 2, 1, 5);
      } else {
        ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
      }
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffd166";
    ctx.fillRect(744 - cameraX * 0.08, 96, 32, 32);
    ctx.fillStyle = "#fff3c7";
    ctx.fillRect(752 - cameraX * 0.08, 104, 8, 8);
    drawHills(315, "#34436c", 0.12, 125);
    drawHills(370, "#252f55", 0.22, 100);
    drawHills(425, "#1a2140", 0.34, 70);
  }

  function drawHills(y, color, parallax, height) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    for (let x = -100; x <= WIDTH + 100; x += 70) {
      const worldX = x + cameraX * parallax;
      const hillY = y - Math.sin(worldX * 0.004) * height - Math.cos(worldX * 0.009) * height * 0.28;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  function drawWorld() {
    ctx.save();
    ctx.translate(-cameraX, 0);
    for (const platform of platforms) {
      ctx.fillStyle = "#252f55";
      rectPath(platform.x, platform.y, platform.w, platform.h);
      ctx.fill();
      ctx.fillStyle = "#69f0dc";
      ctx.fillRect(platform.x, platform.y, platform.w, 6);
      ctx.fillStyle = "#465477";
      for (let x = platform.x + 20; x < platform.x + platform.w - 8; x += 38) {
        ctx.fillRect(x, platform.y + 22 + (x % 3) * 9, 5, 5);
      }
      ctx.fillStyle = "rgba(7, 15, 30, .32)";
      ctx.fillRect(platform.x + 8, platform.y + 12, Math.max(0, platform.w - 16), 2);
    }

    gems.forEach((gem) => {
      if (gem.collected) return;
      const y = gem.y + Math.sin(animationTime * 3 + gem.phase) * 4;
      ctx.fillStyle = "#69f0dc";
      ctx.fillRect(gem.x - 3, y - 10, 6, 20);
      ctx.fillRect(gem.x - 7, y - 6, 14, 12);
      ctx.fillStyle = "#fff3c7";
      ctx.fillRect(gem.x - 2, y - 6, 3, 5);
    });

    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      ctx.fillStyle = "#c34f78";
      rectPath(enemy.x + 2, enemy.y + 10, enemy.w - 4, enemy.h - 10);
      ctx.fill();
      ctx.fillStyle = "#ff91a9";
      ctx.beginPath();
      ctx.moveTo(enemy.x + 7, enemy.y + 10);
      ctx.lineTo(enemy.x + 5, enemy.y + 1);
      ctx.lineTo(enemy.x + 15, enemy.y + 7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(enemy.x + 27, enemy.y + 10);
      ctx.lineTo(enemy.x + 29, enemy.y + 1);
      ctx.lineTo(enemy.x + 19, enemy.y + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff91a9";
      ctx.fillRect(enemy.x + 9, enemy.y + 5, 16, 8);
      ctx.fillStyle = "#252f55";
      ctx.fillRect(enemy.x + 11, enemy.y + 10, 2, 4);
      ctx.fillRect(enemy.x + 22, enemy.y + 10, 2, 4);
      ctx.fillStyle = "#fff3c7";
      ctx.fillRect(enemy.x + 10, enemy.y + 17, 14, 4);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(enemy.x + 7, enemy.y + enemy.h - 3, 8, 5);
      ctx.fillRect(enemy.x + 20, enemy.y + enemy.h - 3, 8, 5);
    });

    fireballs.forEach((fireball) => {
      ctx.fillStyle = "#ff7096";
      ctx.fillRect(fireball.x - fireball.r, fireball.y - fireball.r, fireball.r * 2, fireball.r * 2);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(fireball.x - 3, fireball.y - 3, 6, 6);
    });

    const goalX = WORLD_WIDTH - 90;
    ctx.fillStyle = "#fff3c7";
    ctx.fillRect(goalX, FLOOR_Y - 175, 6, 175);
    ctx.fillStyle = "#ff7096";
    ctx.fillRect(goalX + 6, FLOOR_Y - 173, 48, 16);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(goalX + 6, FLOOR_Y - 157, 36, 16);

    drawPlayer();
    ctx.restore();
  }

  function drawPlayer() {
    if (invulnerableTime > 0 && Math.floor(animationTime * 12) % 2 === 0) return;
    const bob = player.grounded && Math.abs(player.vx) > 0 ? Math.sin(animationTime * 17) * 2 : 0;
    const x = player.x;
    const y = player.y + bob;
    ctx.fillStyle = "rgba(16, 21, 43, .5)";
    ctx.fillRect(x - 2, y + player.h + 1, 34, 5);
    ctx.fillStyle = "#252f55";
    rectPath(x + 2, y + 15, 25, 25);
    ctx.fill();
    ctx.fillStyle = "#69f0dc";
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 20);
    ctx.lineTo(x + 15, y + 34);
    ctx.lineTo(x + 25, y + 20);
    ctx.lineTo(x + 23, y + 38);
    ctx.lineTo(x + 7, y + 38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff3c7";
    ctx.fillRect(x + 5, y + 2, 20, 17);
    ctx.fillStyle = "#465477";
    ctx.fillRect(x + 5, y + 2, 20, 7);
    ctx.fillStyle = "#10152b";
    ctx.fillRect(x + (player.facing > 0 ? 18 : 9), y + 11, 3, 4);
    ctx.fillStyle = "#fff3c7";
    ctx.fillRect(x + 4, y + 36, 9, 7);
    ctx.fillRect(x + 17, y + 36, 9, 7);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x + 4, y + 40, 10, 4);
    ctx.fillRect(x + 17, y + 40, 10, 4);
    ctx.fillStyle = "#e7ffff";
    ctx.fillRect(x + (player.facing > 0 ? 7 : 20), y + 24, 4, 2);
  }

  function draw() {
    drawBackground();
    drawWorld();
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000 || 0, 0.033);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function keyDown(event) {
    const key = event.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === "Enter" && gameState !== "playing") startGame();
    if ((key === "KeyX" || key === "KeyJ") && !event.repeat) attack();
  }

  function keyUp(event) {
    keys.delete(event.code);
  }

  startButton.addEventListener("click", startGame);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", () => keys.clear());

  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const press = (event) => {
      event.preventDefault();
      keys.add(control);
      button.classList.add("pressed");
      if (control === "attack") attack();
    };
    const release = (event) => {
      event.preventDefault();
      keys.delete(control);
      button.classList.remove("pressed");
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });

  resetGame();
  showOverlay("月あかりの谷へ", "宝石を集めながら、ゴールの旗を目指そう。", "冒険をはじめる");
  requestAnimationFrame(frame);
})();
