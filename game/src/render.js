// EMBERFALL — rendering. Everything on the canvas is drawn here, procedurally:
// a neon starfield arena, the burning Ember Heart at its core, the ember ship,
// the eight enemy kinds, bullets, pickups, particles and floating text. No
// images, no external assets.

import { CONFIG } from './config.js';
import { heartLightRadius } from './heart.js';

// A fixed starfield, generated once per page load (not per frame).
const STARS = [];
for (let i = 0; i < 200; i += 1) {
  STARS.push({
    x: Math.random() * CONFIG.WIDTH,
    y: Math.random() * CONFIG.HEIGHT,
    r: Math.random() * 1.6 + 0.4,
    tw: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.8 + 0.2,
  });
}

// Nebula blobs: slow colour in the dark, so the arena never reads as void.
const NEBULAE = [
  { x: 260, y: 180, r: 300, color: 'rgba(123, 47, 190, 0.16)' },
  { x: 1020, y: 520, r: 340, color: 'rgba(255, 59, 48, 0.10)' },
  { x: 980, y: 140, r: 240, color: 'rgba(255, 159, 28, 0.08)' },
  { x: 300, y: 560, r: 260, color: 'rgba(47, 120, 190, 0.10)' },
];

// Ember motes: cinders always drifting up through the arena.
const MOTES = [];
for (let i = 0; i < 42; i += 1) {
  MOTES.push({
    x: Math.random() * CONFIG.WIDTH,
    y: Math.random() * CONFIG.HEIGHT,
    r: Math.random() * 1.8 + 0.7,
    phase: Math.random() * Math.PI * 2,
    speed: 6 + Math.random() * 14,
    sway: 8 + Math.random() * 14,
  });
}

