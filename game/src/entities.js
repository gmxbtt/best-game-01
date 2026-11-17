// EMBERFALL — entities: the player ship, the five enemy kinds, bullets, pickups,
// particles and floating score text. Factories build them, update functions move
// them one fixed step, and the game (main.js) owns collisions and scoring.

import { CONFIG } from './config.js';
import { overchargeDamageMul, overchargeRateMul } from './forge.js';

// ---- Player ---------------------------------------------------------------

export function createPlayer(mods) {
  return {
    // The ship holds below the Heart, so the two never overlap at spawn.
    x: CONFIG.WIDTH / 2,
    y: CONFIG.HEIGHT / 2 + 160,
    vx: 0,
    vy: 0,
    r: CONFIG.PLAYER_RADIUS,
    hp: CONFIG.PLAYER_MAX_HP,
    maxHp: CONFIG.PLAYER_MAX_HP,
    angle: -Math.PI / 2,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: 0,
    invuln: 0,
    thrust: 0, // 0..1, how hard the thruster is burning (for the trail)
    mods,
  };
}

// Move the player one step: acceleration + friction, dash, and firing.
// Returns nothing; bullets it fires are pushed into game.bullets.
export function updatePlayer(game, dt) {
  const p = game.player;
  const input = game.input;
  const mods = p.mods;

  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);

  // Aim at the mouse; in screenshot auto-play the aim is set by shots.js.
  p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

  const mv = input.moveVector();
  const maxSpeed = CONFIG.PLAYER_MAX_SPEED * mods.speedMul;

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.vx = p.dashX * CONFIG.DASH_SPEED;
    p.vy = p.dashY * CONFIG.DASH_SPEED;
  } else {
    p.vx += mv.x * CONFIG.PLAYER_ACCEL * dt;
    p.vy += mv.y * CONFIG.PLAYER_ACCEL * dt;
    // Friction when no input; mild drag otherwise so speed caps naturally.
    const drag = mv.x === 0 && mv.y === 0 ? CONFIG.PLAYER_FRICTION : 1.1;
    const damp = Math.max(0, 1 - drag * dt);
    p.vx *= damp;
    p.vy *= damp;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
    }
  }

  // Dash: burst in the movement direction (or facing, if standing still).
  if (input.dashPressed() && p.dashCooldown <= 0) {
    let dx = mv.x;
    let dy = mv.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    }
    const len = Math.hypot(dx, dy) || 1;
    p.dashX = dx / len;
    p.dashY = dy / len;
    p.dashTimer = CONFIG.DASH_TIME;
    p.dashCooldown = CONFIG.DASH_COOLDOWN * mods.dashCooldownMul;
    p.invuln = Math.max(p.invuln, CONFIG.DASH_IFRAMES);
    game.audio.dash();
    spawnBurst(game, p.x, p.y, 10, '#ffb347', 180, 0.35);
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(p.r, Math.min(CONFIG.WIDTH - p.r, p.x));
  p.y = Math.max(p.r, Math.min(CONFIG.HEIGHT - p.r, p.y));

  // Thruster trail while moving.
  p.thrust = Math.min(1, Math.hypot(p.vx, p.vy) / maxSpeed);
  if (p.thrust > 0.25 && game.rng.chance(p.thrust * 0.9)) {
    const back = Math.atan2(p.vy, p.vx) + Math.PI;
    addParticle(game, {
      x: p.x + Math.cos(back) * p.r,
      y: p.y + Math.sin(back) * p.r,
      vx: Math.cos(back + game.rng.range(-0.4, 0.4)) * 90,
      vy: Math.sin(back + game.rng.range(-0.4, 0.4)) * 90,
      life: 0.35,
      maxLife: 0.35,
      size: game.rng.range(2, 4),
      color: game.rng.pick(['#ffb347', '#ff7b00', '#ffe66d']),
      drag: 2,
    });
  }

  // Firing.
  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0) {
    // Overcharge burns hotter and faster: the Forge's half-again damage and
    // quarter-faster rate live here, read from the forge itself.
    p.fireTimer = 1 / (CONFIG.PLAYER_FIRE_RATE * mods.fireRateMul * overchargeRateMul(game));
    firePlayerBullets(game);
  }
}

