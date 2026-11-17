// EMBERFALL 3.0 — the ember economy. Killing is only half the loop: every
// dead enemy drops embers, the player carries them, and the Heart must be FED
// with them — because the Heart burns fuel all night long, and a Heart that
// runs dry starts to die. This is the choice that matters: leave the Heart
// to harvest embers out in the dark, or stay home and keep the flame alive.
// Feed too little and the Heart burns out; feed it and it heals as it burns.
//
//   carried  — embers on the ship right now (capped by the satchel)
//   fed      — embers fed to the Heart this run (a stat, and a score source)
//   fuel     — the Heart's flame, 0..100. Drains every second of every night.
//              At 0 the Heart takes burnout damage until it is fed again.

import { CONFIG } from './config.js';
import { addParticle } from './entities.js';

// The ship scoops up a loose ember. While the satchel has room it rides
// along; a full satchel just melts the ember down for score instead.
export function collectEmber(game, pk) {
  const cap = CONFIG.FLAME.CARRY_CAP + game.player.mods.carryBonus;
  if (game.carried < cap) {
    game.carried += 1;
    game.embers += 1;
    game.audio.pickup();
    return true;
  }
  // Satchel full: the ember is worth score, not flame.
  game.embers += 1;
  game.score += CONFIG.EMBER_SCORE;
  game.audio.pickup();
  return false;
}

// One ember leaves the satchel and goes into the Heart. Fuel rises, the
// Heart knits a little, and the run's score ticks up — feeding is always
// worth doing, even when the flame is not yet in danger.
export function feedOneEmber(game) {
  const heart = game.heart;
  game.carried -= 1;
  game.fed += 1;
  heart.fuel = Math.min(heart.maxFuel, heart.fuel + CONFIG.FLAME.FEED_FUEL);
  heart.hp = Math.min(heart.maxHp, heart.hp + CONFIG.FLAME.FEED_HP);
  game.score += CONFIG.FLAME.FEED_SCORE;
  // A bright streak from the ship into the Heart: the feed, made visible.
  const dx = heart.x - game.player.x;
  const dy = heart.y - game.player.y;
  const dist = Math.hypot(dx, dy) || 1;
  for (let i = 0; i < 3; i += 1) {
    const t = game.rng.range(0.2, 0.8);
    addParticle(game, {
      x: game.player.x + dx * t,
      y: game.player.y + dy * t,
      vx: (dx / dist) * 320,
      vy: (dy / dist) * 320,
      life: 0.25,
      maxLife: 0.25,
      size: 3,
      color: '#ffcf5c',
      drag: 0,
    });
  }
  if (game.fed % 3 === 0) game.audio.feed();
  if (game.fed % 4 === 0) {
    game.__addText(heart.x, heart.y - heart.r - 30, '+FLAME', '#ffcf5c', 15);
  }
}

// Every step while playing: stand close to the Heart with embers aboard and
// they pour in, a few per second. The feed radius is generous on purpose —
// the tension is the trip back, not the parking.
export function updateFeeding(game, dt) {
  const heart = game.heart;
  const p = game.player;
  if (!p || !heart || game.state !== 'playing') return;
  if (game.carried <= 0) return;
  const d = Math.hypot(p.x - heart.x, p.y - heart.y);
  if (d > CONFIG.FLAME.FEED_RADIUS) return;
  game.feedAcc = (game.feedAcc ?? 0) + dt * CONFIG.FLAME.FEED_RATE * p.mods.feedMul;
  while (game.feedAcc >= 1 && game.carried > 0) {
    game.feedAcc -= 1;
    feedOneEmber(game);
  }
  if (game.feedAcc > 1) game.feedAcc = 1;
}

// How the flame is doing, 0..1 — the HUD bar and the renderer's dimming
// both read this, so the whole screen agrees about the danger.
export function fuelFraction(game) {
  const heart = game.heart;
  if (!heart) return 1;
  return Math.max(0, Math.min(1, heart.fuel / heart.maxFuel));
}

// True while the flame is low enough that the player should be scared.
export function flameIsLow(game) {
  return fuelFraction(game) < CONFIG.FLAME.LOW_FUEL / 100;
}

// True while the Heart is burning out: no fuel left at all.
export function flameIsOut(game) {
  return fuelFraction(game) <= 0;
}
