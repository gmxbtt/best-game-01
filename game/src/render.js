// EMBERFALL — rendering. Everything on the canvas is drawn here, procedurally:
// a neon starfield arena, the ember ship, the five enemy kinds, bullets, pickups,
// particles and floating text. No images, no external assets.

import { CONFIG } from './config.js';

// A fixed starfield, generated once per page load (not per frame).
const STARS = [];
for (let i = 0; i < 130; i += 1) {
  STARS.push({
    x: Math.random() * CONFIG.WIDTH,
    y: Math.random() * CONFIG.HEIGHT,
    r: Math.random() * 1.6 + 0.4,
    tw: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.8 + 0.2,
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
  drawPickups(game, ctx);
  drawEnemies(game, ctx);
  drawBullets(game, ctx);
  drawPlayer(game, ctx);
  drawParticles(game, ctx);
  drawTexts(game, ctx);
  ctx.restore();

  // Red damage vignette flash.
  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255, 40, 60, ${game.hurtFlash * 0.22})`;
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

  // Dash cooldown ring.
  if (p.dashCooldown > 0) {
    const frac = 1 - p.dashCooldown / (CONFIG.DASH_COOLDOWN * p.mods.dashCooldownMul);
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
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

  // Enemy orbs: pulsing purple-red glow.
  ctx.save();
  ctx.shadowColor = '#ff2e63';
  ctx.shadowBlur = 12;
  for (const b of game.enemyBullets) {
    ctx.fillStyle = '#ff5d8f';
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
      drawHeart(ctx, pk.r);
    }
    ctx.restore();
  }
}

function drawHeart(ctx, s) {
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
