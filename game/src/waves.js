// EMBERFALL — night flow: build a spawn queue from the night's composition,
// feed it in over time, and know when a night is over. Boss nights announce
// themselves, dark nights dim the arena, and every night opens with its name
// on a banner so the run reads like a story: ten nights, one Heart.

import { CONFIG, NIGHTS, nightComposition } from './config.js';
import { createEnemy } from './entities.js';
import { resetForgeForNight } from './forge.js';

export function startWave(game, wave) {
  game.wave = wave;
  game.waveActive = true;
  game.waveCleared = false;
  // Dawn cools the metal: the Forge is ready again, and last night's
  // Overcharge is spent.
  resetForgeForNight(game);
  game.spawnQueue = [];
  const night = NIGHTS[wave - 1] ?? NIGHTS[0];
  game.nightName = night.name;
  game.nightDark = night.dark;
  const comp = nightComposition(wave);
  // Interleave the types so the night arrives mixed, not in blocks.
  const bag = [];
  for (const entry of comp) {
    for (let i = 0; i < entry.count; i += 1) bag.push(entry.type);
  }
  game.rng.shuffle(bag);
  // Bosses always arrive last, alone.
  const bossIndex = bag.indexOf('boss');
  if (bossIndex !== -1) {
    bag.splice(bossIndex, 1);
    bag.push('boss');
  }
  game.spawnQueue = bag;
  game.spawnTimer = 0.8;
  game.betweenWaveTimer = 0;
  game.ui.showNightBanner(wave, night.name, night.twist);
  if (CONFIG.BOSS_WAVES.includes(wave)) {
    game.audio.bossAlarm();
  } else {
    game.audio.nightSting();
  }
}

// Feed the queue one enemy at a time, from a random arena edge with a telegraph.
export function updateSpawning(game, dt) {
  if (!game.waveActive || game.spawnQueue.length === 0) return;
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0) return;
  const type = game.spawnQueue.shift();
  const pos = edgeSpawnPosition(game);
  const enemy = createEnemy(game, type, pos.x, pos.y);
  game.enemies.push(enemy);
  if (type === 'boss') game.boss = enemy;
  // Spawn telegraph: a ring of sparks at the arrival point.
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    game.particles.push({
      x: pos.x + Math.cos(a) * enemy.r,
      y: pos.y + Math.sin(a) * enemy.r,
      vx: Math.cos(a) * 60,
      vy: Math.sin(a) * 60,
      life: 0.4,
      maxLife: 0.4,
      size: 3,
      color: enemy.glow,
      drag: 1,
    });
  }
  // Next spawn comes sooner as the nights go on; bosses get a breather first.
  // Dark nights and the Last Night pour faster still.
  let interval = Math.max(0.25, 0.9 - game.wave * 0.05);
  if (game.nightDark) interval *= 0.8;
  if (game.wave >= 10) interval *= 0.75;
  game.spawnTimer = type === 'boss' ? 1.5 : interval;
}

function edgeSpawnPosition(game) {
  const margin = 40;
  const side = game.rng.int(0, 3);
  if (side === 0) return { x: game.rng.range(margin, CONFIG.WIDTH - margin), y: margin };
  if (side === 1) return { x: game.rng.range(margin, CONFIG.WIDTH - margin), y: CONFIG.HEIGHT - margin };
  if (side === 2) return { x: margin, y: game.rng.range(margin, CONFIG.HEIGHT - margin) };
  return { x: CONFIG.WIDTH - margin, y: game.rng.range(margin, CONFIG.HEIGHT - margin) };
}

// True when the queue is empty and no enemy is left alive.
export function waveIsCleared(game) {
  return game.waveActive && game.spawnQueue.length === 0 && game.enemies.length === 0;
}
