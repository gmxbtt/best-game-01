// EMBERFALL — deterministic screenshot states. `?shot=<name>&seed=N` builds one
// fixed scene from the seeded RNG, then main.js freezes the simulation so the
// screenshot is reproducible: same seed, same pixels.
//
//   ?shot=start  title screen with a best score shown
//   ?shot=play   mid-game, wave 4, enemies on screen, HUD filled
//   ?shot=boss   fighting the wave-5 boss
//   ?shot=end    game-over screen with a score

import { CONFIG } from './config.js';
import { createEnemy, spawnExplosion } from './entities.js';
import { startWave } from './waves.js';

// Drive the sim forward with an auto-aiming, auto-firing player so the scene
// looks mid-fight: bullets in the air, enemies closing in, particles flying.
function simulateFight(game, steps) {
  const input = game.input;
  input.mouseDown = true;
  for (let i = 0; i < steps; i += 1) {
    // Aim at the nearest live enemy (or straight up when the arena is empty).
    let nearest = null;
    let nearestD = Infinity;
    for (const e of game.enemies) {
      if (e.spawnT > 0) continue;
      const d = Math.hypot(e.x - game.player.x, e.y - game.player.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = e;
      }
    }
    if (nearest) {
      input.mouseX = nearest.x;
      input.mouseY = nearest.y;
    } else {
      input.mouseX = game.player.x;
      input.mouseY = game.player.y - 200;
    }
    // Step the real simulation one fixed step.
    game.__step(CONFIG.STEP);
    if (game.state !== 'playing') break;
  }
  input.mouseDown = false;
}

export function applyShot(game, shot) {
  // The step function is wired by main.js before this runs.
  if (shot === 'start') {
    game.best = 2450;
    game.ui.showTitle(game.best);
    return;
  }

  if (shot === 'play') {
    // Fresh run, wave 4, a busy mid-game scene.
    game.__startRun();
    game.ui.showOnly(null); // hide the title overlay, show the HUD
    game.enemies = [];
    game.spawnQueue = [];
    startWave(game, 4);
    game.score = 1230;
    game.kills = 24;
    game.embers = 31;
    game.combo = 7;
    game.comboTimer = CONFIG.COMBO_WINDOW;
    game.shotSim = true;
    simulateFight(game, 300);
    game.shotSim = false;
    game.ui.updateHUD(game);
    return;
  }

  if (shot === 'boss') {
    game.__startRun();
    game.ui.showOnly(null); // hide the title overlay, show the HUD
    game.enemies = [];
    game.spawnQueue = [];
    game.wave = 5;
    game.waveActive = true;
    game.score = 3420;
    game.kills = 58;
    game.embers = 74;
    game.combo = 5;
    game.comboTimer = CONFIG.COMBO_WINDOW;
    // The Tyrant, centre-top, plus two drifters as escorts.
    const boss = createEnemy(game, 'boss', CONFIG.WIDTH / 2, 190);
    boss.spawnT = 0;
    game.enemies.push(boss);
    game.boss = boss;
    for (const [x, y] of [[220, 180], [1060, 200]]) {
      const d = createEnemy(game, 'drifter', x, y);
      d.spawnT = 0;
      game.enemies.push(d);
    }
    game.audio.bossAlarm();
    game.shotSim = true;
    simulateFight(game, 200);
    game.shotSim = false;
    game.ui.updateHUD(game);
    return;
  }

  if (shot === 'end') {
    game.__startRun();
    game.enemies = [];
    game.spawnQueue = [];
    game.waveActive = false;
    game.score = 1840;
    game.wave = 6;
    game.kills = 87;
    game.embers = 42;
    game.player.hp = 0;
    // A few drifters drifting past the wreckage, for a lived-in backdrop.
    for (const [x, y] of [[300, 220], [900, 160], [640, 480]]) {
      const d = createEnemy(game, 'drifter', x, y);
      d.spawnT = 0;
      game.enemies.push(d);
    }
    spawnExplosion(game, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, '#ffb347', true);
    game.state = 'gameover';
    game.ui.showGameOver(game);
    return;
  }

  // Unknown ?shot=: fall back to the title screen.
  game.ui.showTitle(game.best);
}