function firePlayerBullets(game) {
  const p = game.player;
  const mods = p.mods;
  const count = 1 + mods.multishot;
  const spread = 0.14;
  const baseAngle = p.angle - ((count - 1) * spread) / 2;
  for (let i = 0; i < count; i += 1) {
    const a = baseAngle + i * spread;
    game.bullets.push({
      x: p.x + Math.cos(a) * (p.r + 6),
      y: p.y + Math.sin(a) * (p.r + 6),
      vx: Math.cos(a) * CONFIG.PLAYER_BULLET_SPEED,
      vy: Math.sin(a) * CONFIG.PLAYER_BULLET_SPEED,
      r: CONFIG.PLAYER_BULLET_RADIUS,
      damage: CONFIG.PLAYER_BULLET_DAMAGE * mods.damageMul * overchargeDamageMul(game),
      pierce: mods.pierce,
      life: 1.2,
    });
  }
  game.audio.shoot();
  // Muzzle flash.
  addParticle(game, {
    x: p.x + Math.cos(p.angle) * (p.r + 10),
    y: p.y + Math.sin(p.angle) * (p.r + 10),
    vx: Math.cos(p.angle) * 60,
    vy: Math.sin(p.angle) * 60,
    life: 0.08,
    maxLife: 0.08,
    size: 6,
    color: '#ffe66d',
    drag: 0,
  });
}

// ---- Enemies ---------------------------------------------------------------

export function createEnemy(game, type, x, y) {
  const def = CONFIG.ENEMIES[type];
  const wave = game.wave;
  const hpScale = 1 + (wave - 1) * 0.12 + (type === 'boss' ? (wave - 5) * 0.35 : 0);
  const enemy = {
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    r: def.radius,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    speed: def.speed * game.rng.range(0.9, 1.1),
    damage: def.damage,
    score: def.score,
    embers: def.embers,
    color: def.color,
    glow: def.glow,
    flash: 0, // hit flash timer
    spawnT: 0.5, // telegraph-in time before it can act
    shootTimer: game.rng.range(1.2, 2.4),
    angle: 0,
    wobble: game.rng.range(0, Math.PI * 2),
    // Who this enemy hunts: Kindlers, Crashers and Bulwarks run for the
    // Heart, the rest hunt the ship.
    target: type === 'kindler' || type === 'rammer' || type === 'bulwark' ? 'heart' : 'player',
    heartHitT: 0, // cooldown between bites at the Heart
    shieldT: 0, // the Warden's shield: no damage while this runs
    shieldTimer: 3, // the Warden's own shield pulse timer
    concealed: false, // Shades hide in the dark, outside the Heart's light
    elite: false, // late-night elites: tougher, faster, worth more embers
    // Sniper-only state: how long until its next bolt at the Heart.
    snipeTimer: game.rng.range(2.0, 3.2),
    // Rammer-only state: how long it has been winding up its charge.
    chargeUp: 0,
    // Boss-only state.
    attackTimer: 2.5,
    attackKind: 0,
    charging: 0,
    chargeTarget: 'player', // the boss's lunge aims at the player — or the Heart
  };
  // Elites: from night 9 on, a few ordinary enemies come back burning
  // gold — tougher, faster, and worth twice the score and extra embers.
  if (wave >= 9 && type !== 'boss' && type !== 'warden' && game.rng.chance(0.18)) {
    enemy.elite = true;
    enemy.hp *= 1.6;
    enemy.maxHp *= 1.6;
    enemy.speed *= 1.15;
    enemy.score *= 2;
    enemy.embers += 2;
  }
  return enemy;
}

