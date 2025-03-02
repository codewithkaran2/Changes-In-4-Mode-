// MODE SELECTION BUTTON EVENTS
const duoBtn = document.getElementById("duoButton");
const soloBtn = document.getElementById("soloButton");
const trioBtn = document.getElementById("trioButton");
const survivalBtn = document.getElementById("survivalButton"); // NEW for Survival Mode
const p2NameInput = document.getElementById("p2Name");
// Global game mode: "duo", "solo", "trio", or "survival" (default is "duo")
let gameMode = "duo";

duoBtn.addEventListener("click", () => {
  gameMode = "duo";
  duoBtn.style.border = "3px solid white";
  soloBtn.style.border = "none";
  trioBtn.style.border = "none";
  survivalBtn.style.border = "none";
  p2NameInput.disabled = false;
  p2NameInput.placeholder = "Enter 🟥 Player 2 Name";
  p2NameInput.value = "";
});
soloBtn.addEventListener("click", () => {
  gameMode = "solo";
  soloBtn.style.border = "3px solid white";
  duoBtn.style.border = "none";
  trioBtn.style.border = "none";
  survivalBtn.style.border = "none";
  p2NameInput.disabled = true;
  p2NameInput.value = "Computer";
});
trioBtn.addEventListener("click", () => {
  gameMode = "trio";
  trioBtn.style.border = "3px solid white";
  duoBtn.style.border = "none";
  soloBtn.style.border = "none";
  survivalBtn.style.border = "none";
  p2NameInput.disabled = false;
  p2NameInput.placeholder = "Enter 🟥 Player 2 Name";
  p2NameInput.value = "";
});
survivalBtn.addEventListener("click", () => {
  gameMode = "survival";
  survivalBtn.style.border = "3px solid white";
  duoBtn.style.border = "none";
  soloBtn.style.border = "none";
  trioBtn.style.border = "none";
  // In Survival Mode, we use only Player1 – disable player2 input.
  p2NameInput.disabled = true;
  p2NameInput.value = "";
});

// Helper: draw a rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Full screen toggle
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Default names and scores for battle modes
const defaultP1Name = "Player 1";
const defaultP2Name = "Player 2";
let p1Name = defaultP1Name;
let p2Name = defaultP2Name;
let p1Score = 0, p2Score = 0;

const speed = 5;
let gameRunning = false;
let gamePaused = false;

// Audio elements
const bgMusic = document.getElementById("bgMusic");
const shootSound = document.getElementById("shootSound");
const hitSound = document.getElementById("hitSound");
const shieldBreakSound = document.getElementById("shieldBreakSound");

// Volume slider control
const volumeSlider = document.getElementById("volumeSlider");
volumeSlider.addEventListener("input", function() {
  const vol = parseFloat(this.value);
  bgMusic.volume = vol;
  shootSound.volume = vol;
  hitSound.volume = vol;
  shieldBreakSound.volume = vol;
});

// Start background music (triggered on game start)
function startBackgroundMusic() {
  bgMusic.play();
}

// PLAYERS (battle mode definitions)
const player1 = {
  x: 100,
  y: 0, // will be set in startGame (off-screen)
  width: 40,
  height: 40,
  color: "blue",
  health: 100,
  shield: 100,
  shieldActive: false,
  shieldBroken: false,
  canShoot: true,
  lastDir: "right",
  score: 0 // Score for enemy kills in Survival Mode
};
const player2 = {
  x: 600,
  y: 0, // will be set in startGame
  width: 40,
  height: 40,
  color: "red",
  health: 100,
  shield: 100,
  shieldActive: false,
  shieldBroken: false,
  canShoot: true,
  lastDir: "left"
};
// In Trio mode, add a third (computer-controlled) player:
const player3 = {
  x: 1100,
  y: 0, // will be set in startGame
  width: 40,
  height: 40,
  color: "green",
  health: 100,
  shield: 100,
  shieldActive: false,
  shieldBroken: false,
  canShoot: true,
  lastDir: "left"
};

let bullets = [];

// Controls mapping for movement and shield keys
const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
  q: false, m: false, p: false
};

