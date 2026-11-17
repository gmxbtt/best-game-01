// EMBERFALL 3.0 — juice: everything that makes an action FEEL like it
// landed. Screen shake, hit-stop and slow motion, kill bursts, floating
// damage numbers, the ember trail behind a laden ship, and the red vignette
// that closes in while the Heart dies. The simulation stays in main.js and
// entities.js; this module only owns the feel layered on top of it.

import { CONFIG } from './config.js';
import { addParticle, addText, spawnBurst, addShake } from './entities.js';

export function createJuice() {
  return {
    timeScale: 1, // 1 = real time; slow-mo drags the sim below 1
    slowmoT: 0, // seconds of slow motion left
    slowmoScale: 1, // the scale while slow-mo runs
    hitStopT: 0, // frozen frames after a heavy hit (boss, elite)
    flashT: 0, // white flash timer (boss death)
    flashColor: '#ffffff',
    vignette: 0, // 0..1, red dread at the screen edges, eased toward target
    trailAcc: 0, // ember-trail spawn accumulator
  };
}

// Slow the whole simulation for a beat: the Tyrant's death, an elite's
// pop. Time scale eases back to 1 as the timer runs out.
export function triggerSlowMo(game, duration, scale) {
  const juice = game.juice;
  juice.slowmoT = Math.max(juice.slowmoT, duration);
  juice.slowmoScale = scale;
  juice.timeScale = scale;
}

export function triggerHitStop(game, duration) {
  game.juice.hitStopT = Math.max(game.juice.hitStopT, duration);
}

export function triggerFlash(game, color, duration) {
  const juice = game.juice;
  juice.flashT = Math.max(juice.flashT, duration);
  juice.flashColor = color;
}

// A kill's payoff: a burst sized to the victim, a shake sized to it, and
// for the big ones a freeze-frame and a slow fall back to real time.
export function killBurst(game, enemy) {
  const big = enemy.type === 'boss' || enemy.type === 'warden';
  const elite = enemy.elite === true;
  spawnBurst(game, enemy.x, enemy.y, big ? 34 : elite ? 26 : 18, enemy.glow, big ? 320 : 240, big ? 0.8 : 0.55);
  spawnBurst(game, enemy.x, enemy.y, big ? 12 : 6, '#ffffff', 150, 0.3);
  addShake(game, big ? 12 : elite ? 8 : 5);
  if (big) {
    triggerSlowMo(game, 0.9, 0.22);
    triggerFlash(game, '#ffe66d', 0.35);
    triggerHitStop(game, 0.09);
  } else if (elite) {
    triggerHitStop(game, 0.05);
    addText(game, enemy.x, enemy.y - enemy.r - 18, 'ELITE DOWN!', '#ffd166', 17);
  }
  // The kill throws embers: a visible spray, so the harvest reads.
  for (let i = 0; i < Math.min(enemy.embers, 6); i += 1) {
    const a = game.rng.range(0, Math.PI * 2);
    addParticle(game, {
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(a) * game.rng.range(60, 160),
      vy: Math.sin(a) * game.rng.range(60, 160),
      life: 0.5,
      maxLife: 0.5,
      size: 3,
      color: '#ff9f1c',
      drag: 2,
    });
  }
}

// Floating damage numbers: white for a hit, gold and bigger for a crit,
// red for damage the Heart takes. One call, one number, no clutter.
export function damageNumber(game, x, y, amount, crit = false) {
  const size = crit ? 20 : 14;
  const color = crit ? '#ffd166' : '#ffffff';
  const text = crit ? `${Math.round(amount)}!` : String(Math.round(amount));
  addText(game, x + game.rng.range(-8, 8), y, text, color, size);
}

export function heartDamageNumber(game, x, y, amount) {
  addText(game, x, y, `-${amount}`, '#ff4d6d', 18);
}

// A laden ship leaves a trail of sparks: the player can see at a glance
// that they are carrying flame home.
export function updateJuice(game, dt) {
  const juice = game.juice;
  if (!juice) return;

  // Slow motion: ease back toward real time as the timer drains.
  if (juice.slowmoT > 0) {
    juice.slowmoT -= dt;
    if (juice.slowmoT <= 0) {
      juice.timeScale = 1;
    } else {
      juice.timeScale = juice.slowmoScale;
    }
  }
  juice.hitStopT = Math.max(0, juice.hitStopT - dt);
  juice.flashT = Math.max(0, juice.flashT - dt * 2.4);

  // The dread vignette: it grows as the Heart's flame or HP runs low, and
  // pulses with the heartbeat when the Heart is about to go out.
  const heart = game.heart;
  let target = 0;
  if (heart && game.state === 'playing') {
    const hpFrac = heart.hp / heart.maxHp;
    const fuelFrac = heart.fuel / heart.maxFuel;
    const worst = Math.min(hpFrac, fuelFrac);
    if (worst < 0.35) {
      target = (0.35 - worst) / 0.35;
      target = 0.25 + target * 0.75;
      target *= 0.85 + 0.15 * Math.sin(game.time * 6);
    }
  }
  juice.vignette += (target - juice.vignette) * Math.min(1, dt * 4);

  // Ember trail: a laden ship sheds sparks as it flies.
  const p = game.player;
  if (p && game.state === 'playing' && game.carried > 0) {
    juice.trailAcc += dt * Math.min(game.carried, 10);
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 60 && juice.trailAcc >= 1) {
      juice.trailAcc = 0;
      addParticle(game, {
        x: p.x - Math.cos(p.angle) * p.r,
        y: p.y - Math.sin(p.angle) * p.r,
        vx: -p.vx * 0.08 + game.rng.range(-20, 20),
        vy: -p.vy * 0.08 + game.rng.range(-20, 20),
        life: 0.45,
        maxLife: 0.45,
        size: 2.5,
        color: '#ff9f1c',
        drag: 1,
      });
    }
  }

  // Hard cap on the shake so a chain of kills never throws the camera off.
  if (game.shake.mag > CONFIG.SHAKE_MAX) game.shake.mag = CONFIG.SHAKE_MAX;
}

// The effective step scale for the simulation this frame: 0 while a
// hit-stop holds, the slow-mo scale while it runs, 1 otherwise.
export function simTimeScale(game) {
  const juice = game.juice;
  if (!juice) return 1;
  if (juice.hitStopT > 0) return 0;
  return juice.timeScale;
}