export function drawGame(game) {
  const ctx = game.ctx;
  const { WIDTH, HEIGHT } = CONFIG;

  ctx.save();
  // Screen shake.
  if (game.shake.t > 0) {
    const m = game.shake.mag * (game.shake.t / 0.35);
    ctx.translate((Math.random() - 0.5) * m * 2, (Math.random() - 0.5) * m * 2);
  }

  drawBackground(game, ctx);
  drawHeart(game, ctx);
  drawPickups(game, ctx);
  drawEnemies(game, ctx);
  drawBullets(game, ctx);
  drawPlayer(game, ctx);
  drawParticles(game, ctx);
  drawTexts(game, ctx);
  drawDarkness(game, ctx);
  ctx.restore();

  // Red damage vignette flash.
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255, 40, 60, ${game.hurtFlash * 0.22})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Boss-death flash: a brief wash of light as the Tyrant goes down.
  if (game.juice && game.juice.flashT > 0) {
    ctx.fillStyle = game.juice.flashColor;
    ctx.globalAlpha = game.juice.flashT * 0.35;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
  }

  // Dread vignette: red closes in from the edges while the Heart's flame
  // or HP runs low — the screen itself says the run is in danger.
  if (game.juice && game.juice.vignette > 0.02) {
    const v = game.juice.vignette;
    const g = ctx.createRadialGradient(
      WIDTH / 2, HEIGHT / 2, Math.min(WIDTH, HEIGHT) * 0.32,
      WIDTH / 2, HEIGHT / 2, Math.max(WIDTH, HEIGHT) * 0.72,
    );
    g.addColorStop(0, 'rgba(255, 0, 40, 0)');
    g.addColorStop(1, `rgba(255, 0, 40, ${0.5 * v})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawBackground(game, ctx) {
  const { WIDTH, HEIGHT } = CONFIG;
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, CONFIG.COLORS.bgTop);
  grad.addColorStop(1, CONFIG.COLORS.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Nebula wash, so the dark has colour and depth.
  for (const n of NEBULAE) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }

  // Stars, gently twinkling.
  for (const s of STARS) {
    const a = 0.35 + 0.4 * Math.abs(Math.sin(game.time * s.speed + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cdd6ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Ember motes drifting up through the arena.
  for (const m of MOTES) {
    const y = (m.y - game.time * m.speed) % HEIGHT;
    const yy = y < 0 ? y + HEIGHT : y;
    const x = m.x + Math.sin(game.time * 0.7 + m.phase) * m.sway;
    ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(game.time + m.phase));
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(x, yy, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Faint arena border and grid, so motion reads at a glance.
  ctx.strokeStyle = 'rgba(157, 143, 208, 0.16)';
  ctx.lineWidth = 1;
  for (let x = 160; x < WIDTH; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 120; y < HEIGHT; y += 120) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, WIDTH - 12, HEIGHT - 12);
}

// The Ember Heart: the burning core of the arena. A pool of light, a pulsing
// heart, an HP ring, and embers orbiting it — the one thing on screen the
// player must never lose sight of.
function drawHeart(game, ctx) {
  const heart = game.heart;
  if (!heart) return;
  const { x, y, r } = heart;
  const frac = Math.max(0, heart.hp / heart.maxHp);
  // The flame is the Heart's life: as fuel runs low the Heart visibly
  // dims, shrinks and burns red — the player reads the danger at a glance,
  // even without the HUD.
  const fuelFrac = Math.max(0, heart.fuel / heart.maxFuel);
  const burn = Math.min(frac, 0.35 + 0.65 * fuelFrac);
  const beat = (1 + Math.sin(heart.pulse * Math.PI * 2) * 0.07) * (0.82 + 0.18 * fuelFrac);
  const lightR = heartLightRadius(game);

  // Pool of light on the arena floor — dimmer as the flame dies.
  const pool = ctx.createRadialGradient(x, y, 0, x, y, lightR);
  pool.addColorStop(0, `rgba(255, 159, 28, ${0.20 * (0.3 + 0.7 * fuelFrac)})`);
  pool.addColorStop(0.55, `rgba(255, 110, 40, ${0.08 * (0.3 + 0.7 * fuelFrac)})`);
  pool.addColorStop(1, 'rgba(255, 110, 40, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(x - lightR, y - lightR, lightR * 2, lightR * 2);

  // Orbiting embers.
  ctx.save();
  ctx.shadowColor = '#ff9f1c';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffcf5c';
  for (let i = 0; i < 6; i += 1) {
    const a = game.time * 0.5 + (i / 6) * Math.PI * 2;
    const ox = x + Math.cos(a) * (r + 20);
    const oy = y + Math.sin(a) * (r + 20);
    ctx.beginPath();
    ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // The heart itself, beating — red and guttering when the flame is low.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(beat, beat);
  ctx.shadowColor = burn < 0.35 ? '#ff0033' : '#ff9f1c';
  ctx.shadowBlur = 30 * (0.4 + 0.6 * fuelFrac);
  ctx.fillStyle = burn < 0.35 ? '#ff2e4d' : '#ff4d6d';
  drawHeartShape(ctx, r);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd6de';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // HP ring around the Heart: the second health bar, drawn where the fight is.
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.arc(x, y, r + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = frac < 0.35 ? '#ff2e4d' : '#ffb347';
  ctx.beginPath();
  ctx.arc(x, y, r + 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Nova flash: the Heartpulse ring racing outwards.
  if (heart.novaFlash > 0) {
    const nr = (1 - heart.novaFlash) * CONFIG.HEART_NOVA_RADIUS;
    ctx.save();
    ctx.globalAlpha = heart.novaFlash;
    ctx.strokeStyle = '#ffe66d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, nr + r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// On dark nights the arena drowns in dark except where light reaches: the
// Heart's pool and a small glow around the ship. Shades hide beyond it.
function drawDarkness(game, ctx) {
  if (!game.nightDark || (game.state !== 'playing' && game.state !== 'upgrade')) return;
  const { WIDTH, HEIGHT } = CONFIG;
  const heart = game.heart;
  const lightR = heartLightRadius(game);

  ctx.save();
  // A dim veil over everything, then deeper dark that gathers away from
  // each light, so the Heart's pool and the ship stay readable. The gradient
  // spans the whole screen so there is never a visible seam.
  ctx.fillStyle = 'rgba(3, 3, 12, 0.35)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const gather = (cx, cy, radius) => {
    const far = Math.max(WIDTH, HEIGHT);
    const g = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, far);
    g.addColorStop(0, 'rgba(3, 3, 12, 0)');
    g.addColorStop(0.3, 'rgba(3, 3, 12, 0.3)');
    g.addColorStop(1, 'rgba(3, 3, 12, 0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  };
  gather(heart.x, heart.y, lightR + 160);
  if (game.player) gather(game.player.x, game.player.y, 300);
  ctx.restore();
}

function drawPlayer(game, ctx) {
  const p = game.player;
  if (!p || game.state === 'gameover') return;
  // Blink while invulnerable.
  if (p.invuln > 0 && Math.floor(game.time * 18) % 2 === 0) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  // Glow.
  ctx.shadowColor = '#ff9f1c';
  ctx.shadowBlur = 22;
  // Ember ship: a swept dart with a bright core.
  ctx.fillStyle = CONFIG.COLORS.player;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = CONFIG.COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Cockpit ember.
  ctx.fillStyle = '#ff6b00';
  ctx.beginPath();
  ctx.arc(8, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Overcharge (4.0): the ship burns gold while the Forge's metal holds.
  if (game.overcharged) {
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 26;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 12 + Math.sin(game.time * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Dash cooldown ring.
  if (p.dashCooldown > 0) {
    const frac = 1 - p.dashCooldown / (CONFIG.DASH_COOLDOWN * p.mods.dashCooldownMul);
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }

  // Carried embers orbit the ship: the flame the player is bringing home,
  // visible at a glance.
  const carried = Math.min(game.carried || 0, 8);
  if (carried > 0) {
    ctx.save();
    ctx.shadowColor = '#ff9f1c';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffcf5c';
    for (let i = 0; i < carried; i += 1) {
      const a = game.time * 2.2 + (i / carried) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * (p.r + 13), p.y + Math.sin(a) * (p.r + 13), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawEnemies(game, ctx) {
  for (const e of game.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // Spawn telegraph: a shrinking ring while it phases in.
    if (e.spawnT > 0) {
      const frac = 1 - e.spawnT / 0.5;
      ctx.globalAlpha = 0.25 + frac * 0.55;
      ctx.strokeStyle = e.glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + (1 - frac) * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.35 + frac * 0.5;
    }

    ctx.shadowColor = e.glow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = e.color;
    ctx.strokeStyle = e.glow;
    ctx.lineWidth = 2;

    switch (e.type) {
      case 'drifter':
        drawSpikyOrb(ctx, e.r, 8);
        break;
      case 'dart': {
        ctx.rotate(Math.atan2(game.player.y - e.y, game.player.x - e.x));
        ctx.beginPath();
        ctx.moveTo(e.r + 6, 0);
        ctx.lineTo(-e.r, -e.r * 0.8);
        ctx.lineTo(-e.r * 0.4, 0);
        ctx.lineTo(-e.r, e.r * 0.8);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'splitter':
      case 'mini':
        drawSpikyOrb(ctx, e.r, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'spitter': {
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#2a1650';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.glow;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'kindler': {
        // A living flame, flickering as it runs for the Heart.
        const flick = 1 + Math.sin(game.time * 13 + e.wobble) * 0.12;
        ctx.save();
        ctx.scale(1, flick);
        ctx.beginPath();
        ctx.moveTo(0, -e.r * 1.3);
        ctx.quadraticCurveTo(e.r, 0, 0, e.r);
        ctx.quadraticCurveTo(-e.r, 0, 0, -e.r * 1.3);
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(0, e.r * 0.15, e.r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'shade': {
        // A ghost: barely a whisper outside the Heart's light, solid within it.
        ctx.globalAlpha = e.concealed ? 0.22 : 0.95;
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a2140';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d9ccff';
        ctx.beginPath();
        ctx.arc(-e.r * 0.32, -e.r * 0.15, e.r * 0.14, 0, Math.PI * 2);
        ctx.arc(e.r * 0.32, -e.r * 0.15, e.r * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'bulwark': {
        // A walking wall: a riveted steel slab, slowly turning — the one
        // enemy that asks for Overcharge instead of patience.
        ctx.rotate(game.time * 0.25);
        ctx.beginPath();
        ctx.moveTo(0, -e.r);
        ctx.lineTo(e.r * 0.85, -e.r * 0.5);
        ctx.lineTo(e.r * 0.85, e.r * 0.5);
        ctx.lineTo(0, e.r);
        ctx.lineTo(-e.r * 0.85, e.r * 0.5);
        ctx.lineTo(-e.r * 0.85, -e.r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-game.time * 0.25);
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.glow;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'warden': {
        // A bulwark: ringed orb with a crown of ash-spikes and a slow spin.
        ctx.rotate(game.time * 0.4);
        drawSpikyOrb(ctx, e.r, 8, 0.22);
        ctx.rotate(-game.time * 0.4);
        ctx.strokeStyle = '#e9e2ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#2a1650';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.glow;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'sniper': {
        // A Longshot: a cold cyan diamond with a long sight-line toward the
        // Heart, so the player sees what it is aiming at.
        ctx.rotate(Math.atan2(game.heart.y - e.y, game.heart.x - e.x));
        ctx.beginPath();
        ctx.moveTo(e.r + 8, 0);
        ctx.lineTo(0, -e.r * 0.7);
        ctx.lineTo(-e.r, 0);
        ctx.lineTo(0, e.r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(125, 249, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(e.r + 8, 0);
        ctx.lineTo(e.r + 42, 0);
        ctx.stroke();
        ctx.fillStyle = '#e6fbff';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'rammer': {
        // A Crasher: a burning arrowhead pointed at the Heart, sparking
        // harder as its charge winds up.
        ctx.rotate(Math.atan2(game.heart.y - e.y, game.heart.x - e.x));
        const flick = 1 + Math.sin(game.time * 18 + e.wobble) * 0.15;
        ctx.scale(flick, 1);
        ctx.beginPath();
        ctx.moveTo(e.r + 10, 0);
        ctx.lineTo(-e.r * 0.7, -e.r * 0.85);
        ctx.lineTo(-e.r * 0.3, 0);
        ctx.lineTo(-e.r * 0.7, e.r * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(e.r * 0.25, 0, e.r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'boss': {
        // Boss: big spiked ring, rotating outer spikes, pulsing core.
        ctx.rotate(game.time * 0.6);
        drawSpikyOrb(ctx, e.r, 12, 0.35);
        ctx.rotate(-game.time * 0.6);
        const pulse = 1 + Math.sin(game.time * 5) * 0.08;
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.34 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.2 * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Charge telegraph: bright flashing outline.
        if (e.charging > 0) {
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(game.time * 30);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, e.r + 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        break;
      }
      default:
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Elites burn gold: a bright ring that says "worth the risk".
    if (e.elite) {
      ctx.save();
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(game.time * 6);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // The Warden's shield: a cyan ring that says "this one cannot be hurt".
    if (e.shieldT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(game.time * 8);
      ctx.strokeStyle = '#7df9ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Hit flash: white overlay that fades fast.
    if (e.flash > 0) {
      ctx.globalAlpha = Math.min(1, e.flash * 6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Small HP bar over damaged non-boss enemies.
    if (e.type !== 'boss' && e.hp < e.maxHp) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-e.r, -e.r - 10, e.r * 2, 4);
      ctx.fillStyle = '#ff5d8f';
      ctx.fillRect(-e.r, -e.r - 10, (e.r * 2 * e.hp) / e.maxHp, 4);
    }

    ctx.restore();
  }
}

function drawSpikyOrb(ctx, r, spikes, spikeDepth = 0.3) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r * (1 + spikeDepth) : r * 0.82;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBullets(game, ctx) {
  // Player bullets: bright streaks.
  ctx.save();
  ctx.shadowColor = '#ffe66d';
  ctx.shadowBlur = 10;
  for (const b of game.bullets) {
    ctx.strokeStyle = CONFIG.COLORS.bullet;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Enemy orbs: pulsing purple-red glow — or cold cyan for a Longshot bolt.
  ctx.save();
  ctx.shadowColor = '#ff2e63';
  ctx.shadowBlur = 12;
  for (const b of game.enemyBullets) {
    ctx.fillStyle = b.color ?? '#ff5d8f';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd6e0';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPickups(game, ctx) {
  for (const pk of game.pickups) {
    const bobY = Math.sin(pk.bob) * 2;
    const blink = pk.life < 2 ? (Math.floor(game.time * 8) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.translate(pk.x, pk.y + bobY);
    if (pk.kind === 'ember') {
      ctx.shadowColor = CONFIG.COLORS.ember;
      ctx.shadowBlur = 12;
      ctx.fillStyle = CONFIG.COLORS.ember;
      ctx.beginPath();
      ctx.moveTo(0, -pk.r);
      ctx.quadraticCurveTo(pk.r, 0, 0, pk.r);
      ctx.quadraticCurveTo(-pk.r, 0, 0, -pk.r);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(0, 0, pk.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.shadowColor = CONFIG.COLORS.heart;
      ctx.shadowBlur = 12;
      ctx.fillStyle = CONFIG.COLORS.heart;
      drawHeartShape(ctx, pk.r);
    }
    ctx.restore();
  }
}

function drawHeartShape(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.7);
  ctx.bezierCurveTo(-s * 1.2, -s * 0.2, -s * 0.6, -s * 1.1, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.2, -s * 0.2, 0, s * 0.7);
  ctx.fill();
}

function drawParticles(game, ctx) {
  ctx.save();
  for (const pt of game.particles) {
    const frac = pt.life / pt.maxLife;
    ctx.globalAlpha = Math.max(0, frac);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(0.5, pt.size * frac), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTexts(game, ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  for (const t of game.texts) {
    const frac = t.life / t.maxLife;
    ctx.globalAlpha = Math.min(1, frac * 1.5);
    ctx.font = `bold ${t.size}px "Trebuchet MS", sans-serif`;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}