// Update last direction based on key input (for movement)
function updateDirection() {
  if (keys.w) { player1.lastDir = "up"; }
  else if (keys.s) { player1.lastDir = "down"; }
  else if (keys.a) { player1.lastDir = "left"; }
  else if (keys.d) { player1.lastDir = "right"; }
  
  // For duo or trio modes, update player2 direction from arrow keys
  if (gameMode === "duo" || gameMode === "trio") {
    if (keys.ArrowUp) { player2.lastDir = "up"; }
    else if (keys.ArrowDown) { player2.lastDir = "down"; }
    else if (keys.ArrowLeft) { player2.lastDir = "left"; }
    else if (keys.ArrowRight) { player2.lastDir = "right"; }
  }
}

// --- Key events for shooting controls and movement ---
document.addEventListener("keydown", (e) => {
  if (e.key === "CapsLock") { e.preventDefault(); return; }
  
  // Shooting for Player1 (Space)
  if (e.code === "Space") {
    if (player1.canShoot && gameRunning && !gamePaused) {
      shootBullet(player1, 1);
      player1.canShoot = false;
    }
    return;
  }
  // Shooting for Player2 (Enter) if not solo
  if (e.code === "Enter" && gameMode !== "solo") {
    if (player2.canShoot && gameRunning && !gamePaused) {
      shootBullet(player2, 2);
      player2.canShoot = false;
    }
    return;
  }
  
  // Process movement/shield keys
  if (keys.hasOwnProperty(e.key)) {
    if (e.key === "p") { togglePause(); return; }
    keys[e.key] = true;
    updateDirection();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "CapsLock") { e.preventDefault(); return; }
  
  if (e.code === "Space") {
    player1.canShoot = true;
    return;
  }
  if (e.code === "Enter" && gameMode !== "solo") {
    player2.canShoot = true;
    return;
  }
  
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
    updateDirection();
  }
});

// MOVE PLAYERS (with boundaries) for battle modes
function movePlayers() {
  let oldP1 = { x: player1.x, y: player1.y };
  let oldP2 = { x: player2.x, y: player2.y };
  let oldP3 = gameMode === "trio" ? { x: player3.x, y: player3.y } : null;
  
  // Player1 movement
  let dx1 = 0, dy1 = 0;
  if (keys.a && player1.x > 0) dx1 = -speed;
  if (keys.d && player1.x + player1.width < canvas.width) dx1 = speed;
  if (keys.w && player1.y > 0) dy1 = -speed;
  if (keys.s && player1.y + player1.height < canvas.height) dy1 = speed;
  
  // Player2 movement (duo/trio)
  let dx2 = 0, dy2 = 0;
  if (gameMode === "duo" || gameMode === "trio") {
    if (keys.ArrowLeft && player2.x > 0) dx2 = -speed;
    if (keys.ArrowRight && player2.x + player2.width < canvas.width) dx2 = speed;
    if (keys.ArrowUp && player2.y > 0) dy2 = -speed;
    if (keys.ArrowDown && player2.y + player2.height < canvas.height) dy2 = speed;
  }
  
  player1.x += dx1;
  player2.x += dx2;
  if (rectCollision(player1, player2)) {
    player1.x = oldP1.x;
    player2.x = oldP2.x;
  }
  
  player1.y += dy1;
  player2.y += dy2;
  if (rectCollision(player1, player2)) {
    player1.y = oldP1.y;
    player2.y = oldP2.y;
  }
  
  if (gameMode === "solo") {
    updateAI();
    player2.y = Math.max(0, Math.min(player2.y, canvas.height - player2.height));
  }
  
  if (gameMode === "trio") {
    updateAIForPlayer3();
    player3.y = Math.max(0, Math.min(player3.y, canvas.height - player3.height));
    if (rectCollision(player1, player3)) {
      player1.x = oldP1.x;
      player3.x = oldP3.x;
      player1.y = oldP1.y;
      player3.y = oldP3.y;
    }
    if (rectCollision(player2, player3)) {
      player2.x = oldP2.x;
      player3.x = oldP3.x;
      player2.y = oldP2.y;
      player3.y = oldP3.y;
    }
  }
  
  // Shield toggles
  player1.shieldActive = keys.q;
  player2.shieldActive = keys.m;
  updateDirection();
}

