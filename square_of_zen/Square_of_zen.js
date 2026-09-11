let canvas;
let context;


let heartImage
let heartImageLoaded = false;  

function setHeartImage(src) {
    heartImageLoaded = false;
    heartImage = new Image();
    heartImage.onload = () => { heartImageLoaded = true; };
    heartImage.src = src;
  }

let fpsInterval = 1000 / 60;
let now;
let then = Date.now();
let request_id;



let enemies = [];
let player = {
  x: 700,
  y: 350,
  size: 10,
  xChange: 2,
  yChange: 2,
};
let heart = {
  x: 700,
  y: 350,
  size: 60,
  health: 5,
};

let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

let isBoosting = false;
let boostVx = 0;
let boostVy = 0;
let boostDecay = 0.95;
let boostThreshold = 0.5;
let hookLine = null;

let killCount = 0;
let startTime;
let gameOver = false

document.addEventListener("DOMContentLoaded", init, false);

function init() {
  canvas = document.querySelector("canvas");
  context = canvas.getContext("2d");

  // load default heart image (can be overridden externally)
  setHeartImage('heart.png');

  window.addEventListener("keydown", activate, false);
  window.addEventListener("keyup", deactivate, false);
  canvas.addEventListener("click", handleBoost, false);

  killCount = 0;
  startTime = Date.now();

  setInterval(() => {
    if (enemies.length < 5) {
      spawnEnemy();
    }
  }, 2000);

  draw();
}

function handleBoost(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const dx = clickX - (player.x + player.size / 2);
  const dy = clickY - (player.y + player.size / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 0) {
    boostVx = (dx / dist) * 12;
    boostVy = (dy / dist) * 12;
    isBoosting = true
    hookLine = {
      x1: player.x + player.size / 2,
      y1: player.y + player.size / 2,
      x2: clickX,
      y2: clickY,
    };
    setTimeout(() => { hookLine = null; }, 50)
  }
}

function spawnEnemy() {
  let edge = Math.floor(Math.random() * 4);
  let x, y;

  if (edge === 0) {
    x = randint(0, canvas.width);
    y = 0;
  } else if (edge === 1) {
    x = randint(0, canvas.width);
    y = canvas.height;
  } else if (edge === 2) {
    x = 0;
    y = randint(0, canvas.height);
  } else {
    x = canvas.width;
    y = randint(0, canvas.height);
  }

  const target = { x: heart.x, y: heart.y };
  const dx = target.x - x;
  const dy = target.y - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = 2;

  let a = {
    x,
    y,
    size: randint(25, 35),
    xChange: (dx / dist) * speed,
    yChange: (dy / dist) * speed,
    arrived: false,
    attackCooldown: 0,
  }

  enemies.push(a);
}

function draw() {
  request_id = window.requestAnimationFrame(draw);

  now = Date.now();
  let elapsed = now - then;
  if (elapsed < fpsInterval) return;
  then = now - (elapsed % fpsInterval)

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (heartImageLoaded) {
    context.drawImage(
      heartImage,
      heart.x, heart.y,
      heart.size, heart.size
    );
  } else {
    context.fillStyle = "brown";
    context.fillRect(heart.x, heart.y, heart.size, heart.size)
  }

  context.fillStyle = "white";
  context.font = "20px Arial";
  context.fillText("Patience: " + heart.health, 20, 30);
  context.fillText("Vanished distracting thoughts: " + killCount, 20, 55);
  const timeSurvived = ((Date.now() - startTime) / 1000).toFixed(1);
  context.fillText("Time: " + timeSurvived + "s", 20, 80);

  context.fillStyle = "cyan";
  context.fillRect(player.x, player.y, player.size, player.size)

  if (hookLine) {
    context.strokeStyle = "white";
    context.beginPath();
    context.moveTo(hookLine.x1, hookLine.y1);
    context.lineTo(hookLine.x2, hookLine.y2);
    context.stroke();
  }

  context.fillStyle = "black";
  for (let a of enemies) {
    context.fillRect(a.x, a.y, a.size, a.size);
  }

  for (let a of enemies) {
    if (!a.arrived) {
      const dx = heart.x + heart.size / 2 - (a.x + a.size / 2);
      const dy = heart.y + heart.size / 2 - (a.y + a.size / 2)
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 25) {
        a.arrived = true;
      } else {
        a.x += a.xChange;
        a.y += a.yChange;
      }
    } else {
      a.attackCooldown -= elapsed;
      if (a.attackCooldown <= 0) {
        heart.health -= 1;
        a.attackCooldown = 1000;
      }
    }
  }

  if (moveRight) { player.x += player.xChange; }
  if (moveLeft)  { player.x -= player.xChange; }
  if (moveUp) { player.y -= player.yChange; }
  if (moveDown) { player.y += player.yChange; }

  if (isBoosting) {
    player.x += boostVx;
    player.y += boostVy;
    boostVx *= boostDecay;
    boostVy *= boostDecay;
    if (Math.abs(boostVx) < boostThreshold && Math.abs(boostVy) < boostThreshold) {
      isBoosting = false;
    }
  }

  for (let a of enemies) {
    if (collides(player, a)) {
      const ex = a.xChange;
      const ey = a.yChange;
      const px = (player.x + player.size / 2) - (a.x + a.size / 2);
      const py = (player.y + player.size / 2) - (a.y + a.size / 2);
      const diagonal = Math.sqrt(px * px + py * py);
      const dx = px / diagonal;
      const dy = py / diagonal;
      const dot = ex * dx + ey * dy;

      if (isBoosting && dot < 0) {
        enemies.splice(enemies.indexOf(a), 1);
        killCount++;
      } else {
        gameOver = true;
      }
    }
  }

  if (heart.health <= 0) {
    gameOver = true;
  }

  if (gameOver) {
    const reason = heart.health <= 0
      ? "💔 Heart interrupted! "
      : "🤯 WRONG ANGLE OR METHOD! ";
    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    stop(`${reason} <br> Vanished thoughts: ${killCount} <br> Time: ${time}s`)
    return;
  }
}

function randint(min, max) {
  return Math.round(Math.random() * (max - min)) + min;
}

function activate(e) {
  let key = e.key;
  if ("wasd".includes(key)) e.preventDefault();
  if (key === "a") moveLeft = true;
  else if (key === "d") moveRight = true;
  else if (key === "w") moveUp = true;
  else if (key === "s") moveDown = true;
}

function deactivate(e) {
  let key = e.key;
  if (key === "a") moveLeft = false;
  else if (key === "d") moveRight = false;
  else if (key === "w") moveUp = false;
  else if (key === "s") moveDown = false;
}

function collides(obj1, obj2) {
  return !( 
    obj1.x + obj1.size < obj2.x ||
    obj1.x > obj2.x + obj2.size ||
    obj1.y + obj1.size < obj2.y ||
    obj1.y > obj2.y + obj2.size
  )
}

function stop(outcome_txt) {
  window.removeEventListener("keydown", activate);
  window.removeEventListener("keyup", deactivate);
  window.cancelAnimationFrame(request_id);

  let outcome_element = document.querySelector("#outcome");
  let retry_button = document.querySelector("#retry-button");
  let jump_button = document.querySelector("#jump-button");

  if (outcome_element) {
    outcome_element.innerHTML = outcome_txt;
    outcome_element.style.display = "block";
  }

  retry_button.style.display = "block";
  jump_button.style.display = "block";

  retry_button.onclick = function() {
    window.location.reload()
  }

  jump_button.onclick = function() {
    window.location.href = "index.html";
  }
}
