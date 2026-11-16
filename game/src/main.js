// EMBERFALL — bootstrap, fixed-step loop, state machine, collisions and scoring.
// The game owns one mutable state object; the feature modules (entities, waves,
// upgrades, render, ui) each do one job on it.

import { CONFIG } from './config.js';
import { RNG } from './rng.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import {
  createPlayer,
  updatePlayer,
  createEnemy,
  updateEnemy,
  updateBullets,
  updatePickups,
  updateParticles,
  updateTexts,
  spawnPickup,
  spawnExplosion,
  addShake,
  addText,
} from './entities.js';
import { startWave, updateSpawning, waveIsCleared } from './waves.js';
import { defaultMods, rollUpgrades } from './upgrades.js';
import { drawGame } from './render.js';
import { createUI } from './ui.js';
import { applyShot } from './shots.js';

const BEST_KEY = 'emberfall-best';
const MUTE_KEY = 'emberfall-muted';

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode: best score just does not persist.
  }
}

function createGame(canvas, ctx) {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed')) || 1;
  const shot = params.get('shot');
  return {
    canvas,
    ctx,
    rng: new RNG(seed),
    input: new Input(canvas),
    audio: new AudioEngine(),
    state: 'title', // title | playing | upgrade | paused | gameover | victory
    shotMode: shot,
    frozen: false, // screenshot states freeze after setup
    time: 0,
    wave: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    embers: 0,
    kills: 0,
    best: readBest(),
    player: null,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    pickups: [],
    texts: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    waveCleared: false,
    betweenWaveTimer: 0,
    boss: null,
    shake: { t: 0, mag: 0 },
    hurtFlash: 0,
    takenCounts: {},
    pendingUpgrades: [],
    muted: (() => {
      try {
        return window.localStorage.getItem(MUTE_KEY) === '1';
      } catch {
        return false;
      }
    })(),
  };
}

// ---- Scoring ----------------------------------------------------------------

function comboMultiplier(game) {
  return Math.min(CONFIG.COMBO_MAX, 1 + game.combo * CONFIG.COMBO_STEP);
}

function addScore(game, base, x, y) {
  const gained = Math.round(base * comboMultiplier(game));
  game.score += gained;
  if (x !== undefined) {
    addText(game, x, y, `+${gained}`, '#ffe66d', gained >= 200 ? 20 : 15);
  }
  return gained;
}

// ---- Run lifecycle ------------------------------------------------------------

function startRun(game) {
  game.rng = new RNG(game.seed ?? 1);
  game.player = createPlayer(defaultMods());
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.particles = [];
  game.pickups = [];
  game.texts = [];
  game.score = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.embers = 0;
  game.kills = 0;
  game.boss = null;
  game.takenCounts = {};
  game.pendingUpgrades = [];
  game.shake = { t: 0, mag: 0 };
  game.hurtFlash = 0;
  game.state = 'playing';
  game.audio.startMusic();
  startWave(game, 1);
}

function endRun(game, victory) {
  game.state = victory ? 'victory' : 'gameover';
  game.audio.stopMusic();
  if (victory) {
    // Surviving HP is worth something.
    game.score += Math.ceil(game.player.hp) * 5;
    game.audio.victory();
    game.ui.showVictory(game);
  } else {
    game.audio.gameOver();
    game.ui.showGameOver(game);
  }
  if (game.score > game.best) {
    game.best = game.score;
    saveBest(game.score);
  }
}

// ---- Combat -----------------------------------------------------------------

function damagePlayer(game, amount) {
  const p = game.player;
  if (p.invuln > 0 || game.state !== 'playing') return;
  p.hp -= amount;
  p.invuln = CONFIG.CONTACT_IFRAMES;
  game.hurtFlash = 1;
  game.combo = 0;
  game.comboTimer = 0;
  addShake(game, 7);
  game.audio.hurt();
  addText(game, p.x, p.y - 26, `-${amount}`, '#ff4d6d', 18);
  if (p.hp <= 0) {
    p.hp = 0;
    spawnExplosion(game, p.x, p.y, '#ffb347', true);
    endRun(game, false);
  }
}

function killEnemy(game, enemy, index) {
  game.enemies.splice(index, 1);
  game.kills += 1;
  game.combo += 1;
  game.comboTimer = CONFIG.COMBO_WINDOW;
  addScore(game, enemy.score, enemy.x, enemy.y - enemy.r - 6);
  spawnExplosion(game, enemy.x, enemy.y, enemy.glow, enemy.type === 'boss');
  game.audio.explosion(enemy.type === 'boss' || enemy.type === 'splitter');

  // Drops: embers, and sometimes a heart.
  for (let i = 0; i < enemy.embers; i += 1) {
    spawnPickup(game, enemy.x, enemy.y, 'ember');
  }
  if (game.rng.chance(CONFIG.HEART_DROP_CHANCE)) {
    spawnPickup(game, enemy.x, enemy.y, 'heart');
  }

  if (enemy.type === 'splitter') {
    for (let i = 0; i < 2; i += 1) {
      const mini = createEnemy(game, 'mini', enemy.x + game.rng.range(-14, 14), enemy.y + game.rng.range(-14, 14));
      mini.spawnT = 0.25;
      game.enemies.push(mini);
    }
  }
  if (enemy.type === 'boss') {
    game.boss = null;
    addShake(game, 12);
  }
}