export function updateEnemy(game, e, dt) {
  const p = game.player;
  e.flash = Math.max(0, e.flash - dt);
  e.wobble += dt * 3;
  e.heartHitT = Math.max(0, e.heartHitT - dt);
  e.shieldT = Math.max(0, e.shieldT - dt);
  if (e.spawnT > 0) {
    e.spawnT -= dt;
    return;
  }

  // Where this enemy is headed: the ship, or the Heart it wants to snuff out.
  const tx = e.target === 'heart' ? game.heart.x : p.x;
  const ty = e.target === 'heart' ? game.heart.y : p.y;
  const dx = tx - e.x;
  const dy = ty - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  switch (e.type) {
    case 'drifter': {
      // Slow chase with a gentle sine wobble.
      const wob = Math.sin(e.wobble) * 0.5;
      e.vx = (nx + -ny * wob) * e.speed;
      e.vy = (ny + nx * wob) * e.speed;
      break;
    }
    case 'dart': {
      // Fast, direct chase; overshoots and circles back.
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
      break;
    }
    case 'splitter':
    case 'mini': {
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
      break;
    }
    case 'spitter': {
      // Keep a mid range: approach when far, back off when close, strafe.
      const want = 260;
      const radial = dist > want + 40 ? 1 : dist < want - 40 ? -0.7 : 0;
      const strafe = Math.sin(e.wobble * 0.7) * 0.8;
      e.vx = (nx * radial + -ny * strafe) * e.speed;
      e.vy = (ny * radial + nx * strafe) * e.speed;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 520) {
        e.shootTimer = game.rng.range(2.0, 2.8);
        game.enemyBullets.push({
          x: e.x,
          y: e.y,
          vx: nx * CONFIG.ENEMY_BULLET_SPEED,
          vy: ny * CONFIG.ENEMY_BULLET_SPEED,
          r: CONFIG.ENEMY_BULLET_RADIUS,
          damage: e.damage,
          life: 4,
          heartMul: 0.5, // stray spit only grazes the Heart; bites do the real harm
        });
        game.audio.enemyShoot();
      }
      break;
    }
    case 'kindler': {
      // A living spark that runs straight for the Heart, ignoring the ship.
      // It weaves a little so it cannot be lined up for free.
      const weave = Math.sin(e.wobble * 1.4) * 0.45;
      e.vx = (nx + -ny * weave) * e.speed;
      e.vy = (ny + nx * weave) * e.speed;
      break;
    }
    case 'shade': {
      // A ghost that hunts the ship — but only the Heart's light reveals it.
      // Beyond the light it is a whisper: nearly invisible, and it drifts
      // slower, circling in the dark until the light catches it.
      const lightR = game.__heartLightRadius();
      const dHeart = Math.hypot(game.heart.x - e.x, game.heart.y - e.y);
      e.concealed = dHeart > lightR + 20;
      const pace = e.concealed ? 0.55 : 1;
      e.vx = nx * e.speed * pace;
      e.vy = ny * e.speed * pace;
      break;
    }
    case 'warden': {
      // A slow bulwark that shields the swarm around it. Break the Warden
      // first, or its escorts fight under an unbreakable ring.
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
      e.shieldTimer -= dt;
      if (e.shieldTimer <= 0) {
        e.shieldTimer = 4;
        for (const other of game.enemies) {
          if (other === e || other.type === 'boss') continue;
          if (Math.hypot(other.x - e.x, other.y - e.y) < 190) {
            other.shieldT = 2.2;
          }
        }
        game.audio.shield();
        game.__addText(e.x, e.y - e.r - 10, 'SHIELDED', '#c9b8ff', 15);
      }
      break;
    }
    case 'bulwark': {
      // A walking wall, marching on the Heart: too slow to chase the ship,
      // too tough to ignore. It does not weave or dodge — it just comes,
      // and every bullet it eats is a bullet that did not kill a Kindler.
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
      break;
    }
    case 'sniper': {
      // A Longshot never comes close: it holds 380–460 from the Heart and
      // fires a piercing bolt at it. Kill it, or body-block its bolts —
      // the Heart cannot dodge, so the player has to.
      const dHeart = Math.hypot(game.heart.x - e.x, game.heart.y - e.y);
      const hx = (game.heart.x - e.x) / (dHeart || 1);
      const hy = (game.heart.y - e.y) / (dHeart || 1);
      const radial = dHeart > 460 ? 1 : dHeart < 380 ? -1 : 0;
      const strafe = Math.sin(e.wobble * 0.9) * 0.9;
      e.vx = (hx * radial + -hy * strafe) * e.speed;
      e.vy = (hy * radial + hx * strafe) * e.speed;
      e.snipeTimer -= dt;
      if (e.snipeTimer <= 0 && dHeart < 560) {
        e.snipeTimer = game.rng.range(2.6, 3.4);
        game.enemyBullets.push({
          x: e.x,
          y: e.y,
          vx: hx * 300,
          vy: hy * 300,
          r: 6,
          damage: e.damage,
          life: 4,
          color: '#7df9ff',
        });
        game.audio.sniperShot();
        game.__addText(e.x, e.y - e.r - 8, 'SNIPED!', '#7df9ff', 12);
      }
      break;
    }
    case 'rammer': {
      // A Crasher runs straight at the Heart, winding up faster the
      // closer it gets — a lit fuse the player can see coming. It bursts
      // on contact (heart.js), so the answer is to kill it mid-charge.
      const dHeart = Math.hypot(game.heart.x - e.x, game.heart.y - e.y);
      e.chargeUp = Math.min(1, e.chargeUp + dt * 0.8);
      const charge = dHeart < 300 ? 1 + e.chargeUp * 0.9 : 1;
      const weave = Math.sin(e.wobble * 1.1) * 0.12;
      e.vx = (nx + -ny * weave) * e.speed * charge;
      e.vy = (ny + nx * weave) * e.speed * charge;
      if (game.rng.chance(dt * 6)) {
        addParticle(game, {
          x: e.x + game.rng.range(-e.r, e.r),
          y: e.y + game.rng.range(-e.r, e.r),
          vx: 0,
          vy: -40,
          life: 0.3,
          maxLife: 0.3,
          size: 2.5,
          color: '#ff8c42',
          drag: 0,
        });
      }
      break;
    }
    case 'boss': {
      updateBoss(game, e, dt, nx, ny, dist);
      break;
    }
    default:
      break;
  }

  e.x += e.vx * dt;
  e.y += e.vy * dt;
  // Enemies stay in the arena (bosses too, so the player can always reach them).
  e.x = Math.max(e.r, Math.min(CONFIG.WIDTH - e.r, e.x));
  e.y = Math.max(e.r, Math.min(CONFIG.HEIGHT - e.r, e.y));
}