/* 
  Revised collision detection function (no extra margin)
*/
function rectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/* 
  AI for Solo mode (Player2)
*/
function updateAI() {
  if (gameMode === "solo") {
    let oldP2x = player2.x;
    let oldP2y = player2.y;
    
    let centerX1 = player1.x + player1.width / 2;
    let centerY1 = player1.y + player1.height / 2;
    let centerX2 = player2.x + player2.width / 2;
    let centerY2 = player2.y + player2.height / 2;
    
    let diffX = centerX1 - centerX2;
    let diffY = centerY1 - centerY2;
    
    let factor = 0.3;
    let moveX = Math.max(-speed, Math.min(speed, diffX * factor));
    let moveY = Math.max(-speed, Math.min(speed, diffY * factor));
    
    player2.x += moveX;
    player2.y += moveY;
    
    if (rectCollision(player1, player2)) {
      player2.x = oldP2x;
      player2.y = oldP2y;
    }
    
    let distance = Math.sqrt(diffX * diffX + diffY * diffY);
    if (distance < 300 && player2.canShoot && gameRunning && !gamePaused) {
      shootBullet(player2, 2);
      player2.canShoot = false;
      setTimeout(() => { player2.canShoot = true; }, 50);
    }
  }
}

/* 
  AI for Trio mode (Player3)
*/
function updateAIForPlayer3() {
  if (gameMode === "trio") {
    let centerX1 = player1.x + player1.width / 2;
    let centerY1 = player1.y + player1.height / 2;
    let centerX2 = player2.x + player2.width / 2;
    let centerY2 = player2.y + player2.height / 2;
    let centerX3 = player3.x + player3.width / 2;
    let centerY3 = player3.y + player3.height / 2;
    
    // Choose the closer human target  
    let dx1 = centerX1 - centerX3;
    let dy1 = centerY1 - centerY3;
    let dx2 = centerX2 - centerX3;
    let dy2 = centerY2 - centerY3;
    let dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    let dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    let target = dist1 < dist2 ? player1 : player2;
    
    let oldP3x = player3.x;
    let oldP3y = player3.y;
    let centerX_target = target.x + target.width / 2;
    let centerY_target = target.y + target.height / 2;
    let diffX = centerX_target - centerX3;
    let diffY = centerY_target - centerY3;
    let factor = 0.3;
    let moveX = Math.max(-speed, Math.min(speed, diffX * factor));
    let moveY = Math.max(-speed, Math.min(speed, diffY * factor));
    player3.x += moveX;
    player3.y += moveY;
    if (rectCollision(player3, target)) {
      player3.x = oldP3x;
      player3.y = oldP3y;
    }
    let distance = Math.sqrt(diffX * diffX + diffY * diffY);
    if (distance < 300 && player3.canShoot && gameRunning && !gamePaused) {
      shootBullet(player3, 3);
      player3.canShoot = false;
      setTimeout(() => { player3.canShoot = true; }, 50);
    }
  }
}

// Helper: Checks if a bullet collides with a player.
function bulletHitsPlayer(bullet, player) {
  return (
    bullet.x >= player.x &&
    bullet.x <= player.x + player.width &&
    bullet.y >= player.y &&
    bullet.y <= player.y + player.height
  );
}

// Draw players on canvas (battle modes)
function drawPlayers() {
  ctx.fillStyle = player1.color;
  ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
  
  ctx.fillStyle = player2.color;
  ctx.fillRect(player2.x, player2.y, player2.width, player2.height);
  
  if (gameMode === "trio") {
    ctx.fillStyle = player3.color;
    ctx.fillRect(player3.x, player3.y, player3.width, player3.height);
  }
}