function handleCollisions(game) {
  const p = game.player;

  // Player bullets vs enemies.
  for (let bi = game.bullets.length - 1; bi >= 0; bi -= 1) {
    const b = game.bullets[bi];
    let consumed = false;
    for (let ei = game.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = game.enemies[ei];
      if (e.spawnT > 0) continue;
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const rr = b.r + e.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      // Critical hits double the damage and flash gold.
      const crit = game.rng.chance(p.mods.critChance);
      const dmg = b.damage * (crit ? 2 : 1);
      e.hp -= dmg;
      e.flash = 0.12;
      addText(game, e.x + game.rng.range(-8, 8), e.y - e.r - 4, String(Math.round(dmg)), crit ? '#ffd166' : '#ffffff', crit ? 19 : 14);
      if (e.hp <= 0) killEnemy(game, e, ei);
      if (b.pierce > 0) {
        b.pierce -= 1;
      } else {
        consumed = true;
      }
      break; // one enemy per bullet per step
    }
    if (consumed) game.bullets.splice(bi, 1);
  }

  // Enemies touching the player.
  for (let ei = game.enemies.length - 1; ei >= 0; ei -= 1) {
    const e = game.enemies[ei];
    if (e.spawnT > 0) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const rr = p.r + e.r;
    if (dx * dx + dy * dy > rr * rr) continue;
    damagePlayer(game, e.damage);
    // Shove the enemy back so it cannot drain HP in one frame.
    const dist = Math.hypot(dx, dy) || 1;
    e.x -= (dx / dist) * 30;
    e.y -= (dy / dist) * 30;
    if (game.state !== 'playing') return;
  }

  // Enemy bullets vs the player.
  for (let i = game.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = game.enemyBullets[i];
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const rr = p.r + b.r;
    if (dx * dx + dy * dy <= rr * rr) {
      game.enemyBullets.splice(i, 1);
      damagePlayer(game, b.damage);
      if (game.state !== 'playing') return;
    }
  }

  // Pickups vs the player.
  for (let i = game.pickups.length - 1; i >= 0; i -= 1) {
    const pk = game.pickups[i];
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const rr = p.r + pk.r;
    if (dx * dx + dy * dy > rr * rr) continue;
    game.pickups.splice(i, 1);
    if (pk.kind === 'ember') {
      game.embers += 1;
      addScore(game, CONFIG.EMBER_SCORE, pk.x, pk.y - 10);
      game.audio.pickup();
    } else {
      p.hp = Math.min(p.maxHp, p.hp + CONFIG.HEART_HEAL);
      addText(game, pk.x, pk.y - 10, `+${CONFIG.HEART_HEAL} HP`, '#ff4d6d', 16);
      game.audio.heart();
    }
  }
}

// ---- One fixed step -----------------------------------------------------------

function stepGame(game, dt) {
  game.time += dt;
  game.shake.t = Math.max(0, game.shake.t - dt);
  game.hurtFlash = Math.max(0, game.hurtFlash - dt * 2.2);

  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }

  updatePlayer(game, dt);
  updateSpawning(game, dt);
  for (const e of game.enemies) updateEnemy(game, e, dt);
  updateBullets(game, dt);
  updatePickups(game, dt);
  updateParticles(game, dt);
  updateTexts(game, dt);
  handleCollisions(game);

  if (game.state !== 'playing') return;

  // Wave cleared: bonus, then the upgrade choice (or victory after wave 10).
  // Screenshot simulations keep the wave alive so the scene stays mid-fight.
  if (waveIsCleared(game) && !game.waveCleared && !game.shotSim) {
    game.waveCleared = true;
    game.waveActive = false;
    game.score += CONFIG.WAVE_CLEAR_BONUS;
    game.audio.waveClear();
    game.ui.showToast(`WAVE ${game.wave} CLEAR!  +${CONFIG.WAVE_CLEAR_BONUS}`);
    if (game.wave >= CONFIG.TOTAL_WAVES) {
      endRun(game, true);
    } else {
      game.state = 'upgrade';
      game.pendingUpgrades = rollUpgrades(game.rng, game.takenCounts);
      game.ui.showUpgrade(game.pendingUpgrades, (choice) => pickUpgrade(game, choice));
    }
  }
}

function pickUpgrade(game, choice) {
  choice.apply(game.player.mods);
  game.takenCounts[choice.id] = (game.takenCounts[choice.id] ?? 0) + 1;
  if (choice.id === 'maxhp') {
    game.player.maxHp = CONFIG.PLAYER_MAX_HP + game.player.mods.maxHpBonus;
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + CONFIG.HEART_HEAL);
  }
  game.audio.upgrade();
  game.ui.showToast(`UPGRADE: ${choice.name}`);
  game.state = 'playing';
  game.ui.showOnly(null);
  startWave(game, game.wave + 1);
}

// ---- Boot -------------------------------------------------------------------