function updateBoss(game, e, dt, nx, ny, dist) {
  const p = game.player;
  e.attackTimer -= dt;

  if (e.charging > 0) {
    // Telegraph then lunge — at the ship, or at the Heart it wants to eat.
    e.charging -= dt;
    e.vx = 0;
    e.vy = 0;
    if (e.charging <= 0) {
      let lx = nx;
      let ly = ny;
      if (e.chargeTarget === 'heart') {
        const hx = game.heart.x - e.x;
        const hy = game.heart.y - e.y;
        const hd = Math.hypot(hx, hy) || 1;
        lx = hx / hd;
        ly = hy / hd;
      }
      e.vx = lx * 520;
      e.vy = ly * 520;
      game.audio.enemyShoot();
    }
    return;
  }

  // Drift toward the player, slowly.
  e.vx = nx * e.speed;
  e.vy = ny * e.speed;

  if (e.attackTimer <= 0) {
    e.attackKind = (e.attackKind + 1) % 4;
    if (e.attackKind === 0) {
      // Radial burst: 12 orbs in a ring.
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2 + game.rng.range(0, 0.4);
        game.enemyBullets.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * CONFIG.ENEMY_BULLET_SPEED,
          vy: Math.sin(a) * CONFIG.ENEMY_BULLET_SPEED,
          r: CONFIG.ENEMY_BULLET_RADIUS,
          damage: e.damage,
          life: 5,
          heartMul: 0.5, // stray fire only grazes the Heart
        });
      }
      game.audio.enemyShoot();
      game.audio.bossAlarm();
      e.attackTimer = 3.2;
    } else if (e.attackKind === 1) {
      // Triple aimed volley.
      for (let k = -1; k <= 1; k += 1) {
        const a = Math.atan2(p.y - e.y, p.x - e.x) + k * 0.22;
        game.enemyBullets.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * (CONFIG.ENEMY_BULLET_SPEED + 60),
          vy: Math.sin(a) * (CONFIG.ENEMY_BULLET_SPEED + 60),
          r: CONFIG.ENEMY_BULLET_RADIUS,
          damage: e.damage,
          life: 4,
          heartMul: 0.5, // stray fire only grazes the Heart
        });
      }
      game.audio.enemyShoot();
      e.attackTimer = 2.4;
    } else if (e.attackKind === 2) {
      // Charge telegraph: flash, pause, then lunge at the ship.
      e.chargeTarget = 'player';
      e.charging = 0.7;
      e.attackTimer = 3.0;
    } else {
      // On the Last Night the Tyrant stops hunting the ship and goes for
      // the Heart itself: a telegraphed lunge at the arena's core. On the
      // first Tyrant night it falls back to a radial burst instead.
      if (game.wave >= 10) {
        e.chargeTarget = 'heart';
        e.charging = 0.9;
        game.audio.bossAlarm();
        game.ui.showToast('THE TYRANT CHARGES THE HEART!');
        e.attackTimer = 3.4;
      } else {
        for (let i = 0; i < 12; i += 1) {
          const a = (i / 12) * Math.PI * 2 + game.rng.range(0, 0.4);
          game.enemyBullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * CONFIG.ENEMY_BULLET_SPEED,
            vy: Math.sin(a) * CONFIG.ENEMY_BULLET_SPEED,
            r: CONFIG.ENEMY_BULLET_RADIUS,
            damage: e.damage,
            life: 5,
            heartMul: 0.5, // stray fire only grazes the Heart
          });
        }
        game.audio.enemyShoot();
        e.attackTimer = 3.2;
      }
    }
  }
}