// --- Drop Animation ---
// Modified so that in Survival Mode only player1 is animated.
function dropAnimation(callback) {
  const dropSpeed = 5; 
  const destinationY = canvas.height / 2 - player1.height / 2;
  function animate() {
    let done = true;
    if (player1.y < destinationY) {
      player1.y += dropSpeed;
      if (player1.y > destinationY) player1.y = destinationY;
      done = false;
    }
    if (gameMode !== "survival") {
      if (gameMode !== "solo") {
        if (player2.y < destinationY) {
          player2.y += dropSpeed;
          if (player2.y > destinationY) player2.y = destinationY;
          done = false;
        }
      }
      if (gameMode === "trio") {
        if (player3.y < destinationY) {
          player3.y += dropSpeed;
          if (player3.y > destinationY) player3.y = destinationY;
          done = false;
        }
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameMode === "survival") {
       ctx.fillStyle = "white";
       ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
    } else {
       drawPlayers();
       // Optionally, draw UI status and controls for battle modes here.
    }
    if (!done) {
      requestAnimationFrame(animate);
    } else {
      callback();
    }
  }
  animate();
}

// Shooting function (unchanged)
function shootBullet(player, playerNum) {
  const bullet = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    speed: 10,
    direction: player.lastDir,
    player: playerNum
  };
  bullets.push(bullet);
  shootSound.currentTime = 0;
  shootSound.play();
}

// Update shields function (unchanged)
function updateShields() {
  const players = [player1, player2];
  if (gameMode === "trio") {
    players.push(player3);
  }
  players.forEach(player => {
    if (player.shieldActive && player.shield > 0) {
      player.shield -= 0.5;
      if (player.shield <= 0) {
        player.shield = 0;
        player.shieldActive = false;
        player.shieldBroken = true;
        shieldBreakSound.currentTime = 0;
        shieldBreakSound.play();
        setTimeout(() => {
          player.shieldBroken = false;
        }, 3000);
      }
    } else if (!player.shieldActive && !player.shieldBroken && player.shield < 100) {
      player.shield += 0.2;
      if (player.shield > 100) player.shield = 100;
    }
  });
}

// --- Check Win Condition (battle modes) ---
function checkWinCondition() {
  if (gameMode === "duo" || gameMode === "solo") {
    if (player1.health <= 0) return p2Name;
    if (player2.health <= 0) return p1Name;
  } else if (gameMode === "trio") {
    let remaining = [];
    if (player1.health > 0) remaining.push({ name: p1Name, health: player1.health });
    if (player2.health > 0) remaining.push({ name: p2Name, health: player2.health });
    if (player3.health > 0) remaining.push({ name: "Computer", health: player3.health });
    if (remaining.length === 1) return remaining[0].name;
  }
  return null;
}

// --- Main Game Loop for battle modes ---
function gameLoop() {
  if (!gameRunning || gamePaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update bullets: move, check collisions, and draw
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    switch(bullet.direction) {
      case "up":    bullet.y -= bullet.speed; break;
      case "down":  bullet.y += bullet.speed; break;
      case "left":  bullet.x -= bullet.speed; break;
      case "right": bullet.x += bullet.speed; break;
    }
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      bullets.splice(i, 1);
      continue;
    }
    // Check collision with Player1 (if bullet wasn't fired by Player1)
    if (bullet.player !== 1 && bulletHitsPlayer(bullet, player1)) {
      player1.health = Math.max(0, player1.health - 10);
      hitSound.currentTime = 0;
      hitSound.play();
      bullets.splice(i, 1);
      continue;
    }
    // Check collision with Player2 (if applicable)
    if (bullet.player !== 2 && bulletHitsPlayer(bullet, player2)) {
      player2.health = Math.max(0, player2.health - 10);
      hitSound.currentTime = 0;
      hitSound.play();
      bullets.splice(i, 1);
      continue;
    }
    // In Trio mode, check collision with Player3
    if (gameMode === "trio" && bullet.player !== 3 && bulletHitsPlayer(bullet, player3)) {
      player3.health = Math.max(0, player3.health - 10);
      hitSound.currentTime = 0;
      hitSound.play();
      bullets.splice(i, 1);
      continue;
    }
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  updateShields();
  drawPlayers();
  movePlayers();
  
  let winner = checkWinCondition();
  if (winner !== null) {
    gameRunning = false;
    document.getElementById("gameOverScreen").classList.remove("hidden");
    document.getElementById("winnerText").innerText = winner + " Wins 🏆!";
    return;
  }
  
  requestAnimationFrame(gameLoop);
}

