// EMBERFALL — the Ember Heart. One burning heart at the arena's core is the
// whole point of the game: it is the last ember of the old world, and the
// night sends its creatures to snuff it out. The player defends it; if it
// dies, the run ends even if the ship still flies.
//
// The Heart does four things:
//   - it burns: a pulsing light radius that pushes back the dark on dark
//     nights and reveals Shades hiding beyond it;
//   - it bleeds: enemies that reach it bite it, and its HP is a second
//     health bar the player must watch;
//   - it answers: upgrades can arm it with thorns, a wider halo, or a
//     nova that bursts outwards and scorches everything close;
//   - it hopes: between nights it knits itself back together a little.

import { CONFIG } from './config.js';

export function createHeart() {
  return {
    x: CONFIG.HEART_X,
    y: CONFIG.HEART_Y,
    r: CONFIG.HEART_RADIUS,
    hp: CONFIG.HEART_MAX_HP,
    maxHp: CONFIG.HEART_MAX_HP,
    pulse: 0, // 0..1, the heartbeat phase (drives the glow and the rings)
    novaTimer: 0, // counts down to the next Heartpulse nova, when upgraded
    novaFlash: 0, // 0..1, the nova's expanding ring, for the renderer
    heartbeatTimer: 0, // slow thump timer when the Heart runs low
    lowWarned: false, // the "heart is burning low" warning, once per dip
  };
}

// How far the Heart's light reaches right now. It shrinks as the Heart
// bleeds (the night closes in) and grows with the Halo of Light upgrade.
export function heartLightRadius(game) {
  const heart = game.heart;
  const healthFrac = Math.max(0.45, heart.hp / heart.maxHp);
  return CONFIG.HEART_LIGHT_RADIUS * healthFrac * game.player.mods.lightMul;
}

// One fixed step of Heart life: the pulse, the nova, the low heartbeat.
export function updateHeart(game, dt) {
  const heart = game.heart;
  heart.pulse += dt * 1.6;
  heart.novaFlash = Math.max(0, heart.novaFlash - dt * 1.4);

  // Heartpulse nova: an upgrade that turns the Heart into a weapon.
  const mods = game.player.mods;
  if (mods.novaLevel > 0) {
    heart.novaTimer -= dt;
    if (heart.novaTimer <= 0) {
      heart.novaTimer = Math.max(3, 8 - mods.novaLevel);
      heart.novaFlash = 1;
      const damage = 20 + mods.novaLevel * 15;
      const radius = CONFIG.HEART_NOVA_RADIUS + mods.novaLevel * 20;
      for (let i = game.enemies.length - 1; i >= 0; i -= 1) {
        const e = game.enemies[i];
        if (e.spawnT > 0) continue;
        const d = Math.hypot(e.x - heart.x, e.y - heart.y);
        if (d < radius + e.r) {
          e.hp -= damage;
          e.flash = 0.15;
          if (e.hp <= 0) game.__killEnemy(e, i);
        }
      }
      game.audio.nova();
      game.__addShake(4);
    }
  }

  // A slow heartbeat when the Heart runs low: dread you can hear.
  const low = heart.hp / heart.maxHp < 0.35;
  if (low) {
    heart.heartbeatTimer -= dt;
    if (heart.heartbeatTimer <= 0) {
      heart.heartbeatTimer = 0.9;
      game.audio.heartbeat();
    }
    if (!heart.lowWarned) {
      heart.lowWarned = true;
      game.ui.showToast('THE HEART IS BURNING LOW — DEFEND IT!');
    }
  } else {
    heart.lowWarned = false;
  }
}

// The Heart takes a wound from anything that reaches it — a bite, a stray
// orb, the Tyrant's lunge. Returns false when there is no Heart left to wound.
export function hurtHeart(game, amount) {
  const heart = game.heart;
  if (game.state !== 'playing' || heart.hp <= 0) return false;
  // Screenshot simulations never kill the Heart: the shot must stay mid-fight.
  if (game.shotSim && heart.hp - amount <= 0) {
    heart.hp = 1;
    return true;
  }
  heart.hp -= amount;
  game.audio.heartHurt();
  game.__addShake(6);
  game.__addText(heart.x, heart.y - heart.r - 14, `-${amount}`, '#ff4d6d', 18);
  if (heart.hp <= 0) {
    heart.hp = 0;
    game.__endRun(false, 'heart');
  }
  return true;
}

// An enemy bites the Heart. Returns true when the bite lands.
export function damageHeart(game, enemy) {
  const heart = game.heart;
  if (game.state !== 'playing' || heart.hp <= 0) return false;
  if (enemy.heartHitT > 0) return false;
  enemy.heartHitT = CONFIG.HEART_TOUCH_COOLDOWN;

  // Heart Thorns: the Heart bites back.
  const thorns = game.player.mods.heartThorns;
  if (thorns > 0) {
    enemy.hp -= thorns;
    enemy.flash = 0.15;
  }

  hurtHeart(game, enemy.damage);
  // A bite throws the enemy back off the Heart so it cannot drain it in
  // one frame.
  const dx = enemy.x - heart.x;
  const dy = enemy.y - heart.y;
  const dist = Math.hypot(dx, dy) || 1;
  enemy.x += (dx / dist) * 34;
  enemy.y += (dy / dist) * 34;
  return true;
}

// Between nights the Heart knits itself back together a little.
export function mendHeartBetweenNights(game) {
  const heart = game.heart;
  heart.hp = Math.min(heart.maxHp, heart.hp + CONFIG.HEART_NIGHT_HEAL);
}
