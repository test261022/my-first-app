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
  const progressDisplay = document.querySelector("#progress");
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const WORLD_WIDTH = 2600;
  const FLOOR_Y = 465;
  const GRAVITY = 1500;
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
  let cameraX = 0;
  let score = 0;
  let lives = 3;
  let gameState = "ready";
  let lastTime = 0;
  let attackTime = 0;
  let invulnerableTime = 0;
  let animationTime = 0;

  function resetGame() {
    player = { x: 70, y: FLOOR_Y - 42, w: 28, h: 42, vx: 0, vy: 0, grounded: true, facing: 1 };
    gems = gemSpots.map(([x, y]) => ({ x, y, collected: false, phase: Math.random() * 6 }));
    enemies = enemySpots.map((enemy) => ({ ...enemy, x: enemy.x, y: FLOOR_Y - 31, w: 34, h: 31, vx: 48, alive: true }));
    cameraX = 0;
    score = 0;
    lives = 3;
    attackTime = 0;
    invulnerableTime = 0;
    updateHud();
  }

  function updateHud() {
    livesDisplay.textContent = `${"♥ ".repeat(lives).trim()}${lives < 3 ? ` ${"♡ ".repeat(3 - lives).trim()}` : ""}`;
    gemsDisplay.textContent = String(score);
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
    showOverlay(won ? "冒険クリア！" : "もう一度チャレンジ", won ? `宝石を ${score} 個集めたよ。おめでとう！` : "あきらめないで。もう一度、谷を冒険しよう。", won ? "もう一度遊ぶ" : "リトライ");
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function attack() {
    if (gameState !== "playing" || attackTime > 0) return;
    attackTime = 0.22;
    const hit = { x: player.facing > 0 ? player.x + player.w : player.x - 31, y: player.y + 5, w: 31, h: player.h - 7 };
    enemies.forEach((enemy) => {
      if (enemy.alive && overlaps(hit, enemy)) enemy.alive = false;
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
        score++;
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.vx * dt;
      if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) enemy.vx *= -1;
      if (!overlaps(player, enemy)) continue;
      if (player.vy > 80 && previousBottom <= enemy.y + 12) {
        enemy.alive = false;
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

  function roundedRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#182442");
    sky.addColorStop(0.66, "#394367");
    sky.addColorStop(1, "#bd8b8a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 48; i++) {
      const x = ((i * 197 + 49 - cameraX * 0.12) % (WIDTH + 30) + WIDTH + 30) % (WIDTH + 30);
      const y = (i * 83 + 22) % 250;
      ctx.globalAlpha = 0.35 + Math.sin(animationTime * 2 + i) * 0.2;
      ctx.fillStyle = "#fff0ce";
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#efcf9a";
    ctx.beginPath();
    ctx.arc(760 - cameraX * 0.08, 112, 39, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(244, 215, 170, .12)";
    ctx.beginPath();
    ctx.arc(760 - cameraX * 0.08, 112, 59, 0, Math.PI * 2);
    ctx.fill();
    drawHills(340, "#454d70", 0.19, 105);
    drawHills(400, "#303c5d", 0.32, 78);
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
      ctx.fillStyle = platform.y === FLOOR_Y ? "#27354b" : "#34445e";
      roundedRect(platform.x, platform.y, platform.w, platform.h, 6);
      ctx.fill();
      ctx.fillStyle = "#8ab99c";
      roundedRect(platform.x, platform.y, platform.w, 7, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(213, 191, 150, .19)";
      for (let x = platform.x + 20; x < platform.x + platform.w - 8; x += 38) {
        ctx.fillRect(x, platform.y + 24 + (x % 3) * 9, 3, 3);
      }
    }

    gems.forEach((gem) => {
      if (gem.collected) return;
      const y = gem.y + Math.sin(animationTime * 3 + gem.phase) * 4;
      ctx.save();
      ctx.translate(gem.x, y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = "#ffe28a";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#ffe28a";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff6ce";
      ctx.fillRect(-3, -4, 4, 5);
      ctx.restore();
    });

    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      ctx.fillStyle = "#d67981";
      roundedRect(enemy.x, enemy.y + 5, enemy.w, enemy.h - 5, 11);
      ctx.fill();
      ctx.fillStyle = "#f29b98";
      ctx.beginPath();
      ctx.arc(enemy.x + enemy.w / 2, enemy.y + 11, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#302b45";
      ctx.fillRect(enemy.x + 9, enemy.y + 15, 3, 5);
      ctx.fillRect(enemy.x + 22, enemy.y + 15, 3, 5);
      ctx.fillStyle = "#edc18b";
      ctx.fillRect(enemy.x + 8, enemy.y + enemy.h - 2, 7, 4);
      ctx.fillRect(enemy.x + 21, enemy.y + enemy.h - 2, 7, 4);
    });

    const goalX = WORLD_WIDTH - 90;
    ctx.fillStyle = "#ead7ad";
    ctx.fillRect(goalX, FLOOR_Y - 112, 5, 112);
    ctx.fillStyle = "#e98a91";
    ctx.beginPath();
    ctx.moveTo(goalX + 5, FLOOR_Y - 110);
    ctx.lineTo(goalX + 55, FLOOR_Y - 95);
    ctx.lineTo(goalX + 5, FLOOR_Y - 78);
    ctx.closePath();
    ctx.fill();

    drawPlayer();
    ctx.restore();
  }

  function drawPlayer() {
    if (invulnerableTime > 0 && Math.floor(animationTime * 12) % 2 === 0) return;
    const bob = player.grounded && Math.abs(player.vx) > 0 ? Math.sin(animationTime * 17) * 2 : 0;
    const x = player.x;
    const y = player.y + bob;
    ctx.fillStyle = "rgba(16, 22, 37, .28)";
    ctx.beginPath();
    ctx.ellipse(x + 15, y + player.h + 3, 17, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4f536f";
    roundedRect(x + 3, y + 15, 23, 25, 8);
    ctx.fill();
    ctx.fillStyle = "#e5bd98";
    ctx.beginPath();
    ctx.arc(x + 15, y + 11, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#695a76";
    ctx.beginPath();
    ctx.arc(x + 15, y + 8, 11, Math.PI, Math.PI * 2);
    ctx.lineTo(x + 25, y + 12);
    ctx.lineTo(x + 5, y + 12);
    ctx.fill();
    ctx.fillStyle = "#34334c";
    ctx.fillRect(x + (player.facing > 0 ? 18 : 9), y + 11, 3, 4);
    ctx.fillStyle = "#e5bd98";
    ctx.fillRect(x + 4, y + 36, 9, 7);
    ctx.fillRect(x + 17, y + 36, 9, 7);
    ctx.fillStyle = "#e8cb84";
    ctx.fillRect(x + 4, y + 40, 10, 4);
    ctx.fillRect(x + 17, y + 40, 10, 4);
    if (attackTime > 0) {
      ctx.strokeStyle = "rgba(255, 232, 162, .9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      const ax = player.facing > 0 ? x + 34 : x - 9;
      ctx.arc(ax, y + 22, 18, player.facing > 0 ? -1.1 : Math.PI + .1, player.facing > 0 ? 1.1 : Math.PI - .1);
      ctx.stroke();
    }
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