function resizeCanvas(game) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.min(window.innerWidth / CONFIG.WIDTH, window.innerHeight / CONFIG.HEIGHT);
  const cssW = Math.floor(CONFIG.WIDTH * scale);
  const cssH = Math.floor(CONFIG.HEIGHT * scale);
  game.canvas.style.width = `${cssW}px`;
  game.canvas.style.height = `${cssH}px`;
  game.canvas.width = Math.floor(CONFIG.WIDTH * dpr);
  game.canvas.height = Math.floor(CONFIG.HEIGHT * dpr);
  game.ctx.setTransform(game.canvas.width / CONFIG.WIDTH, 0, 0, game.canvas.height / CONFIG.HEIGHT, 0, 0);
}

function main() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const game = createGame(canvas, ctx);
  game.seed = Number(new URLSearchParams(window.location.search).get('seed')) || 1;
  game.comboMultiplier = () => comboMultiplier(game);
  game.ui = createUI({
    onStart: () => {
      game.audio.unlock();
      startRun(game);
      game.ui.showOnly(null);
    },
    onResume: () => {
      game.state = 'playing';
      game.ui.showOnly(null);
    },
    onRestart: () => {
      game.audio.unlock();
      startRun(game);
      game.ui.showOnly(null);
    },
    onTitle: () => {
      game.state = 'title';
      game.player = createPlayer(defaultMods());
      game.enemies = [];
      game.bullets = [];
      game.enemyBullets = [];
      game.particles = [];
      game.pickups = [];
      game.texts = [];
      game.boss = null;
      game.audio.stopMusic();
      game.ui.showTitle(game.best);
    },
    onMute: () => {
      game.muted = !game.muted;
      game.audio.setMuted(game.muted);
      game.ui.setMuteLabel(game.muted);
      try {
        window.localStorage.setItem(MUTE_KEY, game.muted ? '1' : '0');
      } catch {
        // Ignore.
      }
    },
  });
  game.audio.setMuted(game.muted);
  game.ui.setMuteLabel(game.muted);

  game.input.attach();
  game.player = createPlayer(defaultMods());
  resizeCanvas(game);
  window.addEventListener('resize', () => resizeCanvas(game));

  // Screenshot states (deterministic, seeded) freeze the sim after setup.
  // The shot helpers drive the real step function through these hooks.
  game.__startRun = () => startRun(game);
  game.__step = (dt) => stepGame(game, dt);
  if (game.shotMode) {
    applyShot(game, game.shotMode);
    game.frozen = true;
  } else {
    game.ui.showTitle(game.best);
  }

  // Expose a small handle for automated play-testing (not part of the game UI).
  window.__emberfall = game;

  let last = performance.now();
  let acc = 0;
  let hudTimer = 0;

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    // Global keys, by state.
    const input = game.input;
    if (input.anyGesture) game.audio.unlock();
    if (input.wasPressed('KeyM')) {
      game.muted = !game.muted;
      game.audio.setMuted(game.muted);
      game.ui.setMuteLabel(game.muted);
    }

    if (game.state === 'title') {
      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        game.audio.unlock();
        startRun(game);
        game.ui.showOnly(null);
      }
    } else if (game.state === 'playing') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
        game.state = 'paused';
        game.ui.showPause();
      }
    } else if (game.state === 'upgrade') {
      const keys = ['Digit1', 'Digit2', 'Digit3'];
      keys.forEach((code, i) => {
        if (input.wasPressed(code) && game.pendingUpgrades[i]) {
          pickUpgrade(game, game.pendingUpgrades[i]);
        }
      });
    } else if (game.state === 'paused') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
        game.state = 'playing';
        game.ui.showOnly(null);
      }
    } else if (game.state === 'gameover' || game.state === 'victory') {
      if (input.wasPressed('Enter') || input.wasPressed('KeyR')) {
        game.audio.unlock();
        startRun(game);
        game.ui.showOnly(null);
      }
    }

    // Fixed-step simulation, only while playing and not frozen for a screenshot.
    if (game.state === 'playing' && !game.frozen) {
      acc += dt;
      let guard = 0;
      while (acc >= CONFIG.STEP && guard < 5) {
        stepGame(game, CONFIG.STEP);
        acc -= CONFIG.STEP;
        guard += 1;
        if (game.state !== 'playing') {
          acc = 0;
          break;
        }
      }
      if (guard >= 5) acc = 0;
    } else {
      acc = 0;
      game.shake.t = Math.max(0, game.shake.t - dt);
      game.hurtFlash = Math.max(0, game.hurtFlash - dt * 2.2);
    }

    // Title screen: gentle idle drift of the ship.
    if (game.state === 'title' && game.player) {
      game.time += dt;
      game.player.y = CONFIG.HEIGHT / 2 + Math.sin(game.time * 1.2) * 12;
      game.player.angle = -Math.PI / 2 + Math.sin(game.time * 0.8) * 0.15;
    }

    drawGame(game);
    hudTimer += dt;
    if (hudTimer >= 0.1) {
      hudTimer = 0;
      game.ui.updateHUD(game);
    }
    input.consumeEdges();
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
}

main();
