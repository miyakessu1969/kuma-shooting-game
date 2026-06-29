const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");

const W = canvas.width;
const H = canvas.height;

const bg = new Image();
bg.src = "assets/kuma_izakaya_bg.jpeg";

const bigDendenImg = new Image();
bigDendenImg.src = "assets/big_denden_cutout.png";

const kumaManagerImg = new Image();
kumaManagerImg.src = "assets/kuma_manager_cutout.png";

const thatsTeacherImg = new Image();
thatsTeacherImg.src = "assets/thats_teacher_cutout.png";

let running = false;
let keys = {};
let bullets = [];
let enemies = [];
let particles = [];
let coins = [];
let ufo = null;
let nextUfoAt = 0;
let score = 0;
let highScore = Number(localStorage.getItem("kumaHighScore") || 0);
let lives = 3;
let continues = 1;
let continueMode = false;
let continueUntil = 0;
let bites = 0;
let shield = 0;
let stage = 1;
let enemyCount = 1;
let speedLevel = 1;
let lastShot = 0;
let lastTime = 0;
let playerSurprisedUntil = 0;
let bonusMessageUntil = 0;
let bonusMessageText = "";
let bonusBossMode = false;
let clearedStage10 = false;
let finalBossMode = false;
let kumaManagerMode = false;
let kumaManagerUntil = 0;
let kumaEndingPhase = 0;
let secondGolgoY = -120;
let doubleGolgoMode = false;
let doubleGolgoUntil = 0;
let teacherMode = false;
let teacherUntil = 0;
let uraBossMode = false;
let shakeUntil = 0;
let shakePower = 0;
let flashUntil = 0;
let audioCtx = null;

const player = { x: W / 2, y: H - 82, speed: 260 };

function resetGame() {
  running = true;
  keys = {};
  bullets = [];
  enemies = [];
  particles = [];
  coins = [];
  ufo = null;
  score = 0;
  bites = 0;
  lives = 3;
  continues = 1;
  continueMode = false;
  shield = 0;
  stage = 1;
  enemyCount = 1;
  speedLevel = 1;
  bonusBossMode = false;
  clearedStage10 = false;
  finalBossMode = false;
  kumaManagerMode = false;
  kumaManagerUntil = 0;
  kumaEndingPhase = 0;
  secondGolgoY = -120;
  doubleGolgoMode = false;
  doubleGolgoUntil = 0;
  teacherMode = false;
  teacherUntil = 0;
  uraBossMode = false;
  playerSurprisedUntil = 0;
  bonusMessageUntil = 0;
  bonusMessageText = "";
  shakeUntil = 0;
  shakePower = 0;
  flashUntil = 0;
  player.x = W / 2;
  scheduleNextUfo(true);
  spawnWave();
}


let bgmOsc = null;
let bgmGain = null;
let currentBgm = "";

function ensureAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
}

function playTone(freq = 440, duration = 0.08, type = "square", volume = 0.05) {
  try {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playGunSound() { playTone(760, 0.055, "square", doubleGolgoMode ? 0.07 : 0.05); }
function playBearSound() { playTone(95, 0.18, "sawtooth", 0.07); }
function playCoinSound() { playTone(950, 0.08, "triangle", 0.06); setTimeout(() => playTone(1250, 0.08, "triangle", 0.05), 70); }
function playPowerSound() { playTone(420, 0.11, "triangle", 0.06); setTimeout(() => playTone(760, 0.11, "triangle", 0.06), 90); }

function startBgm(mode = "normal") {
  try {
    ensureAudio();
    if (currentBgm === mode && bgmOsc) return;
    stopBgm();
    currentBgm = mode;
    bgmOsc = audioCtx.createOscillator();
    bgmGain = audioCtx.createGain();
    bgmOsc.type = mode === "boss" || mode === "ura" ? "sawtooth" : "triangle";
    const freq = mode === "ura" ? 72 : mode === "boss" ? 105 : mode === "teacher" ? 392 : 196;
    bgmOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    bgmGain.gain.setValueAtTime(mode === "teacher" ? 0.035 : 0.025, audioCtx.currentTime);
    bgmOsc.connect(bgmGain);
    bgmGain.connect(audioCtx.destination);
    bgmOsc.start();
  } catch (e) {}
}

function stopBgm() {
  try {
    if (bgmOsc) {
      bgmOsc.stop();
      bgmOsc.disconnect();
    }
  } catch (e) {}
  bgmOsc = null;
  bgmGain = null;
  currentBgm = "";
}

function updateBgm() {
  if (teacherMode) startBgm("teacher");
  else if (bonusBossMode || finalBossMode) startBgm("boss");
  else if (uraBossMode) startBgm("ura");
  else startBgm("normal");
}


function speak(text) {
  try {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 1.08;
      u.pitch = 1.25;
      u.volume = 1;
      speechSynthesis.speak(u);
    }
  } catch (e) {}
}

function playExplosionSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, audioCtx.currentTime + 0.45);
    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.48);
  } catch (e) {}
}

function startShake(power = 10, ms = 450) {
  shakePower = power;
  shakeUntil = performance.now() + ms;
}

