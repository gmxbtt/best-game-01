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
    fuel: CONFIG.FLAME.MAX_FUEL, // the flame: drains all night, fed by embers
    maxFuel: CONFIG.FLAME.MAX_FUEL,
    burnoutAcc: 0, // accumulated burnout damage while the flame is out
    pulse: 0, // 0..1, the heartbeat phase (drives the glow and the rings)
    novaTimer: 0, // counts down to the next Heartpulse nova, when upgraded
    novaFlash: 0, // 0..1, the nova's expanding ring, for the renderer
    heartbeatTimer: 0, // slow thump timer when the Heart runs low
    lowWarned: false, // the "heart is burning low" warning, once per dip
    fuelWarned: false, // the "flame is dying" warning, once per dip
  };
}

// How far the Heart's light reaches right now. It shrinks as the Heart
// bleeds (the night closes in), shrinks again as its fuel runs low (the
// flame itself is dying), and grows with the Halo of Light upgrade.
export function heartLightRadius(game) {
  const heart = game.heart;
  const healthFrac = Math.max(0.45, heart.hp / heart.maxHp);
  const fuelFrac = 0.45 + 0.55 * Math.max(0, heart.fuel / heart.maxFuel);
  return CONFIG.HEART_LIGHT_RADIUS * healthFrac * fuelFrac * game.player.mods.lightMul;
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

  // The flame burns down all night: the clock the player races. The drain
  // only runs while a night is live, never on the title screen or between
  // nights — dawn is a breather, not a bill.
  if (game.state === 'playing' && game.waveActive) {
    const drain = CONFIG.FLAME.DRAIN_BASE + CONFIG.FLAME.DRAIN_PER_NIGHT * (game.wave - 1);
    heart.fuel = Math.max(0, heart.fuel - drain * dt);
  }

  // Burnout: no fuel left, and the Heart starts eating itself — a slow,
  // loud bleed that only feeding can stop.
  if (heart.fuel <= 0 && game.state === 'playing' && heart.hp > 0) {
    heart.burnoutAcc += CONFIG.FLAME.BURNOUT_HP_PER_SEC * dt;
    if (heart.burnoutAcc >= 1) {
      heart.burnoutAcc -= 1;
      hurtHeart(game, 1);
      game.__addText(heart.x, heart.y - heart.r - 30, 'BURNING OUT!', '#ff2e4d', 15);
    }
    if (!heart.fuelWarned) {
      heart.fuelWarned = true;
      game.ui.showToast('THE FLAME IS OUT — FEED THE HEART!');
      game.audio.lowFuel();
    }
  } else if (heart.fuel > CONFIG.FLAME.LOW_FUEL) {
    heart.fuelWarned = false;
  }

  // A slow heartbeat when the Heart runs low: dread you can hear.
  const low = heart.hp / heart.maxHp < 0.35 || heart.fuel / heart.maxFuel < 0.3;
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

  // A Crasher does not bite: it bursts against the Heart, spending its
  // whole body in one blast — and dies doing it.
  if (enemy.type === 'rammer') {
    enemy.hp = 0;
    game.audio.explosion(true);
    hurtHeart(game, enemy.damage);
    return true;
  }

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

// Between nights the Heart knits itself back together a little — and the
// dawn rekindles its flame a little too, so no run starts a night already
// burning out.
export function mendHeartBetweenNights(game) {
  const heart = game.heart;
  heart.hp = Math.min(heart.maxHp, heart.hp + CONFIG.HEART_NIGHT_HEAL);
  heart.fuel = Math.min(heart.maxFuel, heart.fuel + CONFIG.FLAME.NIGHT_REFUEL);
  heart.burnoutAcc = 0;
}