// ---- Bullets, pickups, particles, floating text ----------------------------

export function updateBullets(game, dt) {
  for (let i = game.bullets.length - 1; i >= 0; i -= 1) {
    const b = game.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > CONFIG.WIDTH + 20 || b.y < -20 || b.y > CONFIG.HEIGHT + 20) {
      game.bullets.splice(i, 1);
    }
  }
  for (let i = game.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = game.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > CONFIG.WIDTH + 20 || b.y < -20 || b.y > CONFIG.HEIGHT + 20) {
      game.enemyBullets.splice(i, 1);
    }
  }
}

export function spawnPickup(game, x, y, kind) {
  const angle = game.rng.range(0, Math.PI * 2);
  const speed = game.rng.range(40, 120);
  game.pickups.push({
    kind, // 'ember' | 'heart'
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: kind === 'heart' ? 11 : 8,
    life: 9,
    bob: game.rng.range(0, Math.PI * 2),
  });
}

export function updatePickups(game, dt) {
  const p = game.player;
  const magnetR = CONFIG.MAGNET_RADIUS * p.mods.magnetMul;
  for (let i = game.pickups.length - 1; i >= 0; i -= 1) {
    const pk = game.pickups[i];
    pk.life -= dt;
    pk.bob += dt * 4;
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < magnetR) {
      // Magnet pull, stronger up close.
      const pull = 900 * (1 - dist / magnetR) + 260;
      pk.vx += (dx / dist) * pull * dt;
      pk.vy += (dy / dist) * pull * dt;
    } else {
      const damp = Math.max(0, 1 - 2.5 * dt);
      pk.vx *= damp;
      pk.vy *= damp;
    }
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    if (pk.life <= 0) game.pickups.splice(i, 1);
  }
}

export function addParticle(game, particle) {
  if (game.particles.length >= CONFIG.MAX_PARTICLES) game.particles.shift();
  game.particles.push(particle);
}

export function spawnBurst(game, x, y, count, color, speed, life) {
  for (let i = 0; i < count; i += 1) {
    const a = game.rng.range(0, Math.PI * 2);
    const s = game.rng.range(speed * 0.3, speed);
    addParticle(game, {
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: game.rng.range(life * 0.5, life),
      maxLife: life,
      size: game.rng.range(2, 5),
      color,
      drag: 2.5,
    });
  }
}

export function spawnExplosion(game, x, y, color, big = false) {
  spawnBurst(game, x, y, big ? 34 : 18, color, big ? 320 : 240, big ? 0.8 : 0.55);
  spawnBurst(game, x, y, big ? 10 : 5, '#ffffff', 140, 0.3);
  addShake(game, big ? 10 : 5);
}

export function addShake(game, mag) {
  game.shake.mag = Math.min(CONFIG.SHAKE_MAX, game.shake.mag + mag);
  game.shake.t = 0.35;
}

export function updateParticles(game, dt) {
  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const pt = game.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) {
      game.particles.splice(i, 1);
      continue;
    }
    const damp = Math.max(0, 1 - (pt.drag ?? 2) * dt);
    pt.vx *= damp;
    pt.vy *= damp;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
  }
}

export function addText(game, x, y, text, color = '#ffffff', size = 16) {
  game.texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
}

export function updateTexts(game, dt) {
  for (let i = game.texts.length - 1; i >= 0; i -= 1) {
    const t = game.texts[i];
    t.life -= dt;
    t.y -= 42 * dt;
    if (t.life <= 0) game.texts.splice(i, 1);
  }
}