// --- SURVIVAL MODE FUNCTIONS ---
// Global variables for Survival Mode
let survivalGameRunning = false;
let survivalScore = 0;
let survivalEnemies = [];
let enemySpawnRate = 2000; // in milliseconds
let enemySpeedMultiplier = 1;
let lastSpawnTime = 0;
let lastDifficultyIncrease = 0;
let enemyBullets = []; // For bullets fired by enemies

function startSurvivalMode() {
  // Hide the start screen is already done in startGame.
  survivalGameRunning = true;
  survivalScore = 0;
  survivalEnemies = [];
  enemyBullets = [];
  enemySpawnRate = 2000;
  enemySpeedMultiplier = 1;
  lastSpawnTime = performance.now();
  lastDifficultyIncrease = performance.now();
  
  // Position player1 in the center horizontally and off-screen vertically for a drop animation.
  player1.x = canvas.width / 2 - player1.width / 2;
  player1.y = -player1.height;
  
  // Reset player1 health and score.
  player1.health = 100;
  player1.score = 0;
  
  dropAnimation(() => {
    requestAnimationFrame(survivalGameLoop);
  });
}

function survivalGameLoop(timestamp) {
  if (!survivalGameRunning) return;
  
  if (timestamp - lastSpawnTime >= enemySpawnRate) {
    spawnEnemy();
    lastSpawnTime = timestamp;
  }
  
  if (timestamp - lastDifficultyIncrease >= 10000) {
    enemySpawnRate = Math.max(500, enemySpawnRate - 200);
    enemySpeedMultiplier += 0.2;
    lastDifficultyIncrease = timestamp;
  }
  
  updateSurvivalGame();
  renderSurvivalGame();
  
  requestAnimationFrame(survivalGameLoop);
}

function spawnEnemy() {
  let enemyTypeChance = Math.random();
  let enemy = {
    x: Math.random() * (canvas.width - 40),
    y: -40,
    width: 40,
    height: 40,
    speed: 2 * enemySpeedMultiplier,
    health: 1,
    color: "red",
    lastShot: performance.now(),
    shootInterval: Math.random() * 2000 + 2000 // between 2000 and 4000 ms
  };
  
  if (enemyTypeChance < 0.3) {
    enemy.speed *= 2;
    enemy.color = "yellow";
  } else if (enemyTypeChance < 0.6) {
    enemy.health = 3;
    enemy.color = "blue";
  } else {
    enemy.hasShield = true;
    enemy.color = "purple";
  }
  
  survivalEnemies.push(enemy);
}

function updateSurvivalGame() {
  // First, update player1's bullets to kill enemies.
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    switch(bullet.direction) {
      case "up":    bullet.y -= bullet.speed; break;
      case "down":  bullet.y += bullet.speed; break;
      case "left":  bullet.x -= bullet.speed; break;
      case "right": bullet.x += bullet.speed; break;
    }
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      bullets.splice(i, 1);
      continue;
    }
    // Check collision with each enemy.
    for (let j = survivalEnemies.length - 1; j >= 0; j--) {
      let enemy = survivalEnemies[j];
      if (rectCollision(bullet, enemy)) {
        enemy.health -= 25;
        bullets.splice(i, 1);
        if (enemy.health <= 0) {
          survivalEnemies.splice(j, 1);
          survivalScore++;
          player1.score += 10; // Increase player1's personal score
        }
        break;
      }
    }
  }
  
  let now = performance.now();
  
  // Update enemies and allow them to shoot
  for (let i = survivalEnemies.length - 1; i >= 0; i--) {
    let enemy = survivalEnemies[i];
    enemy.y += enemy.speed;
    
    // Enemy shooting logic
    if (now - enemy.lastShot >= enemy.shootInterval) {
      enemyShoot(enemy);
      enemy.lastShot = now;
      enemy.shootInterval = Math.random() * 2000 + 2000;
    }
    
    // Remove enemy if off-screen
    if (enemy.y > canvas.height) {
      survivalEnemies.splice(i, 1);
      survivalScore++;
      continue;
    }
    
    // Collision between enemy and player1
    if (rectCollision(player1, enemy)) {
      player1.health -= 10;
      survivalEnemies.splice(i, 1);
      hitSound.currentTime = 0;
      hitSound.play();
      if (player1.health <= 0) {
        gameOverSurvival();
      }
    }
  }
  
  // Update enemy bullets with new damage logic:
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let bullet = enemyBullets[i];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      enemyBullets.splice(i, 1);
      continue;
    }
    if (rectCollision(player1, bullet)) {
      // Enemy bullet damages: always subtract 10 from health,
      // and then, if shield exists, subtract 10 from shield as well.
      player1.health -= 10;
      if (player1.shield > 0) {
        player1.shield -= 10;
        if (player1.shield < 0) player1.shield = 0;
      }
      enemyBullets.splice(i, 1);
      hitSound.currentTime = 0;
      hitSound.play();
      if (player1.health <= 0) {
        gameOverSurvival();
      }
    }
  }
  
  // Player1 movement in Survival Mode (WASD keys)
  let dx = 0, dy = 0;
  if (keys.a && player1.x > 0) dx = -speed;
  if (keys.d && player1.x + player1.width < canvas.width) dx = speed;
  if (keys.w && player1.y > 0) dy = -speed;
  if (keys.s && player1.y + player1.height < canvas.height) dy = speed;
  player1.x += dx;
  player1.y += dy;
}