function scheduleNextUfo(first = false) {
  nextUfoAt = performance.now() + (first ? 8000 : 30000 + Math.random() * 30000);
}

function spawnUfo() {
  const fromLeft = Math.random() < 0.5;
  ufo = {
    x: fromLeft ? -70 : W + 70,
    y: 34,
    vx: fromLeft ? 145 + Math.random() * 50 : -(145 + Math.random() * 50),
    r: 30,
    points: 100 + Math.floor(Math.random() * 5) * 100
  };
  scheduleNextUfo(false);
}

function makeEnemy(x, y, clusterId = null, isBonus = false) {
  return {
    type: "bear",
    x, y,
    r: 34,
    hp: 2 + Math.floor(speedLevel / 3),
    speed: 48 + speedLevel * 9 + Math.floor((stage - 1) / 5) * 13 + Math.random() * 18,
    sway: Math.random() * 100,
    hitUntil: 0,
    burnUntil: 0,
    clusterId,
    isBonus,
    countedForBonus: false
  };
}

function makeUraBoss() {
  return {
    type: "ura",
    x: W / 2,
    y: -140,
    r: 92,
    hp: 100,
    maxHp: 100,
    speed: 24,
    sway: 0,
    hitUntil: 0,
    burnUntil: 0,
    laserCooldown: performance.now() + 1300,
    summonCooldown: performance.now() + 2600
  };
}

function makeBigDenden(isFinal = false) {
  return {
    type: "denden",
    x: W / 2,
    y: -105,
    r: isFinal ? 82 : 64,
    hp: isFinal ? 30 : 15,
    maxHp: isFinal ? 30 : 15,
    speed: isFinal ? 30 : 38 + Math.floor(stage / 5) * 4,
    sway: 0,
    hitUntil: 0,
    burnUntil: 0,
    laserCooldown: performance.now() + 1800,
    isFinal
  };
}

function spawnWave() {
  enemies = [];

  if (bonusBossMode) {
    enemies.push(makeBigDenden(false));
    bonusMessageText = "ボーナスステージ!! ビッグデンデン登場";
    bonusMessageUntil = performance.now() + 2200;
    speak("一時間無料、八百円！");
    return;
  }

  if (finalBossMode) {
    enemies.push(makeBigDenden(true));
    bonusMessageText = "ラスボス!! 超ビッグデンデン";
    bonusMessageUntil = performance.now() + 2400;
    speak("まだ終わらんぞ！");
    return;
  }

  if (uraBossMode) {
    enemies.push(makeUraBoss());
    bonusMessageText = "ステージ50 裏ボス!! 魔王クマ店長";
    bonusMessageUntil = performance.now() + 2600;
    speak("ここからが本番ですわー！");
    return;
  }

  if (stage % 5 === 0) {
    const clusterSize = stage >= 10 ? 3 : 2;
    const startX = W / 2 - (clusterSize - 1) * 38;
    const clusterId = `cluster-${stage}`;
    for (let i = 0; i < clusterSize; i++) {
      const e = makeEnemy(startX + i * 76, -85 - i * 16, clusterId, true);
      e.speed += 10;
      enemies.push(e);
    }
    bonusMessageText = clusterSize === 3 ? "熊3匹のかたまり!!" : "熊2匹のかたまり!!";
    bonusMessageUntil = performance.now() + 1800;
    return;
  }

  for (let i = 0; i < enemyCount; i++) {
    enemies.push(makeEnemy(
      55 + i * ((W - 110) / Math.max(1, enemyCount - 1 || 1)),
      -80 - i * 34
    ));
  }
}



function startTeacherCongratulations() {
  teacherMode = true;
  teacherUntil = performance.now() + 6500;
  enemies = [];
  bullets = [];
  ufo = null;

  bonusMessageText = "ザッツ先生からの最終評価!!";
  bonusMessageUntil = performance.now() + 2600;
  startShake(7, 500);
  flashUntil = performance.now() + 420;
  speak("あなたは、すでにTOEIC九百レベルです。コングラチュレーションズ！");
}

function startKumaManagerEnding() {
  kumaManagerMode = true;
  kumaEndingPhase = 1; // 1: クマ店長降参、2: もう一人のゴルゴ降下、3: 合体、4: ダブルゴルゴ完成
  kumaManagerUntil = performance.now() + 8200;
  secondGolgoY = -120;
  doubleGolgoMode = false;
  doubleGolgoUntil = 0;

  enemies = [];
  bullets = [];
  ufo = null;

  bonusMessageText = "クマ店長、降参しますわー！";
  bonusMessageUntil = performance.now() + 3200;
  startShake(10, 650);
  flashUntil = performance.now() + 420;
  speak("降参しますわー！");
}

