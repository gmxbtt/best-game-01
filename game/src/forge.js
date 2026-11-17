// EMBERFALL 4.0 — the Ember Forge. Embers had only one use: feed the
// Heart. Now they have two, and that is the choice that matters every night.
// Standing close to the Heart with embers aboard, the player can FORGE them
// (F) into Overcharge instead of feeding them: six embers melt down into a
// weapon that burns half again as hot for the rest of the night. Feed the
// flame and the Heart lives longer; forge the flame and the night dies
// faster. A Bulwark on the march, a Tyrant at the door — that is when the
// forge earns its keep. One forge per night: dawn cools the metal, and the
// choice comes back with the next dark.
//
//   forgedTonight — the forge has been used this night (resets at dawn)
//   overcharged   — the Overcharge is live right now (ends when the night does)
//   forges        — forges this run (a stat for the dawn report)

import { CONFIG } from './config.js';
import { addParticle } from './entities.js';

export const FORGE_COST = 6; // embers melted down per forge
export const FORGE_DAMAGE_MUL = 1.5; // bullet damage while overcharged
export const FORGE_RATE_MUL = 1.25; // fire rate while overcharged

// True when the player can forge right now: playing, near the Heart, embers
// aboard, and the forge still cold for this night.
export function canForge(game) {
  if (!game.player || !game.heart || game.state !== 'playing') return false;
  if (game.forgedTonight) return false;
  if (game.carried < FORGE_COST) return false;
  const d = Math.hypot(game.player.x - game.heart.x, game.player.y - game.heart.y);
  return d <= CONFIG.FLAME.FEED_RADIUS;
}

// Melt six carried embers into Overcharge. Returns true when it fired.
export function tryForge(game) {
  if (!canForge(game)) return false;
  game.carried -= FORGE_COST;
  game.forgedTonight = true;
  game.overcharged = true;
  game.forges = (game.forges ?? 0) + 1;
  game.score += 50;
  game.audio.forge();
  game.ui.showToast('⚡ FORGED — OVERCHARGE! +50% damage till dawn');
  game.__addText(game.player.x, game.player.y - 30, 'OVERCHARGED!', '#ffd700', 18);
  // A ring of gold sparks bursts from the ship as the metal takes.
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * Math.PI * 2 + game.rng.range(-0.2, 0.2);
    addParticle(game, {
      x: game.player.x,
      y: game.player.y,
      vx: Math.cos(a) * game.rng.range(120, 300),
      vy: Math.sin(a) * game.rng.range(120, 300),
      life: 0.55,
      maxLife: 0.55,
      size: game.rng.range(2, 4.5),
      color: game.rng.pick(['#ffd700', '#ffcf5c', '#fff3c4', '#ff9f1c']),
      drag: 1,
    });
  }
  game.__addShake(3);
  return true;
}

// Dawn cools the metal: a new night, a new choice.
export function resetForgeForNight(game) {
  game.forgedTonight = false;
  game.overcharged = false;
}

// The multipliers the ship's guns read. Kept here so the forge owns its own
// numbers and the firing code just asks.
export function overchargeDamageMul(game) {
  return game.overcharged ? FORGE_DAMAGE_MUL : 1;
}

export function overchargeRateMul(game) {
  return game.overcharged ? FORGE_RATE_MUL : 1;
}