function enemyShoot(enemy) {
  let enemyCenterX = enemy.x + enemy.width / 2;
  let enemyCenterY = enemy.y + enemy.height / 2;
  let playerCenterX = player1.x + player1.width / 2;
  let playerCenterY = player1.y + player1.height / 2;
  let dx = playerCenterX - enemyCenterX;
  let dy = playerCenterY - enemyCenterY;
  let mag = Math.sqrt(dx * dx + dy * dy);
  let bulletSpeed = 5;
  let vx = (dx / mag) * bulletSpeed;
  let vy = (dy / mag) * bulletSpeed;
  
  enemyBullets.push({
    x: enemyCenterX,
    y: enemyCenterY,
    vx: vx,
    vy: vy,
    radius: 5,
    color: "orange"
  });
}

function renderSurvivalGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw player1
  ctx.fillStyle = "white";
  ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
  
  // Draw enemies
  survivalEnemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });
  
  // Draw enemy bullets
  enemyBullets.forEach(bullet => {
    ctx.fillStyle = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Display Score and Health
  ctx.fillStyle = "white";
  ctx.font = "24px Roboto";
  ctx.fillText("Score: " + survivalScore, 20, 40);
  ctx.fillText("Health: " + player1.health, 20, 70);
  ctx.fillText("Kills: " + player1.score, 20, 100);
}

function gameOverSurvival() {
  survivalGameRunning = false;
  document.getElementById("gameOverScreen").classList.remove("hidden");
  document.getElementById("winnerText").innerText = "Game Over! Score: " + survivalScore;
}

// --- Start Game function ---
function startGame() {
  document.getElementById("startScreen").classList.add("hidden");
  if (gameMode === "survival") {
    startBackgroundMusic();
    startSurvivalMode();
    return;
  }
  
  // For other modes, get player names and start as usual.
  const p1Input = document.getElementById("p1Name");
  if (p1Input.value.trim() !== "") p1Name = p1Input.value;
  const p2Input = document.getElementById("p2Name");
  if (p2Input.value.trim() !== "") p2Name = p2Input.value;
  gameRunning = true;
  startBackgroundMusic();
  
  // Set players off-screen for drop animation
  player1.y = -player1.height;
  player2.y = -player2.height;
  if (gameMode === "trio") { player3.y = -player3.height; }
  
  dropAnimation(() => {
    gameLoop();
  });
}

function restartGame() {
  location.reload();
}

function playAgain() {
  restartGame();
}

function togglePause() {
  if (!gameRunning) return;
  gamePaused = !gamePaused;
  const pauseScreen = document.getElementById("pauseScreen");
  if (gamePaused) {
    pauseScreen.classList.remove("hidden");
  } else {
    pauseScreen.classList.add("hidden");
    gameLoop();
  }
}

// Expose functions for HTML onclicks
window.startGame = startGame;
window.restartGame = restartGame;
window.togglePause = togglePause;
window.playAgain = playAgain;