function nextWave() {
  if (bonusBossMode || finalBossMode || uraBossMode) {
    bonusBossMode = false;
    finalBossMode = false;
    uraBossMode = false;
    clearedStage10 = true;
    stage = stage === 10 ? 11 : stage + 1;
    enemyCount = 1;
    speedLevel++;
    spawnWave();
    return;
  }

  if (stage === 10 && !clearedStage10) {
    bonusBossMode = true;
    spawnWave();
    return;
  }

  if (stage === 20) {
    startKumaManagerEnding();
    return;
  }

  if (stage === 30) {
    startTeacherCongratulations();
    return;
  }

  if (stage === 50) {
    uraBossMode = true;
    spawnWave();
    return;
  }

  stage++;
  enemyCount++;
  if (enemyCount > 5) {
    enemyCount = 1;
    speedLevel++;
  }
  spawnWave();
}

function shoot() {
  const now = performance.now();
  if (now - lastShot < 160) return;
  lastShot = now;
  playGunSound();

  if (doubleGolgoMode) {
    // ダブルゴルゴ時は通常の2倍＝4発同時発射
    bullets.push({ x: player.x - 26, y: player.y - 36, vy: -560 });
    bullets.push({ x: player.x - 10, y: player.y - 42, vy: -585 });
    bullets.push({ x: player.x + 10, y: player.y - 42, vy: -585 });
    bullets.push({ x: player.x + 26, y: player.y - 36, vy: -560 });

    makeParticles(player.x, player.y - 42, "#7ee7ff", 4);
  } else {
    bullets.push({ x: player.x - 10, y: player.y - 36, vy: -560 });
    bullets.push({ x: player.x + 10, y: player.y - 36, vy: -560 });
  }
}


function resetCanvasState() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1;
}

