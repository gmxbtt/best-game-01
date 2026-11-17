// EMBERFALL — deterministic screenshot states. `?shot=<name>&seed=N` builds one
// fixed scene from the seeded RNG, then main.js freezes the simulation so the
// screenshot is reproducible: same seed, same pixels.
//
//   ?shot=start    title screen with a best score shown
//   ?shot=play     mid-game, night 4, Kindlers hunting the Heart, HUD filled
//   ?shot=boss     fighting the night-5 boss while a Kindler closes on the Heart
//   ?shot=victory  the dawn-breaks victory screen after night 10

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
    // Fresh run, night 4 ("Kindlers Wake"): a busy mid-game scene, Kindlers
    // closing on the Heart from every edge, the Heart already bloodied.
    game.__startRun();
    game.ui.showOnly(null); // hide the title overlay, show the HUD
    game.enemies = [];
    game.spawnQueue = [];
    startWave(game, 4);
    game.score = 1230;
    game.kills = 24;
    game.embers = 31;
    game.carried = 7; // embers aboard, on the way home to the Heart
    game.fed = 18;
    game.combo = 7;
    game.comboTimer = CONFIG.COMBO_WINDOW;
    game.heart.hp = 150;
    game.heart.fuel = 55; // mid-flame: the meter reads half, the Heart still bright
    game.shotSim = true;
    // The ship holds below the Heart, so the shot shows both at once.
    game.player.x = 640;
    game.player.y = 520;
    // A full arena, placed by hand: Kindlers converging on the Heart, a
    // Spitter holding range, Drifters and Darts closing on the ship — and
    // the new Longshot sniping from afar, a Crasher winding up its charge.
    const placed = [
      ['kindler', 640, 120], ['kindler', 180, 360], ['kindler', 1100, 360],
      ['drifter', 420, 200], ['drifter', 860, 520], ['drifter', 240, 520],
      ['dart', 950, 180], ['dart', 320, 480], ['dart', 1050, 500],
      ['spitter', 180, 180], ['spitter', 1080, 200],
      ['splitter', 700, 560], ['splitter', 480, 520],
      ['sniper', 220, 120], ['rammer', 900, 620],
    ];
    for (const [type, x, y] of placed) {
      const e = createEnemy(game, type, x, y);
      e.spawnT = 0;
      game.enemies.push(e);
    }
    // A scatter of embers on the floor, fresh from kills.
    for (const [x, y] of [[500, 300], [760, 420], [620, 480], [880, 300]]) {
      game.pickups.push({ kind: 'ember', x, y, vx: 0, vy: 0, r: 8, life: 9, bob: 0 });
    }
    simulateFight(game, 300);
    game.shotSim = false;
    // Clean the stage for the photo: the sim bloodied the Heart and left
    // floating score text everywhere — reset both to a readable mid-fight.
    game.texts = [];
    game.heart.hp = 118;
    game.heart.fuel = 55;
    game.carried = 7;
    game.ui.hideToast();
    game.ui.hideNightBanner();
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
    game.nightName = 'The Tyrant Wakes';
    game.score = 3420;
    game.kills = 58;
    game.embers = 74;
    game.carried = 5;
    game.fed = 41;
    game.combo = 5;
    game.comboTimer = CONFIG.COMBO_WINDOW;
    game.heart.hp = 150;
    game.heart.fuel = 62;
    // The ship holds below the Heart, so the shot shows both fights at once.
    game.player.x = 640;
    game.player.y = 520;
    // The Tyrant, centre-top, plus two drifters as escorts — and a Kindler
    // already closing on the Heart, so the shot shows both fights at once.
    const boss = createEnemy(game, 'boss', CONFIG.WIDTH / 2, 190);
    boss.spawnT = 0;
    game.enemies.push(boss);
    game.boss = boss;
    for (const [x, y] of [[220, 180], [1060, 200]]) {
      const d = createEnemy(game, 'drifter', x, y);
      d.spawnT = 0;
      game.enemies.push(d);
    }
    const kindler = createEnemy(game, 'kindler', 640, 560);
    kindler.spawnT = 0;
    game.enemies.push(kindler);
    const spitter = createEnemy(game, 'spitter', 180, 540);
    spitter.spawnT = 0;
    game.enemies.push(spitter);
    game.audio.bossAlarm();
    // No night banner here: the boss and the HUD already say night 5.
    game.ui.hideNightBanner();
    game.shotSim = true;
    simulateFight(game, 200);
    game.shotSim = false;
    // Clean the stage: the sim bloodied the Heart and dragged the Tyrant
    // down onto it — put both back where the photo wants them.
    game.texts = [];
    game.heart.hp = 110;
    game.heart.fuel = 62;
    game.carried = 5;
    boss.x = CONFIG.WIDTH / 2;
    boss.y = 190;
    game.ui.updateHUD(game);
    return;
  }

  if (shot === 'victory') {
    // Dawn breaks: night 10 cleared, the victory screen with its stats and
    // restart, the Heart still burning behind it.
    game.__startRun();
    game.enemies = [];
    game.spawnQueue = [];
    game.waveActive = false;
    game.wave = 10;
    game.nightName = 'The Last Night';
    game.score = 9840;
    game.kills = 187;
    game.embers = 96;
    game.carried = 0;
    game.fed = 96;
    game.bestCombo = 14;
    game.heart.hp = 62;
    game.heart.fuel = 48;
    // The Tyrant's last explosion, still blooming, for a lived-in backdrop.
    spawnExplosion(game, CONFIG.WIDTH / 2 + 180, 200, '#ff6b00', true);
    for (const [x, y] of [[300, 220], [900, 160], [640, 520]]) {
      const d = createEnemy(game, 'drifter', x, y);
      d.spawnT = 0;
      game.enemies.push(d);
    }
    game.state = 'victory';
    // No night banner behind the victory screen.
    game.ui.hideNightBanner();
    game.ui.showVictory(game);
    return;
  }

  // Unknown ?shot=: fall back to the title screen.
  game.ui.showTitle(game.best);
}