function drawBackground() {
  resetCanvasState();

  if (bg.complete && bg.naturalWidth > 0) {
    // 背景は薄くしすぎず、青みが乗らないよう暖色で表示
    ctx.globalAlpha = 0.55;
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // 青いフィルターを廃止。居酒屋らしい茶色〜黒の暖色オーバーレイに変更。
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(18, 9, 4, 0.38)");
  g.addColorStop(0.55, "rgba(72, 37, 12, 0.28)");
  g.addColorStop(1, "rgba(8, 4, 2, 0.70)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#3a1b08";
  ctx.fillRect(0, H - 80, W, 80);

  ctx.fillStyle = "#f0c06a";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("居酒屋 熊街道", 20, 42);

  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`SCORE ${String(score).padStart(5, "0")}`, 20, 72);
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(`HIGH ${String(highScore).padStart(5, "0")}`, 20, 118);
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(bonusBossMode ? "BONUS" : finalBossMode ? "BOSS" : `STAGE ${stage}`, W - 125, 42);
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(`熊速度 +${Math.floor((stage - 1) / 5)}`, W - 125, 61);

  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "#ffd37a";
  ctx.fillText("噛まれた回数", W - 150, 82);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < bites ? "#d84524" : "#523018";
    ctx.beginPath();
    ctx.arc(W - 120 + i * 34, 108, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ff5a5a";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("残機 " + "❤️".repeat(Math.max(0, lives)), 20, 98);

  if (shield > 0) {
    ctx.fillStyle = "#7ee7ff";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`お守り ${shield}`, 20, 138);
  }

  if (performance.now() < bonusMessageUntil) drawCenterMessage(bonusMessageText);

  // 念押しで描画状態を通常に戻す
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.shadowBlur = 0;
}


function drawCenterMessage(text) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.68)";
  ctx.beginPath();
  ctx.roundRect(24, 126, W - 48, 70, 14);
  ctx.fill();
  ctx.strokeStyle = "#ffd37a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#ffdd48";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  wrapText(text, W / 2, 156, W - 70, 24);
  ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const chars = text.split("");
  let line = "";
  let yy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function drawUfo() {
  if (!ufo) return;
  ctx.save();
  ctx.translate(ufo.x, ufo.y);
  ctx.shadowColor = "#7ee7ff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#b9c5c8";
  ctx.beginPath(); ctx.ellipse(0, 0, 44, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7ee7ff";
  ctx.beginPath(); ctx.ellipse(0, -9, 21, 16, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffdd48";
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 18, 4, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#fff3b0";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${ufo.points}`, 0, 27);
  ctx.restore();
}

function drawOneGolgo(offsetX = 0, offsetY = 0, label = "ゴルゴ", scale = 1) {
  const surprised = performance.now() < playerSurprisedUntil;

  ctx.save();
  ctx.translate(player.x + offsetX, player.y + offsetY);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#171717";
  ctx.beginPath(); ctx.roundRect(-22, -10, 44, 54, 12); ctx.fill();

  ctx.fillStyle = surprised ? "#e8b47a" : "#d2a06a";
  ctx.beginPath(); ctx.arc(0, -24, 20, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(0, -32, 19, Math.PI, Math.PI * 2); ctx.fill();

  if (surprised) {
    ctx.fillStyle = "#111"; ctx.fillRect(-18, -42, 36, 5);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-9, -26, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -26, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(-9, -26, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -26, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b0904";
    ctx.beginPath(); ctx.arc(0, -13, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7ee7ff";
    ctx.beginPath(); ctx.ellipse(20, -18, 4, 9, -0.4, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = "#050505";
    ctx.fillRect(-17, -28, 14, 8);
    ctx.fillRect(3, -28, 14, 8);
    ctx.fillRect(-3, -25, 6, 2);
  }

  ctx.strokeStyle = "#1d1d1d";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-18, 2); ctx.lineTo(-36, -24);
  ctx.moveTo(18, 2); ctx.lineTo(36, -24);
  ctx.stroke();

  ctx.fillStyle = "#050505";
  ctx.fillRect(-43, -33, 10, 22);
  ctx.fillRect(33, -33, 10, 22);

  ctx.fillStyle = "#ffd37a";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(label, -18, 38);
  ctx.restore();
}

function drawPlayer() {
  if (doubleGolgoMode) {
    drawOneGolgo(-18, 0, "ゴルゴ", 0.95);
    drawOneGolgo(22, 0, "ゴルゴ", 0.95);

    ctx.save();
    ctx.fillStyle = "#ffdd48";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DOUBLE FIRE", player.x + 2, player.y - 70);
    ctx.restore();
  } else {
    drawOneGolgo(0, 0, "ゴルゴ", 1);
  }
}


function drawBear(e) {
  const now = performance.now();
  const surprised = now < e.hitUntil;
  const burning = now < e.burnUntil;
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.isBonus) {
    ctx.save();
    ctx.globalAlpha = 0.45 + Math.sin(now / 120) * 0.15;
    ctx.strokeStyle = "#ffdd48";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, e.r + 9, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (burning) drawFlamesAround(e.r);

  ctx.fillStyle = surprised ? "#9a5b1f" : "#5a3517";
  ctx.beginPath(); ctx.arc(-23, -24, 13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(23, -24, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = surprised ? "#a36328" : "#7a4b22";
  ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = e.isBonus ? "#ffe06e" : "#f4e8d4";
  ctx.fillRect(-30, -28, 60, 9);
  ctx.fillStyle = "#111";
  ctx.font = "bold 8px sans-serif";
  ctx.fillText(e.isBonus ? "賞金熊" : "熊街道", -14, -20);

  if (surprised) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-12, -5, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -5, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(-12, -5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(0, 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b0904"; ctx.beginPath(); ctx.ellipse(0, 22, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffe06e"; ctx.font = "bold 16px sans-serif"; ctx.fillText("ギャッ!", -28, -42);
  } else {
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(-12, -4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(0, 7, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d23a22"; ctx.beginPath(); ctx.arc(0, 20, 11, 0, Math.PI); ctx.fill();
  }

  ctx.strokeStyle = "#f0dfc7";
  ctx.lineWidth = 3;
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sx * (26 + i * 4), 15);
      ctx.lineTo(sx * (39 + i * 4), 26);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBigDenden(e) {
  const now = performance.now();
  const surprised = now < e.hitUntil;
  ctx.save();
  ctx.translate(e.x, e.y);

  if (now < e.burnUntil) drawFlamesAround(e.r);

  ctx.save();
  ctx.globalAlpha = 0.38 + Math.sin(now / 100) * 0.15;
  ctx.strokeStyle = e.isFinal ? "#ff3434" : "#ffdd48";
  ctx.lineWidth = e.isFinal ? 12 : 9;
  ctx.beginPath(); ctx.arc(0, 0, e.r + 12, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  if (bigDendenImg.complete && bigDendenImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.clip();
    // 顔の中心を大きめに切り抜く
    const sx = bigDendenImg.naturalWidth * 0.02;
    const sy = bigDendenImg.naturalHeight * 0.33;
    const sw = bigDendenImg.naturalWidth * 0.78;
    const sh = bigDendenImg.naturalHeight * 0.40;
    ctx.drawImage(bigDendenImg, sx, sy, sw, sh, -e.r, -e.r, e.r * 2, e.r * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = "#8d4e1c";
    ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
  }

  if (surprised) {
    ctx.fillStyle = "rgba(255,255,255,.86)";
    ctx.beginPath(); ctx.arc(-20, -8, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -8, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(-20, -8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b0904";
    ctx.beginPath(); ctx.ellipse(0, 27, 18, 23, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = "#ffdd48";
  ctx.beginPath();
  ctx.moveTo(-32, -58);
  ctx.lineTo(-18, -82);
  ctx.lineTo(0, -60);
  ctx.lineTo(18, -82);
  ctx.lineTo(32, -58);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5c3200"; ctx.lineWidth = 3; ctx.stroke();

  ctx.fillStyle = "#fff3b0";
  ctx.font = e.isFinal ? "bold 17px sans-serif" : "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(e.isFinal ? "ラスボス デンデン" : "ビッグデンデン", 0, -94);

  // セリフ吹き出し
  if (bonusBossMode || e.isFinal || surprised) {
    ctx.fillStyle = "rgba(255,245,210,.94)";
    ctx.beginPath();
    ctx.roundRect(-112, -152, 224, 38, 12);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(e.isFinal ? "レーザー無料じゃないぞ!" : "1時間無料800円!", 0, -127);
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(`HP ${e.hp}/${e.maxHp}`, 0, e.r + 26);

  ctx.fillStyle = "#351909";
  ctx.fillRect(-58, e.r + 38, 116, 10);
  ctx.fillStyle = e.isFinal ? "#ff3434" : "#ffdd48";
  ctx.fillRect(-58, e.r + 38, 116 * (e.hp / e.maxHp), 10);

  ctx.restore();
}


function drawUraBoss(e) {
  const now = performance.now();
  const surprised = now < e.hitUntil;
  ctx.save();
  ctx.translate(e.x, e.y);

  if (now < e.burnUntil) drawFlamesAround(e.r);

  ctx.save();
  ctx.globalAlpha = 0.35 + Math.sin(now / 80) * 0.12;
  ctx.strokeStyle = "#ff2020";
  ctx.lineWidth = 16;
  ctx.beginPath(); ctx.arc(0, 0, e.r + 16, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  ctx.fillStyle = surprised ? "#9c3b16" : "#52200d";
  ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#1a0500";
  ctx.beginPath(); ctx.arc(-28, -14, 13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(28, -14, 13, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#ffdd48";
  ctx.beginPath(); ctx.arc(-28, -14, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(28, -14, 5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(0, 10, 16, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#ff3434";
  ctx.beginPath(); ctx.ellipse(0, 42, 40, 18, 0, 0, Math.PI); ctx.fill();

  ctx.fillStyle = "#fff3b0";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("裏ボス 魔王クマ店長", 0, -112);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(`HP ${e.hp}/${e.maxHp}`, 0, e.r + 26);

  ctx.fillStyle = "#351909";
  ctx.fillRect(-78, e.r + 38, 156, 12);
  ctx.fillStyle = "#ff3434";
  ctx.fillRect(-78, e.r + 38, 156 * (e.hp / e.maxHp), 12);

  ctx.restore();
}


function drawEnemy(e) { e.type === "denden" ? drawBigDenden(e) : e.type === "ura" ? drawUraBoss(e) : drawBear(e); }

function drawFlamesAround(r) {
  const now = performance.now() / 100;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const flicker = Math.sin(now + i) * 5;
    const x = Math.cos(a) * (r + 8 + flicker);
    const y = Math.sin(a) * (r + 5 + flicker);
    const h = 24 + Math.random() * 7;
    ctx.fillStyle = i % 2 ? "#ffdd48" : "#f05b2d";
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.quadraticCurveTo(x - 12, y - 5, x, y + 10);
    ctx.quadraticCurveTo(x + 12, y - 5, x, y - h);
    ctx.fill();
  }
}

function spawnCoins(x, y, n = 24) {
  for (let i = 0; i < n; i++) {
    coins.push({
      x, y,
      vx: (Math.random() - .5) * 260,
      vy: -120 - Math.random() * 190,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - .5) * 10,
      life: 0.45 + Math.random() * 0.35
    });
  }
}

function drawCoins(dt) {
  coins.forEach(c => {
    c.vy += 420 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.spin * dt;
    c.life -= dt;
  });
  coins = coins.filter(c => c.life > 0);
  coins.forEach(c => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.life / 0.8);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = "#ffdd48";
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8a5a00"; ctx.stroke();
    ctx.fillStyle = "#8a5a00";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("800", 0, 3);
    ctx.restore();
  });
}

function checkBonusClear(defeatedEnemy) {
  if (!defeatedEnemy.isBonus || defeatedEnemy.countedForBonus) return;
  defeatedEnemy.countedForBonus = true;
  const sameClusterLeft = enemies.some(e => e.clusterId === defeatedEnemy.clusterId && e !== defeatedEnemy);
  if (!sameClusterLeft) {
    const bonus = stage >= 10 ? 1500 : 800;
    score += bonus;
    bonusMessageText = `かたまり撃破 +${bonus}点!!`;
    bonusMessageUntil = performance.now() + 1800;
    makeParticles(W / 2, H / 2, "#ffdd48", 60);
  }
}

function handleBite(e) {
  playerSurprisedUntil = performance.now() + 650;
  makeParticles(player.x, player.y - 20, "#d84524", 18);
  makeParticles(player.x, player.y - 45, "#7ee7ff", 8);

  if (shield > 0) {
    shield--;
    bonusMessageText = "お守り発動！噛まれてもセーフ";
    bonusMessageUntil = performance.now() + 1500;
  } else {
    bites++;
    lives = Math.max(0, 3 - bites);
    playBearSound();
  }

  e.y = (e.type === "denden" || e.type === "ura") ? -130 : -80;
  e.x = (e.type === "denden" || e.type === "ura") ? W / 2 : 40 + Math.random() * (W - 80);
  if (bites >= 3) gameOver();
}


function uraBossAttack(e) {
  const now = performance.now();
  if (now > e.laserCooldown) {
    e.laserCooldown = now + 1700;
    const laserX = e.x + (Math.random() - .5) * 150;
    startShake(7, 250);
    bonusMessageText = "裏ボスレーザー!!";
    bonusMessageUntil = now + 700;
    makeParticles(laserX, H / 2, "#ff3434", 38);
    if (Math.abs(player.x - laserX) < 48) handleBite(e);
  }
  if (now > e.summonCooldown) {
    e.summonCooldown = now + 4200;
    for (let i = 0; i < 2; i++) {
      const b = makeEnemy(80 + Math.random() * (W - 160), -80 - i * 60, null, false);
      b.speed += 35;
      enemies.push(b);
    }
    bonusMessageText = "魔王クマ店長が熊を召喚!!";
    bonusMessageUntil = now + 900;
    playBearSound();
  }
}


function finalBossLaser(e) {
  if (!e.isFinal) return;
  const now = performance.now();
  if (now < e.laserCooldown) return;
  e.laserCooldown = now + 2300;
  startShake(5, 250);
  bonusMessageText = "デンデンレーザー!!";
  bonusMessageUntil = now + 900;
  const laserX = e.x + (Math.random() - .5) * 100;
  makeParticles(laserX, H / 2, "#ff3434", 28);
  if (Math.abs(player.x - laserX) < 42) handleBite(e);
}

function update(dt) {
  if (teacherMode) {
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    particles = particles.filter(p => p.life > 0);

    if (performance.now() > teacherUntil) {
      // 先生イベント後：ゴルゴは一人に戻り、熊の速さも初期状態に戻る
      teacherMode = false;
      doubleGolgoMode = false;
      stage = 31;
      enemyCount = 1;
      speedLevel = 1;
      spawnWave();

      bonusMessageText = "ゴルゴは一人に戻った。熊の速さもリセット!";
      bonusMessageUntil = performance.now() + 2200;
    }
    return;
  }

  if (kumaManagerMode) {
    const now = performance.now();

    // フェーズ進行
    const remaining = kumaManagerUntil - now;
    if (remaining < 5800 && kumaEndingPhase === 1) {
      kumaEndingPhase = 2;
      bonusMessageText = "もう一人のゴルゴが上から降りてきた!!";
      bonusMessageUntil = now + 2200;
      speak("ヒューン！");
    }
    if (remaining < 3800 && kumaEndingPhase === 2) {
      kumaEndingPhase = 3;
      bonusMessageText = "合体ッ!!";
      bonusMessageUntil = now + 1600;
      startShake(14, 520);
      flashUntil = now + 360;
      speak("合体！");
    }
    if (remaining < 2600 && kumaEndingPhase === 3) {
      kumaEndingPhase = 4;
      doubleGolgoMode = true;
      doubleGolgoUntil = now + 2600;
      bonusMessageText = "ダブルゴルゴ誕生!!";
      bonusMessageUntil = now + 2400;
      speak("ダブルゴルゴ！");
      makeParticles(player.x, player.y - 45, "#7ee7ff", 60);
      makeParticles(player.x, player.y - 45, "#ffdd48", 60);
    }

    if (kumaEndingPhase >= 2 && secondGolgoY < player.y - 55) {
      secondGolgoY += 230 * dt;
    }

    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    particles = particles.filter(p => p.life > 0);

    coins.forEach(c => {
      c.vy += 420 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.spin * dt;
      c.life -= dt;
    });
    coins = coins.filter(c => c.life > 0);

    if (now > kumaManagerUntil) {
      kumaManagerMode = false;
      doubleGolgoMode = true;
      stage = 21;
      enemyCount = 1;
      speedLevel++;
      spawnWave();
    }
    return;
  }

  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed * dt;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed * dt;
  if (keys[" "] || keys["Enter"]) shoot();
  player.x = Math.max(35, Math.min(W - 35, player.x));

  if (!ufo && performance.now() > nextUfoAt) spawnUfo();
  if (ufo) {
    ufo.x += ufo.vx * dt;
    if (ufo.x < -95 || ufo.x > W + 95) ufo = null;
  }

  bullets.forEach(b => b.y += b.vy * dt);
  bullets = bullets.filter(b => b.y > -30);

  enemies.forEach(e => {
    e.sway += dt * 3;
    const swayPower = e.type === "denden" ? 55 : (e.isBonus ? 25 : 45);
    e.y += e.speed * dt;
    e.x += Math.sin(e.sway) * swayPower * dt;
    if (e.type === "denden") finalBossLaser(e);
    if (e.type === "ura") uraBossAttack(e);
    const biteLine = (e.type === "denden" || e.type === "ura") ? player.y - 55 : player.y - 35;
    if (e.y > biteLine) handleBite(e);
  });

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];

    if (ufo) {
      const dxu = b.x - ufo.x, dyu = b.y - ufo.y;
      if (Math.hypot(dxu, dyu) < ufo.r + 8) {
        bullets.splice(bi, 1);
        score += ufo.points;
        bonusMessageText = `UFO撃墜 +${ufo.points}点!!`;
        bonusMessageUntil = performance.now() + 1500;
        startShake(4, 260);
        playExplosionSound();
        makeParticles(ufo.x, ufo.y, "#7ee7ff", 30);
        makeParticles(ufo.x, ufo.y, "#ffdd48", 45);
        makeParticles(ufo.x, ufo.y, "#f05b2d", 35);
        ufo = null;
        continue;
      }
    }

    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      const dx = b.x - e.x, dy = b.y - e.y;
      if (Math.hypot(dx, dy) < e.r) {
        bullets.splice(bi, 1);
        e.hp--;
        e.hitUntil = performance.now() + 480;
        e.burnUntil = performance.now() + 650;
        makeParticles(e.x, e.y, "#ffd37a", 14);
        makeParticles(e.x, e.y + 8, "#f05b2d", 20);

        if (e.hp <= 0) {
          if (e.type === "ura") {
            score += 10000;
            bonusMessageText = "裏ボス撃破!! PERFECT BONUS 10000!!";
            bonusMessageUntil = performance.now() + 3200;
            speak("参りましたわー！");
            playExplosionSound();
            playCoinSound();
            startShake(22, 900);
            flashUntil = performance.now() + 500;
            spawnCoins(e.x, e.y, 60);
            makeParticles(e.x, e.y, "#ff3434", 140);
            makeParticles(e.x, e.y, "#ffdd48", 140);
          } else if (e.type === "denden") {
            const bonus = e.isFinal ? 3000 : 800;
            score += bonus;
            if (!e.isFinal) shield++;
            bonusMessageText = e.isFinal ? "PERFECT BONUS 3000!! ラスボス撃破!!" : "PERFECT BONUS 800!!『1時間無料800円！』";
            bonusMessageUntil = performance.now() + 2600;
            speak(e.isFinal ? "参りました！" : "一時間無料、八百円！");
            playExplosionSound();
            startShake(e.isFinal ? 16 : 12, 650);
            flashUntil = performance.now() + 350;
            spawnCoins(e.x, e.y, e.isFinal ? 42 : 28);
            makeParticles(e.x, e.y, "#ffdd48", 100);
            makeParticles(e.x, e.y, "#f05b2d", 90);
          } else {
            score += e.isBonus ? 180 * speedLevel : 100 * speedLevel;
            makeParticles(e.x, e.y, "#ffdd48", 28);
            makeParticles(e.x, e.y, "#f05b2d", 36);
          }
          const defeated = e;
          enemies.splice(ei, 1);
          if (defeated.type !== "denden" && defeated.type !== "ura") checkBonusClear(defeated);
        }
        break;
      }
    }
  }

  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  });
  particles = particles.filter(p => p.life > 0);

  if (enemies.length === 0) nextWave();
}

function drawLaserWarnings() {
  const boss = enemies.find(e => e.type === "denden" && e.isFinal);
  if (!boss) return;
  const timeLeft = boss.laserCooldown - performance.now();
  if (timeLeft < 500 && timeLeft > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#ff3434";
    ctx.fillRect(boss.x - 4, 0, 8, H);
    ctx.restore();
  }
}


function drawKumaManagerEnding() {
  if (!kumaManagerMode) return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.58)";
  ctx.fillRect(0, 0, W, H);

  const now = performance.now();
  const bow = kumaEndingPhase === 1 ? Math.min(0.42, (now % 900) / 900 * 0.42) : 0.18;
  const pulse = 1 + Math.sin(now / 160) * 0.025;

  ctx.save();
  ctx.translate(W / 2, 230);
  ctx.scale(pulse, pulse);
  ctx.rotate(bow);

  ctx.save();
  ctx.shadowColor = "#ffdd48";
  ctx.shadowBlur = 28;

  if (kumaManagerImg.complete && kumaManagerImg.naturalWidth > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(kumaManagerImg, -150, -150, 300, 300);
  } else {
    ctx.fillStyle = "#7a4b22";
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();

  // クマ店長のセリフ
  ctx.save();
  ctx.fillStyle = "rgba(255,245,210,.96)";
  ctx.beginPath();
  ctx.roundRect(42, 378, W - 84, 58, 16);
  ctx.fill();
  ctx.strokeStyle = "#5c3200";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#8b1400";
  ctx.font = "bold 25px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("降参しますわー！", W / 2, 415);
  ctx.restore();

  // もう一人のゴルゴが上から降りる
  if (kumaEndingPhase >= 2 && kumaEndingPhase < 4) {
    ctx.save();
    ctx.fillStyle = "#fff3b0";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("もう一人のゴルゴが上から降りてきた!", W / 2, 470);
    ctx.restore();

    const oldY = player.y;
    player.y = secondGolgoY;
    drawOneGolgo(0, 0, "ゴルゴ2", 1);
    player.y = oldY;

    // 降下ライン
    ctx.save();
    ctx.strokeStyle = "#7ee7ff";
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(player.x, 0);
    ctx.lineTo(player.x, secondGolgoY - 40);
    ctx.stroke();
    ctx.restore();
  }

  // 合体演出
  if (kumaEndingPhase === 3) {
    ctx.save();
    ctx.fillStyle = "#ffdd48";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#7ee7ff";
    ctx.shadowBlur = 18;
    ctx.fillText("合体ッ!!", W / 2, 520);
    ctx.restore();
  }

  // ダブルゴルゴ完成
  if (kumaEndingPhase >= 4) {
    ctx.save();
    ctx.fillStyle = "#ffdd48";
    ctx.font = "bold 35px sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#7ee7ff";
    ctx.shadowBlur = 18;
    ctx.fillText("ダブルゴルゴ誕生!!", W / 2, 505);
    ctx.restore();

    drawPlayer();
  }

  ctx.restore();
}



function drawTeacherCongratulations() {
  if (!teacherMode) return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.60)";
  ctx.fillRect(0, 0, W, H);

  const pulse = 1 + Math.sin(performance.now() / 180) * 0.025;

  ctx.save();
  ctx.translate(W / 2, 235);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "#ffdd48";
  ctx.shadowBlur = 28;

  if (thatsTeacherImg.complete && thatsTeacherImg.naturalWidth > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, 155, 0, Math.PI * 2);
    ctx.clip();

    // 添付画像の顔中心を大きく表示
    const sx = thatsTeacherImg.naturalWidth * 0.16;
    const sy = thatsTeacherImg.naturalHeight * 0.17;
    const sw = thatsTeacherImg.naturalWidth * 0.68;
    const sh = thatsTeacherImg.naturalHeight * 0.58;
    ctx.drawImage(thatsTeacherImg, sx, sy, sw, sh, -155, -155, 310, 310);
  } else {
    ctx.fillStyle = "#d2a06a";
    ctx.beginPath();
    ctx.arc(0, 0, 155, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 吹き出し
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.beginPath();
  ctx.roundRect(28, 405, W - 56, 120, 18);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#111";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("あなたはすでに", W / 2, 442);
  ctx.fillStyle = "#d32116";
  ctx.font = "bold 31px sans-serif";
  ctx.fillText("TOEIC 900レベルです", W / 2, 482);
  ctx.fillStyle = "#111";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("Congratulations!", W / 2, 515);

  ctx.fillStyle = "#ffdd48";
  ctx.font = "bold 25px sans-serif";
  ctx.fillText("STAGE 30 CLEAR!!", W / 2, 585);

  ctx.restore();
}


function draw() {
  resetCanvasState();
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (performance.now() < shakeUntil) {
    const p = shakePower;
    ctx.translate((Math.random() - .5) * p, (Math.random() - .5) * p);
  }

  drawBackground();
  if (teacherMode) {
    drawTeacherCongratulations();
  }
  if (kumaManagerMode) {
    drawKumaManagerEnding();
  }
  if (!teacherMode) drawLaserWarnings();
  if (!kumaManagerMode && !teacherMode) drawUfo();

  bullets.forEach(b => {
    ctx.fillStyle = "#7ee7ff";
    ctx.shadowColor = "#7ee7ff";
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.roundRect(b.x - 3, b.y - 12, 6, 20, 4); ctx.fill();
    ctx.shadowBlur = 0;
  });

  if (!kumaManagerMode && !teacherMode) {
    enemies.forEach(drawEnemy);
    drawPlayer();
  }

  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

  drawCoins(Math.min(0.033, (performance.now() - lastTime) / 1000 || 0));

  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(0, H - 32, W, 32);
  ctx.fillStyle = "#f9e2a9";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("操作：左右キー / A,D / 画面ドラッグ　発射：スペース / タップ", 10, H - 11);

  if (performance.now() < flashUntil) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  resetCanvasState();
}

function makeParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - .5) * 240,
      vy: (Math.random() - .5) * 240,
      size: 2 + Math.random() * 4,
      life: .35 + Math.random() * .65,
      color
    });
  }
}

function gameLoop(t) {
  if (!running) return;
  const dt = Math.min(0.033, (t - lastTime) / 1000 || 0);
  lastTime = t;
  updateBgm();
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("kumaHighScore", String(highScore));
  }

  if (continues > 0) {
    continueMode = true;
    continueUntil = performance.now() + 10000;
    running = false;
    finalScore.innerHTML = `SCORE ${score}<br>HIGH SCORE ${highScore}<br><br>CONTINUE? 残り ${continues}回`;
    gameOverScreen.classList.remove("hidden");
    const restartBtn = document.getElementById("restartBtn");
    restartBtn.textContent = "コンティニュー";
    return;
  }

  stopBgm();
  running = false;
  finalScore.innerHTML = `SCORE ${score}<br>HIGH SCORE ${highScore}` + (score >= highScore ? "<br>NEW RECORD!!" : "");
  gameOverScreen.classList.remove("hidden");
  document.getElementById("restartBtn").textContent = "もう一回";
}

function continueGame() {
  continueMode = false;
  continues--;
  bites = 0;
  lives = 3;
  shield = Math.max(shield, 1);
  gameOverScreen.classList.add("hidden");
  document.getElementById("restartBtn").textContent = "もう一回";
  running = true;
  lastTime = performance.now();
  bonusMessageText = "CONTINUE!! お守り1つサービス";
  bonusMessageUntil = performance.now() + 1800;
  requestAnimationFrame(gameLoop);
}

function start() {
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  ensureAudio();
  resetGame();
  startBgm('normal');
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

document.getElementById("startBtn").addEventListener("click", start);
document.getElementById("restartBtn").addEventListener("click", () => { if (continueMode) continueGame(); else start(); });

window.addEventListener("keydown", e => {
  keys[e.key] = true;
  if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("pointermove", e => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  player.x = (e.clientX - rect.left) * scaleX;
});
canvas.addEventListener("pointerdown", e => {
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  player.x = (e.clientX - rect.left) * scaleX;
  shoot();
});
